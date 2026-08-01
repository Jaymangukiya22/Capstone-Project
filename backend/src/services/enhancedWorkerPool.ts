import cluster, { Worker } from 'cluster';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { logInfo, logError } from '../utils/logger';
import {
  recordAnswer,
  recordMatchCompleted,
  reconnectionsTotal,
  questionsAdvancedTotal,
  workerEventLoopLag,
} from '../matchMetrics';

const MAX_MATCHES_PER_WORKER = parseInt(process.env.MAX_MATCHES_PER_WORKER || '5', 10);
const MIN_WORKERS = parseInt(process.env.MIN_WORKERS || '10', 10);
const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '500', 10);
const SCALE_UP_THRESHOLD = parseFloat(process.env.SCALE_UP_THRESHOLD || '0.5'); // LOWERED from 0.8 to spawn workers earlier
const SCALE_DOWN_THRESHOLD = parseFloat(process.env.SCALE_DOWN_THRESHOLD || '0.3');
const SCALE_CHECK_INTERVAL = parseInt(process.env.SCALE_CHECK_INTERVAL || '5000', 10); // REDUCED from 30s to 5s for faster response
const PROACTIVE_SPAWN_THRESHOLD = parseFloat(process.env.PROACTIVE_SPAWN_THRESHOLD || '0.6'); // Spawn workers at 60% capacity

interface WorkerInfo {
  worker: Worker;
  matchCount: number;
  pendingMatches: number;
  capacity: number;
  activeMatches: Set<string>;
  lastHeartbeat: number;
  status: 'initializing' | 'active' | 'idle' | 'dead';
}

export class EnhancedWorkerPool {
  private workers: Map<number, WorkerInfo> = new Map();
  private matchToWorker: Map<string, number> = new Map();
  private matchLastActivity: Map<string, number> = new Map();
  private userToMatch: Map<number, string> = new Map();
  // Reverse index of matchToUsers so teardownMatch can clear every
  // userToMatch entry for a match without a linear scan of userToMatch.
  private matchToUsers: Map<string, Set<number>> = new Map();
  private io: SocketIOServer;
  private redis: Redis;
  private scaleCheckInterval: NodeJS.Timeout | null = null;
  private matchesCreatedTotal: number = 0;
  private trackedMatches: Set<string> = new Set(); // Track unique matches to prevent double-counting
  // Worker ids we asked to stop (scale-down / pool shutdown). Lets the cluster
  // 'exit' handler tell a routine stop from a genuine crash ([M12]) so a normal
  // autoscale event isn't logged at error level with a stack trace.
  private intentionalStops: Set<number> = new Set();

  constructor(io: SocketIOServer, redis: Redis) {
    this.io = io;
    this.redis = redis;

    this.setupClusterHandlers();
    this.initializeWorkers();
    this.startAutoScaling();
    this.startHealthChecks();
  }

  private setupClusterHandlers() {
    cluster.on('message', (worker, message) => {
      this.handleWorkerMessage(worker, message);
    });

    cluster.on('exit', (worker, code, signal) => {
      // A clean exit (code 0) or one we initiated (scale-down / shutdown) is a
      // routine lifecycle event, not an error - log it at info. Only an
      // unexpected death (non-zero code / crash signal we didn't ask for) is a
      // real error worth surfacing in error.log ([M12]).
      const intentional = this.intentionalStops.delete(worker.id);
      if (code === 0 || intentional) {
        logInfo('Worker exited', { workerId: worker.id, code, signal: signal || null, intentional });
      } else {
        logError('Worker died unexpectedly', new Error(`Worker ${worker.id} died (${signal || code})`));
      }
      this.handleWorkerDeath(worker).catch((error) =>
        logError('Failed to clean up after worker death', error as Error)
      );
    });

    cluster.on('online', (worker) => {
      logInfo('Worker online', { workerId: worker.id, pid: worker.process.pid });
    });
  }

  private initializeWorkers() {
    logInfo('Initializing worker pool', { minWorkers: MIN_WORKERS });
    for (let i = 0; i < MIN_WORKERS; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker(): Worker {
    if (this.workers.size >= MAX_WORKERS) {
      throw new Error(`Max workers reached: ${MAX_WORKERS}`);
    }

    const worker = cluster.fork({
      WORKER_TYPE: 'match_worker',
      MAX_MATCHES: MAX_MATCHES_PER_WORKER.toString()
    });

    const workerInfo: WorkerInfo = {
      worker,
      matchCount: 0,
      pendingMatches: 0,
      capacity: MAX_MATCHES_PER_WORKER,
      activeMatches: new Set(),
      lastHeartbeat: Date.now(),
      status: 'initializing'
    };

    this.workers.set(worker.id, workerInfo);

    logInfo('Spawned worker', {
      workerId: worker.id,
      pid: worker.process.pid,
      totalWorkers: this.workers.size
    });

    return worker;
  }

  private handleWorkerMessage(worker: Worker, message: any) {
    const workerInfo = this.workers.get(worker.id);
    if (!workerInfo) return;

    workerInfo.lastHeartbeat = Date.now();

    switch (message.type) {
      case 'match_created':
        this.handleMatchCreated(worker.id, message.matchId, message.userId);
        break;

      case 'match_completed':
        this.handleMatchCompleted(worker.id, message.matchId);
        break;

      case 'player_joined':
        this.handlePlayerJoined(message.matchId, message.userId);
        break;

      case 'player_left':
        this.handlePlayerLeft(message.matchId, message.userId);
        break;

      case 'heartbeat':
        // lastHeartbeat already updated above. Heartbeats also carry the
        // worker's sampled event-loop lag for the per-worker gauge.
        if (typeof message.eventLoopLagSeconds === 'number') {
          workerEventLoopLag.set({ worker_id: String(worker.id) }, message.eventLoopLagSeconds);
        }
        break;

      // ---- Metrics reported by workers (see matchMetrics.ts) ----
      case 'metric_answer':
        recordAnswer(message.result, message.timeSpentSeconds);
        break;

      case 'metric_question_advanced':
        questionsAdvancedTotal.inc({ reason: message.reason || 'all_answered' });
        break;

      case 'metric_match_completed':
        recordMatchCompleted(message.durationSeconds);
        break;

      case 'metric_reconnect':
        reconnectionsTotal.inc();
        break;

      case 'worker_ready':
        workerInfo.status = 'idle';
        logInfo('Worker ready', {
          workerId: worker.id,
          capacity: workerInfo.capacity
        });
        break;

      case 'emit_to_match':
        // Worker wants to emit to all players in a match
        logInfo('Worker pool forwarding emit_to_match', { 
          matchId: message.matchId, 
          event: message.event,
          workerId: worker.id 
        });
        if (message.matchId) {
          this.updateMatchActivity(message.matchId);
        }
        this.io.to(message.matchId).emit(message.event, message.data);
        break;

      case 'emit_to_socket':
        // Worker wants to emit to specific socket
        this.io.to(message.socketId).emit(message.event, message.data);
        break;

      default:
        logInfo('Unknown worker message', { type: message.type, workerId: worker.id });
    }
  }

  private handleMatchCreated(workerId: number, matchId: string, userId: number) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    workerInfo.matchCount++;
    // Decrement pending counter since match is now confirmed created
    workerInfo.pendingMatches = Math.max(0, workerInfo.pendingMatches - 1);
    workerInfo.activeMatches.add(matchId);
    this.matchToWorker.set(matchId, workerId);
    this.matchLastActivity.set(matchId, Date.now());
    this.trackUserInMatch(matchId, userId);

    // CRITICAL FIX: Only increment counter once per unique match
    if (!this.trackedMatches.has(matchId)) {
      this.trackedMatches.add(matchId);
      this.matchesCreatedTotal++;
    }

    if (workerInfo.matchCount === 1) {
      workerInfo.status = 'active';
    }

    logInfo('Match created on worker', {
      matchId,
      workerId,
      workerMatchCount: workerInfo.matchCount,
      pendingMatches: workerInfo.pendingMatches,
      totalMatches: this.matchToWorker.size
    });
  }

  private handleMatchCompleted(workerId: number, matchId: string) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    workerInfo.matchCount = Math.max(0, workerInfo.matchCount - 1);
    workerInfo.activeMatches.delete(matchId);
    this.teardownMatch(matchId);

    if (workerInfo.matchCount === 0) {
      workerInfo.status = 'idle';
    }

    logInfo('Match completed on worker', {
      matchId,
      workerId,
      workerMatchCount: workerInfo.matchCount,
      totalMatches: this.matchToWorker.size
    });
  }

  private handlePlayerJoined(matchId: string, userId: number) {
    this.trackUserInMatch(matchId, userId);
  }

  private handlePlayerLeft(matchId: string, userId: number) {
    this.userToMatch.delete(userId);
    this.matchToUsers.get(matchId)?.delete(userId);
  }

  private trackUserInMatch(matchId: string, userId: number) {
    this.userToMatch.set(userId, matchId);
    let users = this.matchToUsers.get(matchId);
    if (!users) {
      users = new Set();
      this.matchToUsers.set(matchId, users);
    }
    users.add(userId);
  }

  // Single teardown path for every way a match can stop existing (completed,
  // worker death, idle sweep) so matchToWorker/matchLastActivity/
  // trackedMatches/userToMatch/matchToUsers can't drift out of sync with
  // each other depending on which exit path was taken.
  private teardownMatch(matchId: string) {
    this.matchToWorker.delete(matchId);
    this.matchLastActivity.delete(matchId);
    this.trackedMatches.delete(matchId);

    const userIds = this.matchToUsers.get(matchId);
    if (userIds) {
      for (const userId of userIds) {
        if (this.userToMatch.get(userId) === matchId) {
          this.userToMatch.delete(userId);
        }
      }
      this.matchToUsers.delete(matchId);
    }
  }

  private async handleWorkerDeath(worker: Worker) {
    const workerInfo = this.workers.get(worker.id);
    if (!workerInfo) return;

    // Reassign all matches from dead worker
    for (const matchId of workerInfo.activeMatches) {
      this.teardownMatch(matchId);

      // Notify players that match ended due to server error
      this.io.to(matchId).emit('match_error', {
        message: 'Match server restarted. Please rejoin.'
      });

      // The Redis match blob caches which worker owns it (see
      // matchServerWorker.ts saveMatchState). If we don't clear that here,
      // a client's rejoin reads the stale workerId and the master routes it
      // straight back to the worker that just died instead of calling
      // assignMatch() again - leaving the rejoining client stuck.
      try {
        const key = `match:${matchId}`;
        const matchData = await this.redis.get(key);
        if (matchData) {
          const parsed = JSON.parse(matchData);
          delete parsed.workerId;
          const ttl = await this.redis.ttl(key);
          await this.redis.setex(key, ttl > 0 ? ttl : 3600, JSON.stringify(parsed));
        }
      } catch (error) {
        logError('Failed to clear stale workerId after worker death', error as Error);
      }

      logInfo('Reassigning match after worker death', { matchId, workerId: worker.id });
    }

    this.workers.delete(worker.id);

    // Spawn replacement if below minimum
    if (this.workers.size < MIN_WORKERS) {
      this.spawnWorker();
    }
  }

  // ===== PUBLIC METHODS =====

  // NOTE (cross-replica): this pool only ever knows about workers forked by THIS
  // replica, so assignMatch/sendToWorker are inherently LOCAL. In multi-replica
  // AUTO matchmaking the replica whose sweep pops a pair is the match owner and
  // assigns one of its own workers here; peer replicas forward inbound events to
  // the owner over the socket.io Redis adapter (see matchServerMaster.ts
  // routeMatchEvent / mm_match_event) rather than calling into this pool.
  public async assignMatch(matchId: string): Promise<number | null> {
    // Check if already assigned (reconnection)
    const existingWorker = this.matchToWorker.get(matchId);
    if (existingWorker && this.workers.has(existingWorker)) {
      return existingWorker;
    }

    // Find least loaded worker (including pending matches)
    let selectedWorker: WorkerInfo | null = null;
    let minLoad = Infinity;

    for (const workerInfo of this.workers.values()) {
      if (workerInfo.status === 'dead' || workerInfo.status === 'initializing') continue;

      // Calculate load including both actual and pending matches
      const totalLoad = workerInfo.matchCount + workerInfo.pendingMatches;
      const load = totalLoad / workerInfo.capacity;
      
      if (load < minLoad) {
        selectedWorker = workerInfo;
        minLoad = load;
      }

      // If found empty worker, use immediately
      if (minLoad === 0) break;
    }

    // If no workers available at all
    if (!selectedWorker) {
      logError('No workers available', new Error(`Cannot assign match ${matchId} - no workers`));
      return null;
    }

    // Every worker is at or over its declared capacity and there's no room
    // to spawn more (MAX_WORKERS reached). Without this, load-balancing
    // would keep stacking matches onto whichever worker is "least" overloaded
    // instead of refusing - overloading a single worker's event loop, which
    // makes every match it holds feel stuck. Callers already treat a null
    // return as "no workers" and surface NO_AVAILABLE_WORKERS to the client,
    // so this fails loud instead of silently degrading.
    if (minLoad >= 1 && this.workers.size >= MAX_WORKERS) {
      logError('Worker pool at capacity', new Error(`Cannot assign match ${matchId} - all ${this.workers.size} workers at/over capacity`));
      return null;
    }

    // PROACTIVE SCALING: Spawn workers BEFORE reaching full capacity
    // This prevents the "avalanche" problem where matches pile up faster than workers spawn
    if (minLoad >= PROACTIVE_SPAWN_THRESHOLD && this.workers.size < MAX_WORKERS) {
      // Calculate how many workers we need based on pending match rate
      const workersNeeded = Math.ceil((this.getTotalMatches() + 10) / MAX_MATCHES_PER_WORKER);
      const workersToSpawn = Math.min(
        workersNeeded - this.workers.size,
        MAX_WORKERS - this.workers.size,
        3 // Spawn maximum 3 workers per assignment to avoid explosion
      );
      
      if (workersToSpawn > 0) {
        for (let i = 0; i < workersToSpawn; i++) {
          const newWorker = this.spawnWorker();
          logInfo('PROACTIVE worker spawn', { 
            matchId, 
            workerId: newWorker.id, 
            reason: 'load_threshold', 
            threshold: `${(minLoad * 100).toFixed(1)}%` 
          });
        }
      }
    }

    const assignedWorkerId = selectedWorker.worker.id;
    
    // CRITICAL FIX: Increment pending counter IMMEDIATELY upon assignment
    selectedWorker.pendingMatches++;
    
    logInfo('Assigned match to worker', { 
      matchId, 
      workerId: assignedWorkerId, 
      load: minLoad,
      pendingMatches: selectedWorker.pendingMatches,
      actualMatches: selectedWorker.matchCount
    });
    
    return assignedWorkerId;
  }

  public sendToWorker(workerId: number, message: any): boolean {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo || workerInfo.status === 'dead') {
      logError('Worker not available', new Error(`Worker ${workerId} not available`));
      return false;
    }

    workerInfo.worker.send(message);
    return true;
  }

  public broadcast(message: any) {
    for (const workerInfo of this.workers.values()) {
      if (workerInfo.status !== 'dead') {
        workerInfo.worker.send(message);
      }
    }
  }

  public async getUserMatch(userId: number): Promise<string | null> {
    return this.userToMatch.get(userId) || null;
  }

  // ===== AUTO-SCALING =====

  private startAutoScaling() {
    this.scaleCheckInterval = setInterval(() => {
      this.checkAndScale();
    }, SCALE_CHECK_INTERVAL);
  }

  private updateMatchActivity(matchId: string) {
    this.matchLastActivity.set(matchId, Date.now());
  }

  private cleanupStaleMatches() {
    const idleTimeoutMs = parseInt(process.env.MATCH_IDLE_TIMEOUT_MS || '300000', 10); // 5 minutes
    const now = Date.now();

    for (const [matchId, lastActivity] of this.matchLastActivity.entries()) {
      if (now - lastActivity > idleTimeoutMs) {
        const workerId = this.matchToWorker.get(matchId);
        const workerInfo = workerId !== undefined ? this.workers.get(workerId) : undefined;

        if (workerInfo) {
          if (workerInfo.activeMatches.has(matchId)) {
            workerInfo.activeMatches.delete(matchId);
          }

          if (workerInfo.matchCount > 0) {
            workerInfo.matchCount = Math.max(0, workerInfo.matchCount - 1);
            if (workerInfo.matchCount === 0 && workerInfo.status !== 'dead') {
              workerInfo.status = 'idle';
            }
          }

          // Tell the worker to actually tear down its own match state
          // instead of only decrementing this pool's bookkeeping - the
          // worker runs its own independent 5-minute idle reaper on a
          // different clock, and without this message the two can disagree
          // about whether the match still exists.
          workerInfo.worker.send({ type: 'terminate_match', matchId });
        }

        this.teardownMatch(matchId);

        this.io.to(matchId).emit('match_error', {
          message: 'Match timed out due to inactivity.'
        });

        logInfo('Cleaned up idle match from worker pool', {
          matchId,
          workerId
        });
      }
    }
  }

  private checkAndScale() {
    this.cleanupStaleMatches();

    const totalCapacity = this.workers.size * MAX_MATCHES_PER_WORKER;
    const totalMatches = this.matchToWorker.size;
    const utilization = totalMatches / totalCapacity;

    logInfo('Auto-scaling check', {
      totalWorkers: this.workers.size,
      totalMatches,
      totalCapacity,
      utilization: `${(utilization * 100).toFixed(1)}%`
    });

    // AGGRESSIVE SCALE-UP: Spawn workers faster during burst load
    if (utilization >= SCALE_UP_THRESHOLD && this.workers.size < MAX_WORKERS) {
      // Calculate deficit: how many workers do we actually need?
      const workersNeeded = Math.ceil(totalMatches / MAX_MATCHES_PER_WORKER);
      const workersDeficit = workersNeeded - this.workers.size;
      
      // Spawn up to 5 workers at once during high load (was 1 per interval)
      const workersToAdd = Math.min(
        Math.max(workersDeficit, 1),
        5, // Spawn maximum 5 workers per 5-second interval
        MAX_WORKERS - this.workers.size
      );

      logInfo('AGGRESSIVE SCALE-UP', { 
        workersToAdd, 
        currentWorkers: this.workers.size,
        workersNeeded,
        totalMatches
      });
      
      for (let i = 0; i < workersToAdd; i++) {
        this.spawnWorker();
      }
    }

    // Scale down (only truly idle workers, and only if we have excess capacity)
    // NEVER scale down below MIN_WORKERS or if any worker has active matches
    const workersWithMatches = Array.from(this.workers.values()).filter(w => w.matchCount > 0).length;
    const canScaleDown = this.workers.size > MIN_WORKERS;

    if (utilization <= SCALE_DOWN_THRESHOLD && canScaleDown) {
      // Only remove workers beyond MIN_WORKERS, and only if they're truly idle
      const maxWorkersToRemove = Math.max(0, this.workers.size - MIN_WORKERS);
      const idleWorkers = Array.from(this.workers.values())
        .filter(w => w.matchCount === 0 && w.status === 'idle')
        .slice(0, maxWorkersToRemove);

      if (idleWorkers.length > 0) {
        logInfo('Scaling down', {
          idleWorkersToRemove: idleWorkers.length,
          currentWorkers: this.workers.size,
          workersWithMatches
        });

        idleWorkers.forEach(workerInfo => {
          const workerId = workerInfo.worker.id;
          this.intentionalStops.add(workerId); // routine scale-down, not a crash ([M12])
          workerInfo.worker.send({ type: 'shutdown' });

          // Give the worker's own shutdown() a moment to run (clears its
          // reaper interval, etc.) before force-killing it - previously
          // .kill() was called in the same tick as the shutdown message,
          // racing the IPC message rather than waiting for it.
          setTimeout(() => {
            const current = this.workers.get(workerId);
            if (current && !current.worker.isDead()) {
              current.worker.kill();
            }
            this.workers.delete(workerId);
            logInfo('Worker removed', { workerId });
          }, 2000);
        });
      }
    }
  }

  // ===== HEALTH CHECKS =====

  private startHealthChecks() {
    const startTime = Date.now();
    const gracePeriod = 120000; // 2 minutes grace period for worker startup

    setInterval(() => {
      const now = Date.now();
      const timeout = 180000; // 3 minutes

      for (const [workerId, workerInfo] of this.workers.entries()) {
        // Skip health check during grace period (workers still initializing)
        if (now - startTime < gracePeriod) {
          continue;
        }

        if (now - workerInfo.lastHeartbeat > timeout) {
          logError('Worker heartbeat timeout', new Error(`Worker ${workerId} not responding`));
          workerInfo.status = 'dead';
          // Attempt a graceful shutdown message first - a worker that's just
          // slow (GC/event-loop stall) rather than truly dead may still be
          // able to act on it - but don't wait for it: the whole point of
          // this reaper is that the worker has already stopped heartbeating,
          // so it may never process the message.
          try {
            workerInfo.worker.send({ type: 'shutdown' });
          } catch {
            // Worker's IPC channel may already be gone; fall through to kill.
          }
          workerInfo.worker.kill();
        }
      }
    }, 60000); // Check every 60 seconds
  }

  // ===== STATS =====

  public getStats() {
    return {
      totalWorkers: this.workers.size,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.status === 'active').length,
      idleWorkers: Array.from(this.workers.values()).filter(w => w.status === 'idle').length,
      totalMatches: this.matchToWorker.size,
      totalPlayers: this.userToMatch.size,
      matchesCreated: this.matchesCreatedTotal
    };
  }

  public getDetailedStats() {
    return {
      ...this.getStats(),
      workers: Array.from(this.workers.values()).map(w => ({
        workerId: w.worker.id,
        pid: w.worker.process.pid,
        matchCount: w.matchCount,
        capacity: w.capacity,
        utilization: `${((w.matchCount / w.capacity) * 100).toFixed(1)}%`,
        status: w.status,
        lastHeartbeat: new Date(w.lastHeartbeat).toISOString()
      }))
    };
  }

  public getTotalMatches(): number {
    return this.matchToWorker.size;
  }

  public getTotalPlayers(): number {
    return this.userToMatch.size;
  }

  public getMatchesCreated(): number {
    return this.matchesCreatedTotal;
  }

  // ===== SHUTDOWN =====

  public async shutdown(): Promise<void> {
    logInfo('Shutting down worker pool', { totalWorkers: this.workers.size });

    if (this.scaleCheckInterval) {
      clearInterval(this.scaleCheckInterval);
    }

    // Notify all workers to shutdown
    for (const workerInfo of this.workers.values()) {
      this.intentionalStops.add(workerInfo.worker.id); // pool shutdown, not a crash ([M12])
    }
    this.broadcast({ type: 'shutdown' });

    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Force kill remaining workers
    for (const workerInfo of this.workers.values()) {
      if (!workerInfo.worker.isDead()) {
        workerInfo.worker.kill();
      }
    }

    this.workers.clear();
    this.matchToWorker.clear();
    this.matchLastActivity.clear();
    this.trackedMatches.clear();
    this.userToMatch.clear();
    this.matchToUsers.clear();

    logInfo('Worker pool shutdown complete');
  }
}
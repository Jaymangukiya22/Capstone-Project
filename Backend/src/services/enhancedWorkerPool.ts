import cluster, { Worker } from 'cluster';
import { Server as SocketIOServer } from 'socket.io';
import Redis from 'ioredis';
import { logInfo, logError } from '../utils/logger';

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
  private io: SocketIOServer;
  private redis: Redis;
  private scaleCheckInterval: NodeJS.Timeout | null = null;
  private matchesCreatedTotal: number = 0;
  private trackedMatches: Set<string> = new Set(); // Track unique matches to prevent double-counting

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
      logError('Worker died', new Error(`Worker ${worker.id} died (${signal || code})`));
      this.handleWorkerDeath(worker);
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
        // Already updated lastHeartbeat above
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
    this.userToMatch.set(userId, matchId);
    
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
    this.matchToWorker.delete(matchId);
    this.matchLastActivity.delete(matchId);
    // Remove from tracked matches when completed
    this.trackedMatches.delete(matchId);

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
    this.userToMatch.set(userId, matchId);
  }

  private handlePlayerLeft(matchId: string, userId: number) {
    this.userToMatch.delete(userId);
  }

  private handleWorkerDeath(worker: Worker) {
    const workerInfo = this.workers.get(worker.id);
    if (!workerInfo) return;

    // Reassign all matches from dead worker
    workerInfo.activeMatches.forEach(matchId => {
      this.matchToWorker.delete(matchId);
      this.matchLastActivity.delete(matchId);
      
      // Notify players that match ended due to server error
      this.io.to(matchId).emit('match_error', {
        message: 'Match server restarted. Please rejoin.'
      });

      logInfo('Reassigning match after worker death', { matchId, workerId: worker.id });
    });

    this.workers.delete(worker.id);

    // Spawn replacement if below minimum
    if (this.workers.size < MIN_WORKERS) {
      this.spawnWorker();
    }
  }

  // ===== PUBLIC METHODS =====

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
        }

        this.matchToWorker.delete(matchId);
        this.matchLastActivity.delete(matchId);

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
          workerInfo.worker.send({ type: 'shutdown' });
          workerInfo.worker.kill();
          this.workers.delete(workerInfo.worker.id);
          logInfo('Worker removed', { workerId: workerInfo.worker.id });
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
    this.userToMatch.clear();

    logInfo('Worker pool shutdown complete');
  }
}
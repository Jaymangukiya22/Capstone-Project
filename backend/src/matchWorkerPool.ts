// import cluster, { Worker } from 'cluster';
// import { logInfo, logError } from './utils/logger';
// import os from 'os';

// // Configuration - Environment-based for scaling
// // 4 matches per worker = 8 players per worker (2 players per match)
// const MAX_MATCHES_PER_WORKER = parseInt(process.env.MAX_MATCHES_PER_WORKER || '4', 10);
// const WORKER_IDLE_TIMEOUT = parseInt(process.env.WORKER_IDLE_TIMEOUT || (5 * 60 * 1000).toString(), 10);
// const MIN_WORKERS = parseInt(process.env.MIN_WORKERS || '10', 10);
// const MAX_WORKERS = parseInt(process.env.MAX_WORKERS || '50', 10);

// interface WorkerInfo {
//   worker: Worker;
//   matchCount: number;
//   activeMatches: Set<string>;
//   lastActivity: number;
//   status: 'active' | 'idle' | 'suspended';
// }

// interface MatchAssignment {
//   matchId: string;
//   workerId: number;
// }

// export class MatchWorkerPool {
//   private workers: Map<number, WorkerInfo> = new Map();
//   private matchToWorker: Map<string, number> = new Map();
//   private idleCheckInterval: NodeJS.Timeout | null = null;
//   private isShuttingDown = false;

//   constructor() {
//     if (!cluster.isPrimary) {
//       throw new Error('MatchWorkerPool can only be instantiated in primary process');
//     }

//     this.setupClusterEventHandlers();
//     this.initializeWorkers();
//     this.startIdleWorkerCheck();
//   }

//   private setupClusterEventHandlers(): void {
//     cluster.on('message', (worker, message) => {
//       this.handleWorkerMessage(worker, message);
//     });

//     cluster.on('exit', (worker, code, signal) => {
//       logError('Worker died', new Error(`Worker ${worker.process.pid} died (${signal || code})`));
      
//       if (!this.isShuttingDown) {
//         // Remove dead worker
//         const workerInfo = this.workers.get(worker.id);
//         if (workerInfo) {
//           // Reassign matches from dead worker
//           workerInfo.activeMatches.forEach(matchId => {
//             this.matchToWorker.delete(matchId);
//             logInfo('Reassigning match after worker death', { matchId, workerId: worker.id });
//           });
//         }
//         this.workers.delete(worker.id);
        
//         // Spawn replacement if needed
//         if (this.workers.size < MIN_WORKERS) {
//           this.spawnWorker();
//         }
//       }
//     });

//     cluster.on('online', (worker) => {
//       logInfo('Worker is online', { workerId: worker.id, pid: worker.process.pid });
//     });
//   }

//   private initializeWorkers(): void {
//     logInfo('Initializing worker pool', { minWorkers: MIN_WORKERS });
    
//     for (let i = 0; i < MIN_WORKERS; i++) {
//       this.spawnWorker();
//     }
//   }

//   private spawnWorker(): Worker {
//     if (this.workers.size >= MAX_WORKERS) {
//       logError('Cannot spawn worker - max workers reached', new Error(`Max workers: ${MAX_WORKERS}`));
//       throw new Error('Maximum number of workers reached');
//     }

//     const worker = cluster.fork({
//       WORKER_TYPE: 'match_server',
//       MAX_MATCHES: MAX_MATCHES_PER_WORKER.toString()
//     });

//     const workerInfo: WorkerInfo = {
//       worker,
//       matchCount: 0,
//       activeMatches: new Set(),
//       lastActivity: Date.now(),
//       status: 'active'
//     };

//     this.workers.set(worker.id, workerInfo);

//     logInfo('Spawned new worker', {
//       workerId: worker.id,
//       pid: worker.process.pid,
//       totalWorkers: this.workers.size
//     });

//     return worker;
//   }

//   private handleWorkerMessage(worker: Worker, message: any): void {
//     const workerInfo = this.workers.get(worker.id);
//     if (!workerInfo) return;

//     switch (message.type) {
//       case 'match_created':
//         this.handleMatchCreated(worker.id, message.matchId);
//         break;

//       case 'match_completed':
//         this.handleMatchCompleted(worker.id, message.matchId);
//         break;

//       case 'match_count_update':
//         this.updateWorkerMatchCount(worker.id, message.count);
//         break;

//       case 'worker_ready':
//         workerInfo.status = 'active';
//         logInfo('Worker is ready', { workerId: worker.id });
//         break;

//       case 'health_check':
//         workerInfo.lastActivity = Date.now();
//         break;

//       default:
//         logInfo('Unknown worker message', { type: message.type, workerId: worker.id });
//     }
//   }

//   private handleMatchCreated(workerId: number, matchId: string): void {
//     const workerInfo = this.workers.get(workerId);
//     if (!workerInfo) return;

//     workerInfo.matchCount++;
//     workerInfo.activeMatches.add(matchId);
//     workerInfo.lastActivity = Date.now();
//     this.matchToWorker.set(matchId, workerId);

//     logInfo('Match assigned to worker', {
//       matchId,
//       workerId,
//       workerMatchCount: workerInfo.matchCount,
//       totalMatches: this.matchToWorker.size
//     });
//   }

//   private handleMatchCompleted(workerId: number, matchId: string): void {
//     const workerInfo = this.workers.get(workerId);
//     if (!workerInfo) return;

//     workerInfo.matchCount = Math.max(0, workerInfo.matchCount - 1);
//     workerInfo.activeMatches.delete(matchId);
//     workerInfo.lastActivity = Date.now();
//     this.matchToWorker.delete(matchId);

//     logInfo('Match completed on worker', {
//       matchId,
//       workerId,
//       workerMatchCount: workerInfo.matchCount,
//       totalMatches: this.matchToWorker.size
//     });

//     // Update worker status
//     if (workerInfo.matchCount === 0) {
//       workerInfo.status = 'idle';
//     }
//   }

//   private updateWorkerMatchCount(workerId: number, count: number): void {
//     const workerInfo = this.workers.get(workerId);
//     if (!workerInfo) return;

//     workerInfo.matchCount = count;
//     workerInfo.lastActivity = Date.now();
//     workerInfo.status = count === 0 ? 'idle' : 'active';
//   }

//   /**
//    * Assign a match to an available worker
//    * Returns the worker ID that should handle the match
//    */
//   public assignMatch(matchId: string): number {
//     // Check if match already assigned (reconnection case)
//     const existingWorker = this.matchToWorker.get(matchId);
//     if (existingWorker && this.workers.has(existingWorker)) {
//       return existingWorker;
//     }

//     // Find worker with least matches
//     let selectedWorker: WorkerInfo | null = null;
//     let minMatches = MAX_MATCHES_PER_WORKER;

//     for (const workerInfo of this.workers.values()) {
//       if (workerInfo.status === 'suspended') continue;
      
//       if (workerInfo.matchCount < minMatches) {
//         selectedWorker = workerInfo;
//         minMatches = workerInfo.matchCount;
//       }

//       // If found a worker with no matches, use it immediately
//       if (minMatches === 0) break;
//     }

//     // If all workers are at capacity, spawn a new one
//     if (!selectedWorker || minMatches >= MAX_MATCHES_PER_WORKER) {
//       if (this.workers.size < MAX_WORKERS) {
//         const newWorker = this.spawnWorker();
//         selectedWorker = this.workers.get(newWorker.id)!;
//         logInfo('Spawned new worker for match', { matchId, workerId: newWorker.id });
//       } else {
//         // Use least loaded worker even if at capacity
//         if (selectedWorker) {
//           logInfo('All workers at capacity, using least loaded', {
//             matchId,
//             workerId: selectedWorker.worker.id,
//             matchCount: selectedWorker.matchCount
//           });
//         } else {
//           throw new Error('No available workers');
//         }
//       }
//     }

//     return selectedWorker.worker.id;
//   }

//   /**
//    * Forward a message to the worker handling a specific match
//    */
//   public sendToMatchWorker(matchId: string, message: any): boolean {
//     const workerId = this.matchToWorker.get(matchId);
//     if (!workerId) {
//       logError('No worker found for match', new Error(`Match ${matchId} not assigned`));
//       return false;
//     }

//     const workerInfo = this.workers.get(workerId);
//     if (!workerInfo) {
//       logError('Worker not found', new Error(`Worker ${workerId} not found`));
//       return false;
//     }

//     workerInfo.worker.send(message);
//     return true;
//   }

//   /**
//    * Broadcast a message to all active workers
//    */
//   public broadcast(message: any): void {
//     for (const workerInfo of this.workers.values()) {
//       if (workerInfo.status !== 'suspended') {
//         workerInfo.worker.send(message);
//       }
//     }
//   }

//   /**
//    * Check for idle workers and suspend them
//    */
//   private startIdleWorkerCheck(): void {
//     this.idleCheckInterval = setInterval(() => {
//       const now = Date.now();
//       const workersToSuspend: number[] = [];

//       for (const [workerId, workerInfo] of this.workers.entries()) {
//         // Keep minimum number of workers active
//         if (this.workers.size <= MIN_WORKERS) break;

//         // Check if worker is idle and has been idle for timeout period
//         if (
//           workerInfo.matchCount === 0 &&
//           workerInfo.status === 'idle' &&
//           now - workerInfo.lastActivity > WORKER_IDLE_TIMEOUT
//         ) {
//           workersToSuspend.push(workerId);
//         }
//       }

//       // Suspend idle workers
//       for (const workerId of workersToSuspend) {
//         this.suspendWorker(workerId);
//       }
//     }, 60000); // Check every minute
//   }

//   private suspendWorker(workerId: number): void {
//     const workerInfo = this.workers.get(workerId);
//     if (!workerInfo || workerInfo.matchCount > 0) return;

//     logInfo('Suspending idle worker', {
//       workerId,
//       idleTime: Date.now() - workerInfo.lastActivity
//     });

//     workerInfo.status = 'suspended';
//     workerInfo.worker.kill();
//     this.workers.delete(workerId);
//   }

//   /**
//    * Get pool statistics
//    */
//   public getStats() {
//     const stats = {
//       totalWorkers: this.workers.size,
//       activeWorkers: 0,
//       idleWorkers: 0,
//       suspendedWorkers: 0,
//       totalMatches: this.matchToWorker.size,
//       workerDetails: [] as any[]
//     };

//     for (const [workerId, workerInfo] of this.workers.entries()) {
//       if (workerInfo.status === 'active') stats.activeWorkers++;
//       if (workerInfo.status === 'idle') stats.idleWorkers++;
//       if (workerInfo.status === 'suspended') stats.suspendedWorkers++;

//       stats.workerDetails.push({
//         workerId,
//         pid: workerInfo.worker.process.pid,
//         matchCount: workerInfo.matchCount,
//         status: workerInfo.status,
//         lastActivity: new Date(workerInfo.lastActivity).toISOString()
//       });
//     }

//     return stats;
//   }

//   /**
//    * Graceful shutdown
//    */
//   public async shutdown(): Promise<void> {
//     this.isShuttingDown = true;

//     if (this.idleCheckInterval) {
//       clearInterval(this.idleCheckInterval);
//     }

//     logInfo('Shutting down worker pool', { totalWorkers: this.workers.size });

//     // Notify all workers to gracefully shutdown
//     this.broadcast({ type: 'shutdown' });

//     // Wait for workers to finish
//     await new Promise(resolve => setTimeout(resolve, 5000));

//     // Force kill any remaining workers
//     for (const workerInfo of this.workers.values()) {
//       workerInfo.worker.kill();
//     }

//     this.workers.clear();
//     this.matchToWorker.clear();

//     logInfo('Worker pool shutdown complete');
//   }
// }

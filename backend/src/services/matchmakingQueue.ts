/**
 * AUTO matchmaking queue (Workstream A).
 *
 * The match-server master used to hold the AUTO matchmaking queue in a plain
 * in-process `Map` with a per-player `setInterval`/`setTimeout` pair. That works
 * for a single replica but (a) races two concurrent match attempts onto the same
 * opponent and (b) can't share a queue across replicas behind Nginx.
 *
 * This module abstracts the queue behind an interface with two implementations:
 *
 *  - `RedisMatchmakingQueue` (default, `MATCHMAKING_BACKEND=redis`): the queue
 *    lives in Redis so every replica sees the same waiting players. Per-category
 *    sorted sets index waiters by ELO (for banded lookup) and by wait time (for
 *    ordering/position). The "pop a pair" path is made atomic across replicas by
 *    a per-category distributed lock (same SET NX PX + Lua compare-del pattern as
 *    services/matchService.ts) wrapped around a check-both-then-ZREM Lua script.
 *    That lock+ZREM is the fix for the double-grab race.
 *
 *  - `InMemoryMatchmakingQueue` (`MATCHMAKING_BACKEND=memory`): a Map-backed
 *    single-node fallback, also used by unit tests. Same matching semantics.
 *
 * Matching semantics (both impls):
 *  - compatible  = different users, same category, and if BOTH picked a specific
 *                  quiz they must be the same quiz.
 *  - elo-eligible = |Δelo| <= max(a.currentRange, b.currentRange).
 *  - currentRange widens with wait time:
 *        min(MAX, START + STEP * floor(waitMs / WIDEN_INTERVAL_MS)).
 *  - "best" partner = the compatible, elo-eligible candidate with the SMALLEST
 *    |Δelo| (closest skill), not merely the first found.
 */

import type IORedis from 'ioredis';
import { randomUUID } from 'crypto';

type Redis = IORedis;

// ===== Public types =====

export type MatchPreference = {
  categoryId: number;
  quizId?: number;
};

export type QueueEntry = {
  socketId: string;
  userId: number;
  username: string;
  eloRating: number;
  preference: MatchPreference;
  startedAtMs: number;
  currentRange: number;
  // Which match-server replica the player's socket is connected to. The replica
  // whose sweep pops the pair becomes the match owner (see matchServerMaster.ts).
  serverId: string;
};

export type MatchPair = {
  a: QueueEntry;
  b: QueueEntry;
};

export type QueueSnapshot = {
  depthByCategory: Map<number, number>;
  oldestWaitMsByCategory: Map<number, number>;
  size: number;
};

export interface SweepConfig {
  startRange: number;
  rangeStep: number;
  maxRange: number;
  widenIntervalMs: number;
  timeoutMs: number;
}

export interface SweepResult {
  pairs: MatchPair[];
  timedOut: QueueEntry[];
  stillSearching: QueueEntry[];
}

export interface MatchmakingQueue {
  enqueue(entry: QueueEntry): Promise<void> | void;
  remove(userId: number): Promise<QueueEntry | undefined> | QueueEntry | undefined;
  has(userId: number): Promise<boolean> | boolean;
  get(userId: number): Promise<QueueEntry | undefined> | QueueEntry | undefined;
  findBestMatchFor(entry: QueueEntry): Promise<QueueEntry | undefined>;
  claimPair(aUserId: number, bUserId: number): Promise<MatchPair | undefined>;
  sweep(nowMs: number, cfg: SweepConfig): Promise<SweepResult>;
  countByCategory(categoryId: number): Promise<number> | number;
  queuePosition(userId: number): Promise<number> | number;
  snapshot(): Promise<QueueSnapshot> | QueueSnapshot;
  size(): Promise<number> | number;
}

// ===== Tunables (single source of truth; imported by the master) =====

export const AUTO_MATCH_TIMEOUT_MS = parseInt(
  process.env.AUTO_MATCH_TIMEOUT_MS || String(5 * 60 * 1000),
  10,
);
export const AUTO_MATCH_START_RANGE = parseInt(process.env.AUTO_MATCH_START_RANGE || '50', 10);
export const AUTO_MATCH_RANGE_STEP = parseInt(process.env.AUTO_MATCH_RANGE_STEP || '50', 10);
export const AUTO_MATCH_MAX_RANGE = parseInt(process.env.AUTO_MATCH_MAX_RANGE || '300', 10);
export const AUTO_MATCH_WIDEN_INTERVAL_MS = parseInt(
  process.env.AUTO_MATCH_WIDEN_INTERVAL_MS || String(15 * 1000),
  10,
);

export const DEFAULT_SWEEP_CONFIG: SweepConfig = {
  startRange: AUTO_MATCH_START_RANGE,
  rangeStep: AUTO_MATCH_RANGE_STEP,
  maxRange: AUTO_MATCH_MAX_RANGE,
  widenIntervalMs: AUTO_MATCH_WIDEN_INTERVAL_MS,
  timeoutMs: AUTO_MATCH_TIMEOUT_MS,
};

/** Range a player should currently accept given how long they've waited. */
export function widenedRange(startedAtMs: number, nowMs: number, cfg: SweepConfig): number {
  const waited = Math.max(0, nowMs - startedAtMs);
  const steps = Math.floor(waited / cfg.widenIntervalMs);
  return Math.min(cfg.maxRange, cfg.startRange + cfg.rangeStep * steps);
}

// ===== Shared matching predicates =====

export function isCompatible(a: QueueEntry, b: QueueEntry): boolean {
  if (a.userId === b.userId) return false;
  if (a.preference.categoryId !== b.preference.categoryId) return false;
  const aQuizId = a.preference.quizId;
  const bQuizId = b.preference.quizId;
  if (aQuizId && bQuizId) return aQuizId === bQuizId;
  return true;
}

export function canMatchByElo(a: QueueEntry, b: QueueEntry): boolean {
  const diff = Math.abs(a.eloRating - b.eloRating);
  const allowed = Math.max(a.currentRange, b.currentRange);
  return diff <= allowed;
}

/** Pick the compatible, elo-eligible candidate with the smallest |Δelo|. */
function pickClosest(entry: QueueEntry, candidates: Iterable<QueueEntry>): QueueEntry | undefined {
  let best: QueueEntry | undefined;
  let bestDelta = Infinity;
  for (const other of candidates) {
    if (!isCompatible(entry, other) || !canMatchByElo(entry, other)) continue;
    const delta = Math.abs(entry.eloRating - other.eloRating);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = other;
    }
  }
  return best;
}

// ===== In-memory implementation =====

export class InMemoryMatchmakingQueue implements MatchmakingQueue {
  private byUserId: Map<number, QueueEntry> = new Map();

  enqueue(entry: QueueEntry): void {
    this.byUserId.set(entry.userId, entry);
  }

  remove(userId: number): QueueEntry | undefined {
    const entry = this.byUserId.get(userId);
    if (entry) this.byUserId.delete(userId);
    return entry;
  }

  has(userId: number): boolean {
    return this.byUserId.has(userId);
  }

  get(userId: number): QueueEntry | undefined {
    return this.byUserId.get(userId);
  }

  async findBestMatchFor(entry: QueueEntry): Promise<QueueEntry | undefined> {
    const candidates: QueueEntry[] = [];
    for (const other of this.byUserId.values()) {
      if (other.userId === entry.userId) continue;
      candidates.push(other);
    }
    return pickClosest(entry, candidates);
  }

  async claimPair(aUserId: number, bUserId: number): Promise<MatchPair | undefined> {
    const a = this.byUserId.get(aUserId);
    const b = this.byUserId.get(bUserId);
    if (!a || !b) return undefined;
    this.byUserId.delete(aUserId);
    this.byUserId.delete(bUserId);
    return { a, b };
  }

  async sweep(nowMs: number, cfg: SweepConfig): Promise<SweepResult> {
    const pairs: MatchPair[] = [];
    const timedOut: QueueEntry[] = [];
    const stillSearching: QueueEntry[] = [];

    // Widen every entry's range based on how long it has waited.
    for (const entry of this.byUserId.values()) {
      entry.currentRange = widenedRange(entry.startedAtMs, nowMs, cfg);
    }

    // Time out anyone past the deadline; they are removed and not matched.
    for (const entry of [...this.byUserId.values()]) {
      if (nowMs - entry.startedAtMs >= cfg.timeoutMs) {
        this.byUserId.delete(entry.userId);
        timedOut.push(entry);
      }
    }

    // Bucket the survivors per category.
    const byCategory: Map<number, QueueEntry[]> = new Map();
    for (const entry of this.byUserId.values()) {
      const list = byCategory.get(entry.preference.categoryId);
      if (list) list.push(entry);
      else byCategory.set(entry.preference.categoryId, [entry]);
    }

    // Greedy: longest-waiter first, matched to their closest-ELO partner.
    for (const list of byCategory.values()) {
      list.sort((x, y) => x.startedAtMs - y.startedAtMs);
      const consumed = new Set<number>();
      for (const entry of list) {
        if (consumed.has(entry.userId)) continue;
        const available = list.filter((o) => o.userId !== entry.userId && !consumed.has(o.userId));
        const partner = pickClosest(entry, available);
        if (!partner) continue;
        const claimed = await this.claimPair(entry.userId, partner.userId);
        if (claimed) {
          consumed.add(entry.userId);
          consumed.add(partner.userId);
          pairs.push(claimed);
        }
      }
    }

    // Whatever is left in the map is still searching.
    for (const entry of this.byUserId.values()) stillSearching.push(entry);

    return { pairs, timedOut, stillSearching };
  }

  countByCategory(categoryId: number): number {
    let count = 0;
    for (const entry of this.byUserId.values()) {
      if (entry.preference.categoryId === categoryId) count += 1;
    }
    return count;
  }

  queuePosition(userId: number): number {
    const entry = this.byUserId.get(userId);
    if (!entry) return 0;
    let ahead = 0;
    for (const other of this.byUserId.values()) {
      if (other.userId === userId) continue;
      if (other.preference.categoryId !== entry.preference.categoryId) continue;
      if (other.startedAtMs < entry.startedAtMs) ahead += 1;
    }
    return ahead + 1;
  }

  snapshot(): QueueSnapshot {
    const now = Date.now();
    const depthByCategory = new Map<number, number>();
    const oldestWaitMsByCategory = new Map<number, number>();
    for (const entry of this.byUserId.values()) {
      const cat = entry.preference.categoryId;
      depthByCategory.set(cat, (depthByCategory.get(cat) || 0) + 1);
      const wait = Math.max(0, now - entry.startedAtMs);
      if (wait > (oldestWaitMsByCategory.get(cat) || 0)) {
        oldestWaitMsByCategory.set(cat, wait);
      }
    }
    return { depthByCategory, oldestWaitMsByCategory, size: this.byUserId.size };
  }

  size(): number {
    return this.byUserId.size;
  }
}

// ===== Redis implementation (primary) =====

const CATEGORIES_KEY = 'matchmaking:categories';

export class RedisMatchmakingQueue implements MatchmakingQueue {
  private redis: Redis;
  private instanceId: string = randomUUID();
  private cfg: SweepConfig = DEFAULT_SWEEP_CONFIG;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private queueKey(categoryId: number): string {
    return `matchmaking:queue:${categoryId}`;
  }

  private waitKey(categoryId: number): string {
    return `matchmaking:wait:${categoryId}`;
  }

  private entryKey(userId: number): string {
    return `matchmaking:entry:${userId}`;
  }

  private parseEntry(blob: string): QueueEntry {
    const o = JSON.parse(blob);
    return {
      socketId: o.socketId,
      userId: o.userId,
      username: o.username,
      eloRating: o.eloRating,
      preference: { categoryId: o.categoryId, quizId: o.quizId ?? undefined },
      startedAtMs: o.startedAtMs,
      currentRange: typeof o.currentRange === 'number' ? o.currentRange : this.cfg.startRange,
      serverId: o.serverId,
    };
  }

  private serializeEntry(entry: QueueEntry): string {
    return JSON.stringify({
      socketId: entry.socketId,
      userId: entry.userId,
      username: entry.username,
      eloRating: entry.eloRating,
      categoryId: entry.preference.categoryId,
      quizId: entry.preference.quizId ?? null,
      startedAtMs: entry.startedAtMs,
      currentRange: entry.currentRange,
      serverId: entry.serverId,
    });
  }

  // Distributed lock: same primitive as services/matchService.ts (SET NX PX +
  // Lua compare-del). Serializes the pop path per category across replicas.
  private async acquireLock(lockKey: string, ttlMs: number): Promise<string | null> {
    try {
      const token = `${this.instanceId}:${randomUUID()}`;
      const res = await this.redis.set(lockKey, token, 'PX', ttlMs, 'NX');
      return res === 'OK' ? token : null;
    } catch {
      return null;
    }
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const lua =
      'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end';
    try {
      await this.redis.eval(lua, 1, lockKey, token);
    } catch {
      /* lock will expire on its own via PX */
    }
  }

  async enqueue(entry: QueueEntry): Promise<void> {
    const cat = entry.preference.categoryId;
    const ttlMs = this.cfg.timeoutMs + 60_000; // fallback if a replica dies mid-search
    const pipeline = this.redis.multi();
    pipeline.zadd(this.queueKey(cat), entry.eloRating, String(entry.userId));
    pipeline.zadd(this.waitKey(cat), entry.startedAtMs, String(entry.userId));
    pipeline.set(this.entryKey(entry.userId), this.serializeEntry(entry), 'PX', ttlMs);
    pipeline.sadd(CATEGORIES_KEY, String(cat));
    await pipeline.exec();
  }

  async remove(userId: number): Promise<QueueEntry | undefined> {
    const blob = await this.redis.get(this.entryKey(userId));
    if (!blob) return undefined;
    let entry: QueueEntry;
    try {
      entry = this.parseEntry(blob);
    } catch {
      await this.redis.del(this.entryKey(userId));
      return undefined;
    }
    const cat = entry.preference.categoryId;
    const pipeline = this.redis.multi();
    pipeline.zrem(this.queueKey(cat), String(userId));
    pipeline.zrem(this.waitKey(cat), String(userId));
    pipeline.del(this.entryKey(userId));
    await pipeline.exec();
    return entry;
  }

  async has(userId: number): Promise<boolean> {
    return (await this.redis.exists(this.entryKey(userId))) === 1;
  }

  async get(userId: number): Promise<QueueEntry | undefined> {
    const blob = await this.redis.get(this.entryKey(userId));
    if (!blob) return undefined;
    try {
      return this.parseEntry(blob);
    } catch {
      return undefined;
    }
  }

  async findBestMatchFor(entry: QueueEntry): Promise<QueueEntry | undefined> {
    const now = Date.now();
    const cat = entry.preference.categoryId;
    const eRange = widenedRange(entry.startedAtMs, now, this.cfg);
    // Query the widest possible band, then filter by the *actual* pairwise range
    // (max of the two players' current ranges) so we honour range widening.
    const band = this.cfg.maxRange;
    const ids = await this.redis.zrangebyscore(
      this.queueKey(cat),
      entry.eloRating - band,
      entry.eloRating + band,
    );
    const others = ids.filter((id) => Number(id) !== entry.userId);
    if (!others.length) return undefined;

    const blobs = await this.redis.mget(...others.map((id) => this.entryKey(Number(id))));
    const self: QueueEntry = { ...entry, currentRange: eRange };
    const candidates: QueueEntry[] = [];
    for (const blob of blobs) {
      if (!blob) continue;
      let other: QueueEntry;
      try {
        other = this.parseEntry(blob);
      } catch {
        continue;
      }
      other.currentRange = widenedRange(other.startedAtMs, now, this.cfg);
      candidates.push(other);
    }
    return pickClosest(self, candidates);
  }

  async claimPair(aUserId: number, bUserId: number): Promise<MatchPair | undefined> {
    if (aUserId === bUserId) return undefined;
    const [aBlob, bBlob] = await this.redis.mget(this.entryKey(aUserId), this.entryKey(bUserId));
    if (!aBlob || !bBlob) return undefined;
    let a: QueueEntry;
    let b: QueueEntry;
    try {
      a = this.parseEntry(aBlob);
      b = this.parseEntry(bBlob);
    } catch {
      return undefined;
    }
    if (a.preference.categoryId !== b.preference.categoryId) return undefined;

    const categoryId = a.preference.categoryId;
    const lockKey = `lock:matchmaking:${categoryId}`;
    const token = await this.acquireLock(lockKey, 5_000);
    if (!token) return undefined; // another replica is popping this category

    try {
      // Atomic check-both-then-remove: only remove if BOTH are still queued, so
      // an opponent already grabbed by another replica yields undefined here.
      const lua = `
        if redis.call('ZSCORE', KEYS[1], ARGV[1]) and redis.call('ZSCORE', KEYS[1], ARGV[2]) then
          redis.call('ZREM', KEYS[1], ARGV[1], ARGV[2])
          redis.call('ZREM', KEYS[2], ARGV[1], ARGV[2])
          return 1
        end
        return 0
      `;
      const res = await this.redis.eval(
        lua,
        2,
        this.queueKey(categoryId),
        this.waitKey(categoryId),
        String(aUserId),
        String(bUserId),
      );
      if (Number(res) !== 1) return undefined;
      await this.redis.del(this.entryKey(aUserId), this.entryKey(bUserId));
      return { a, b };
    } finally {
      await this.releaseLock(lockKey, token);
    }
  }

  async sweep(nowMs: number, cfg: SweepConfig): Promise<SweepResult> {
    this.cfg = cfg;
    const pairs: MatchPair[] = [];
    const timedOut: QueueEntry[] = [];
    const stillSearching: QueueEntry[] = [];

    const categories = await this.redis.smembers(CATEGORIES_KEY);
    for (const catStr of categories) {
      const categoryId = Number(catStr);
      const queueKey = this.queueKey(categoryId);
      const waitKey = this.waitKey(categoryId);

      // Longest-waiter first: the wait sorted set is scored by startedAtMs asc.
      const ids = await this.redis.zrange(waitKey, 0, -1);
      if (!ids.length) {
        await this.redis.srem(CATEGORIES_KEY, catStr);
        continue;
      }

      const blobs = await this.redis.mget(...ids.map((id) => this.entryKey(Number(id))));
      const entries: QueueEntry[] = [];
      const stale: string[] = [];
      for (let i = 0; i < ids.length; i += 1) {
        const blob = blobs[i];
        if (!blob) {
          stale.push(ids[i]);
          continue;
        }
        try {
          const entry = this.parseEntry(blob);
          entry.currentRange = widenedRange(entry.startedAtMs, nowMs, cfg);
          entries.push(entry);
        } catch {
          stale.push(ids[i]);
        }
      }
      if (stale.length) {
        // Entry blob gone (TTL/removed) but index members lingered: clean them.
        await this.redis.zrem(queueKey, ...stale);
        await this.redis.zrem(waitKey, ...stale);
      }

      // Time out anyone past the deadline (they're removed, never paired).
      const active: QueueEntry[] = [];
      for (const entry of entries) {
        if (nowMs - entry.startedAtMs >= cfg.timeoutMs) {
          const removed = await this.remove(entry.userId);
          timedOut.push(removed || entry);
        } else {
          active.push(entry);
        }
      }

      // Greedy pairing, longest-waiter first, closest-ELO partner; claimPair
      // enforces cross-replica correctness (skips a pair an opponent stole).
      const consumed = new Set<number>();
      for (const entry of active) {
        if (consumed.has(entry.userId)) continue;
        const available = active.filter(
          (o) => o.userId !== entry.userId && !consumed.has(o.userId),
        );
        const partner = pickClosest(entry, available);
        if (!partner) continue;
        const claimed = await this.claimPair(entry.userId, partner.userId);
        if (claimed) {
          consumed.add(entry.userId);
          consumed.add(partner.userId);
          pairs.push(claimed);
        }
      }

      for (const entry of active) {
        if (!consumed.has(entry.userId)) stillSearching.push(entry);
      }
    }

    return { pairs, timedOut, stillSearching };
  }

  async countByCategory(categoryId: number): Promise<number> {
    return this.redis.zcard(this.waitKey(categoryId));
  }

  async queuePosition(userId: number): Promise<number> {
    const blob = await this.redis.get(this.entryKey(userId));
    if (!blob) return 0;
    let entry: QueueEntry;
    try {
      entry = this.parseEntry(blob);
    } catch {
      return 0;
    }
    // Rank within the wait sorted set (asc by startedAtMs) = players ahead.
    const rank = await this.redis.zrank(this.waitKey(entry.preference.categoryId), String(userId));
    return rank === null || rank === undefined ? 0 : rank + 1;
  }

  async snapshot(): Promise<QueueSnapshot> {
    const now = Date.now();
    const depthByCategory = new Map<number, number>();
    const oldestWaitMsByCategory = new Map<number, number>();
    let size = 0;

    const categories = await this.redis.smembers(CATEGORIES_KEY);
    for (const catStr of categories) {
      const categoryId = Number(catStr);
      const waitKey = this.waitKey(categoryId);
      const count = await this.redis.zcard(waitKey);
      if (count <= 0) continue;
      depthByCategory.set(categoryId, count);
      size += count;
      const oldest = await this.redis.zrange(waitKey, 0, 0, 'WITHSCORES');
      if (oldest.length >= 2) {
        const startedAt = Number(oldest[1]);
        oldestWaitMsByCategory.set(categoryId, Math.max(0, now - startedAt));
      }
    }
    return { depthByCategory, oldestWaitMsByCategory, size };
  }

  async size(): Promise<number> {
    return (await this.snapshot()).size;
  }
}

// ===== Factory =====

export function createMatchmakingQueue(redis: Redis): MatchmakingQueue {
  const backend = (process.env.MATCHMAKING_BACKEND || 'redis').toLowerCase();
  if (backend === 'memory') return new InMemoryMatchmakingQueue();
  return new RedisMatchmakingQueue(redis);
}

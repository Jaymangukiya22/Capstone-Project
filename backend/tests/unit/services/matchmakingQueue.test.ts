import {
  InMemoryMatchmakingQueue,
  DEFAULT_SWEEP_CONFIG,
  type QueueEntry,
  type SweepConfig,
} from '../../../src/services/matchmakingQueue';

const makeEntry = (over: Partial<QueueEntry> & { userId: number }): QueueEntry => ({
  socketId: `sock-${over.userId}`,
  username: `user${over.userId}`,
  eloRating: 1200,
  preference: { categoryId: 1 },
  startedAtMs: Date.now(),
  currentRange: DEFAULT_SWEEP_CONFIG.startRange,
  serverId: 'test-server',
  ...over,
});

describe('InMemoryMatchmakingQueue', () => {
  describe('claimPair', () => {
    it('returns the pair once, then undefined on a second (racing) claim', async () => {
      const q = new InMemoryMatchmakingQueue();
      q.enqueue(makeEntry({ userId: 1, eloRating: 1200 }));
      q.enqueue(makeEntry({ userId: 2, eloRating: 1210 }));

      const first = await q.claimPair(1, 2);
      expect(first).toBeDefined();
      expect(new Set([first!.a.userId, first!.b.userId])).toEqual(new Set([1, 2]));

      // Both entries are gone now → a second claim of the same pair fails.
      const second = await q.claimPair(1, 2);
      expect(second).toBeUndefined();
    });

    it('returns undefined if either member was already removed', async () => {
      const q = new InMemoryMatchmakingQueue();
      q.enqueue(makeEntry({ userId: 10 }));
      q.enqueue(makeEntry({ userId: 11 }));
      q.remove(10);

      const claimed = await q.claimPair(10, 11);
      expect(claimed).toBeUndefined();
      // The surviving member stays queued.
      expect(q.has(11)).toBe(true);
    });
  });

  describe('findBestMatchFor', () => {
    it('picks the closest-ELO compatible partner, not the first', async () => {
      const q = new InMemoryMatchmakingQueue();
      // Wide range so every candidate is elo-eligible; correctness rides on
      // choosing the minimum |Δelo|.
      const range = 300;
      const me = makeEntry({ userId: 1, eloRating: 1200, currentRange: range });
      q.enqueue(makeEntry({ userId: 2, eloRating: 1000, currentRange: range })); // Δ200, enqueued first
      q.enqueue(makeEntry({ userId: 3, eloRating: 1190, currentRange: range })); // Δ10  (closest)
      q.enqueue(makeEntry({ userId: 4, eloRating: 1400, currentRange: range })); // Δ200

      const best = await q.findBestMatchFor(me);
      expect(best).toBeDefined();
      expect(best!.userId).toBe(3);
    });

    it('respects the ELO band', async () => {
      const q = new InMemoryMatchmakingQueue();
      const me = makeEntry({ userId: 1, eloRating: 1200, currentRange: 50 });
      q.enqueue(makeEntry({ userId: 2, eloRating: 1400, currentRange: 50 })); // out of band
      const outOfBand = await q.findBestMatchFor(me);
      expect(outOfBand).toBeUndefined();
    });

    it('respects quiz compatibility even within the ELO band', async () => {
      // Different specific quiz → incompatible even within band. Fresh queue
      // (not shared with the ELO-band case above) so a wide-range search here
      // can't accidentally re-match against that case's leftover entry.
      const q = new InMemoryMatchmakingQueue();
      const meQ = makeEntry({ userId: 1, eloRating: 1200, currentRange: 300, preference: { categoryId: 1, quizId: 7 } });
      q.enqueue(makeEntry({ userId: 3, eloRating: 1205, currentRange: 300, preference: { categoryId: 1, quizId: 9 } }));
      const wrongQuiz = await q.findBestMatchFor(meQ);
      expect(wrongQuiz).toBeUndefined();
    });
  });

  describe('sweep', () => {
    it('pairs two same-category waiters and reports the rest / timeouts', async () => {
      const q = new InMemoryMatchmakingQueue();
      const now = Date.now();
      const cfg: SweepConfig = { ...DEFAULT_SWEEP_CONFIG, timeoutMs: 60_000 };

      q.enqueue(makeEntry({ userId: 1, eloRating: 1200, startedAtMs: now - 5_000 }));
      q.enqueue(makeEntry({ userId: 2, eloRating: 1220, startedAtMs: now - 4_000 }));
      // Lone waiter in another category → still searching.
      q.enqueue(makeEntry({ userId: 3, eloRating: 1300, preference: { categoryId: 2 }, startedAtMs: now - 1_000 }));
      // Past the (overridden) timeout → timed out.
      q.enqueue(makeEntry({ userId: 4, eloRating: 1000, preference: { categoryId: 3 }, startedAtMs: now - 61_000 }));

      const { pairs, timedOut, stillSearching } = await q.sweep(now, cfg);
      expect(pairs).toHaveLength(1);
      expect(new Set([pairs[0].a.userId, pairs[0].b.userId])).toEqual(new Set([1, 2]));
      expect(timedOut.map((e) => e.userId)).toEqual([4]);
      expect(stillSearching.map((e) => e.userId)).toEqual([3]);
      expect(q.size()).toBe(1); // only user 3 remains
    });
  });
});

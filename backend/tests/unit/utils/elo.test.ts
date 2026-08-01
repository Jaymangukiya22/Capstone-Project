import { expectedScore, newRating, computeEloUpdate } from '../../../src/utils/elo';

describe('elo utils', () => {
  describe('expectedScore', () => {
    it('returns 0.5 for equal ratings', () => {
      expect(expectedScore(1200, 1200)).toBeCloseTo(0.5, 5);
    });
  });

  describe('newRating', () => {
    it('increases rating on a win at K=32', () => {
      expect(newRating(1200, 0.5, 1, 32)).toBe(1216);
    });

    it('decreases rating on a loss at K=32', () => {
      expect(newRating(1200, 0.5, 0, 32)).toBe(1184);
    });

    it('does not change rating on an expected draw', () => {
      expect(newRating(1200, 0.5, 0.5, 32)).toBe(1200);
    });
  });

  describe('computeEloUpdate', () => {
    it('equal ratings, A wins -> A +16 / B -16 at default K=32', () => {
      const result = computeEloUpdate(1200, 1200, 10, 5);
      expect(result.outcomeA).toBe(1);
      expect(result.outcomeB).toBe(0);
      expect(result.ratingA).toBe(1216);
      expect(result.ratingB).toBe(1184);
    });

    it('equal ratings, tie score -> no rating change', () => {
      const result = computeEloUpdate(1200, 1200, 10, 10);
      expect(result.outcomeA).toBe(0.5);
      expect(result.outcomeB).toBe(0.5);
      expect(result.ratingA).toBe(1200);
      expect(result.ratingB).toBe(1200);
    });

    it('underdog beating a higher-rated opponent gains more than a favorite would', () => {
      // Underdog (1000) beats favorite (1400)
      const underdogWin = computeEloUpdate(1000, 1400, 10, 5);
      // Favorite (1400) beats underdog (1000) - mirror scenario
      const favoriteWin = computeEloUpdate(1400, 1000, 10, 5);

      const underdogGain = underdogWin.ratingA - 1000;
      const favoriteGain = favoriteWin.ratingA - 1400;

      expect(underdogGain).toBeGreaterThan(favoriteGain);
    });
  });
});

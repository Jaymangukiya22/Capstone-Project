// Standard Elo rating helpers used to update AUTO (ranked) match players'
// eloRating after a match completes. See matchServerWorker.ts `endMatch`.

const DEFAULT_K_FACTOR = 32;

function getKFactor(k?: number): number {
  if (typeof k === 'number' && !Number.isNaN(k)) return k;
  const envK = parseInt(process.env.ELO_K_FACTOR || '', 10);
  return Number.isNaN(envK) ? DEFAULT_K_FACTOR : envK;
}

/**
 * Probability that player A beats player B, given their current ratings.
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * New rating for a player given their current rating, expected score
 * (from expectedScore), and actual outcome (1 win, 0.5 draw, 0 loss).
 */
export function newRating(rating: number, expected: number, actual: number, k?: number): number {
  return Math.round(rating + getKFactor(k) * (actual - expected));
}

export interface EloUpdateResult {
  ratingA: number;
  ratingB: number;
  outcomeA: 0 | 0.5 | 1;
  outcomeB: 0 | 0.5 | 1;
}

/**
 * Computes updated Elo ratings for a two-player match, deriving win/loss/draw
 * outcomes from the players' match scores.
 */
export function computeEloUpdate(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  scoreB: number,
  k?: number
): EloUpdateResult {
  let outcomeA: 0 | 0.5 | 1;
  let outcomeB: 0 | 0.5 | 1;

  if (scoreA > scoreB) {
    outcomeA = 1;
    outcomeB = 0;
  } else if (scoreA < scoreB) {
    outcomeA = 0;
    outcomeB = 1;
  } else {
    outcomeA = 0.5;
    outcomeB = 0.5;
  }

  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);

  return {
    ratingA: newRating(ratingA, expectedA, outcomeA, k),
    ratingB: newRating(ratingB, expectedB, outcomeB, k),
    outcomeA,
    outcomeB
  };
}

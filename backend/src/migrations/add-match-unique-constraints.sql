-- Fixes [M10]: matches / match_players accumulate duplicate rows because the
-- match-server persistence path did non-atomic findOne-then-create with no
-- unique-constraint backstop. This migration (1) de-duplicates the rows that
-- already leaked in, FK-safely, then (2) adds the unique constraints that make
-- the new atomic upserts in matchServerWorker.ts race-proof.
--
-- Idempotent: safe to re-run. Run inside the DB (psql) once per environment,
-- BEFORE deploying the code that carries the unique indexes in its models,
-- otherwise the backend's alter-sync would try to add the index over dirty data.

BEGIN;

-- 1. De-dup match_players within a single matches.id: keep the most-complete
--    row per (matchId,userId) — FINISHED over PLAYING, then higher score, then
--    lowest id — and drop the rest.
DELETE FROM match_players mp
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY "matchId", "userId"
           ORDER BY (status = 'FINISHED') DESC, score DESC, id ASC
         ) AS rn
  FROM match_players
) d
WHERE mp.id = d.id AND d.rn > 1;

-- 2. Pick one survivor row per duplicated matchId: prefer COMPLETED, then a row
--    that actually has a winner, then the newest (max id).
CREATE TEMP TABLE match_survivor ON COMMIT DROP AS
SELECT keep_id, "matchId"
FROM (
  SELECT id AS keep_id, "matchId",
         row_number() OVER (
           PARTITION BY "matchId"
           ORDER BY (status = 'COMPLETED') DESC, ("winnerId" IS NOT NULL) DESC, id DESC
         ) AS rn
  FROM matches
) s
WHERE rn = 1;

-- 2a. Re-parent match_answers off the loser rows onto the survivor. match_answers
--     has ON UPDATE CASCADE but NOT ON DELETE CASCADE, so the loser rows can't be
--     deleted while answers still point at them — re-parent first (non-destructive).
UPDATE match_answers ma
SET "matchId" = sv.keep_id
FROM matches m
JOIN match_survivor sv ON sv."matchId" = m."matchId"
WHERE ma."matchId" = m.id AND m.id <> sv.keep_id;

-- 2b. Re-parent match_players off the loser rows onto the survivor, but only when
--     the survivor doesn't already have that user (else we'd recreate a
--     (matchId,userId) duplicate). Any left behind ride the loser row's ON DELETE
--     CASCADE in step 3.
UPDATE match_players mp
SET "matchId" = sv.keep_id
FROM matches m
JOIN match_survivor sv ON sv."matchId" = m."matchId"
WHERE mp."matchId" = m.id AND m.id <> sv.keep_id
  AND NOT EXISTS (
    SELECT 1 FROM match_players x
    WHERE x."matchId" = sv.keep_id AND x."userId" = mp."userId"
  );

-- 3. Delete the loser matches rows. Their remaining match_players cascade away;
--    their match_answers were re-parented in 2a.
DELETE FROM matches m
USING match_survivor sv
WHERE sv."matchId" = m."matchId" AND m.id <> sv.keep_id;

-- 4. Add the unique backstops (names match the model @Table indexes so the
--    backend's sequelize sync treats them as already-present).
CREATE UNIQUE INDEX IF NOT EXISTS matches_matchid_uq
  ON matches ("matchId");
CREATE UNIQUE INDEX IF NOT EXISTS match_players_matchid_userid_uq
  ON match_players ("matchId", "userId");

COMMIT;

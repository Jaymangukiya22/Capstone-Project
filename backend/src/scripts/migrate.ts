import { sequelize } from '../config/database';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { logInfo, logError } from '../utils/logger';

/**
 * Generic SQL migration runner.
 *
 * Applies every `*.sql` file in ../migrations in filename order, exactly once,
 * tracked in a `schema_migrations` table. Idempotent: re-running only applies
 * files that haven't been recorded yet, and the SQL files themselves use
 * `IF NOT EXISTS` guards, so a re-run (or a run against a DB that was migrated
 * by hand) is safe.
 *
 *   npm run migrate                 # local / dev (ts-node)
 *   node dist/scripts/migrate.js    # prod (after `npm run build`)
 *
 * Add a migration: drop `NNN-description.sql` (zero-padded prefix to order it)
 * into backend/src/migrations/ and run the command. Each file should be
 * idempotent (IF NOT EXISTS / ON CONFLICT) so a partial failure can be retried.
 * Run it as a discrete deploy step BEFORE starting the app — not on every
 * container boot (concurrent workers would race on DDL).
 */

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function appliedMigrations(): Promise<Set<string>> {
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations;');
  return new Set((rows as Array<{ name: string }>).map(r => r.name));
}

async function runMigrations(): Promise<void> {
  await sequelize.authenticate();
  await ensureMigrationsTable();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort(); // filename order (use zero-padded numeric prefixes to control it)

  const done = await appliedMigrations();
  const pending = files.filter(f => !done.has(f));

  if (pending.length === 0) {
    logInfo('Migrations: nothing to apply', { total: files.length, applied: done.size });
    return;
  }

  logInfo('Migrations: applying pending', { pending });

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      // Each file manages its own atomicity (some wrap BEGIN/COMMIT, some rely
      // on idempotent single statements) - run it as-is, then record it. If the
      // process dies between the two, the IF NOT EXISTS guards make a re-run safe.
      await sequelize.query(sql);
      await sequelize.query(
        'INSERT INTO schema_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING;',
        { bind: [file] }
      );
      logInfo(`Migrations: applied ${file}`);
    } catch (error) {
      logError(`Migrations: FAILED on ${file} (not recorded; safe to re-run)`, error as Error);
      throw error;
    }
  }

  logInfo('Migrations: complete', { appliedThisRun: pending.length });
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };

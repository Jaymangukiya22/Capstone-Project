import { sequelize } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logInfo, logError } from '../utils/logger';

/**
 * Migration script to add tags column to Quiz table with optimized indexes
 * Run this script to add tags support to existing database
 */
async function migrateTags() {
  try {
    logInfo('Starting tags migration...');

    // Read the SQL migration file
    const migrationPath = join(__dirname, '..', 'migrations', 'add-tags-to-quiz.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await sequelize.query(migrationSQL);

    logInfo('Tags migration completed successfully!');
    
    // Verify the migration
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'quizzes' AND column_name = 'tags';
    `);

    if (results.length > 0) {
      logInfo('Tags column verified:', results[0]);
    } else {
      throw new Error('Tags column not found after migration');
    }

    // Check indexes
    const [indexes] = await sequelize.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'quizzes' AND indexname LIKE '%tags%';
    `);

    logInfo(`Created ${indexes.length} tag-related indexes:`, indexes);

    process.exit(0);
  } catch (error) {
    logError('Tags migration failed:', error as Error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateTags();
}

export { migrateTags };

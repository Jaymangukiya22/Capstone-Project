const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');

    // Initialize Sequelize
    const sequelize = new Sequelize(
      process.env.DATABASE_URL || 'postgresql://quizup_user:quizup_password@localhost:5432/quizup_db',
      {
        logging: console.log,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ force: false });
    console.log('✅ Database schema synchronized');

    // Close connection
    await sequelize.close();
    console.log('✅ Database setup completed successfully');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();

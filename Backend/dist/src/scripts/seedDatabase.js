"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = void 0;
const massiveSeeder_1 = require("../seeders/massiveSeeder");
const models_1 = require("../models");
const database_1 = require("../config/database");
const seedDatabase = async () => {
    try {
        console.log('🚀 Starting database seeding...');
        await (0, database_1.connectDatabase)();
        console.log('✅ Database connection and sync completed');
        const LARGE_CONFIG = {
            users: 500,
            categories: 20,
            questionsPerCategory: 50,
            quizzesPerCategory: 15,
            attemptsPerUser: 10,
            questionsPerQuiz: 8
        };
        console.log('📊 Seeding Configuration:', LARGE_CONFIG);
        console.log('📈 Expected Records:');
        console.log(`   Users: ${LARGE_CONFIG.users}`);
        console.log(`   Categories: ${LARGE_CONFIG.categories}`);
        console.log(`   Questions: ${LARGE_CONFIG.categories * LARGE_CONFIG.questionsPerCategory}`);
        console.log(`   Quizzes: ${LARGE_CONFIG.categories * LARGE_CONFIG.quizzesPerCategory}`);
        console.log(`   Quiz Attempts: ${LARGE_CONFIG.users * LARGE_CONFIG.attemptsPerUser}`);
        console.log(`   Estimated Total Records: ~${LARGE_CONFIG.users +
            LARGE_CONFIG.categories +
            (LARGE_CONFIG.categories * LARGE_CONFIG.questionsPerCategory * 4) +
            (LARGE_CONFIG.categories * LARGE_CONFIG.quizzesPerCategory) +
            (LARGE_CONFIG.users * LARGE_CONFIG.attemptsPerUser * 16)}`);
        const seeder = new massiveSeeder_1.MassiveSeeder(LARGE_CONFIG);
        await seeder.seed();
        console.log('🎉 Database seeding completed successfully!');
        console.log('💾 Your database is now loaded with MASSIVE amounts of realistic data');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
    finally {
        await models_1.sequelize.close();
    }
};
exports.seedDatabase = seedDatabase;
if (require.main === module) {
    seedDatabase()
        .then(() => {
        console.log('✅ Seeding process completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Seeding process failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=seedDatabase.js.map
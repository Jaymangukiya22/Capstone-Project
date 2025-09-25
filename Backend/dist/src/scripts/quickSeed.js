"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickSeed = void 0;
const faker_1 = require("@faker-js/faker");
const bcryptjs_1 = require("bcryptjs");
const database_1 = require("../config/database");
const models_1 = require("../models");
const quickSeed = async () => {
    try {
        console.log('🚀 Starting QUICK database seeding...');
        await (0, database_1.connectDatabase)();
        console.log('✅ Database connection and sync completed');
        console.log('🧹 Clearing existing data...');
        await models_1.QuizAttemptAnswer.destroy({ where: {} });
        await models_1.QuizAttempt.destroy({ where: {} });
        await models_1.QuizQuestion.destroy({ where: {} });
        await models_1.QuestionBankOption.destroy({ where: {} });
        await models_1.QuestionBankItem.destroy({ where: {} });
        await models_1.Quiz.destroy({ where: {} });
        await models_1.Category.destroy({ where: {} });
        await models_1.User.destroy({ where: {} });
        console.log('✅ Database cleared');
        const config = {
            users: 100,
            categories: 10,
            questionsPerCategory: 20,
            quizzesPerCategory: 5,
            attemptsPerUser: 5,
            questionsPerQuiz: 5
        };
        console.log('📊 Seeding Configuration:', config);
        console.log('👥 Creating users...');
        const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
        const users = [];
        for (let i = 0; i < 20; i++) {
            users.push({
                username: faker_1.faker.internet.username(),
                email: faker_1.faker.internet.email(),
                passwordHash: hashedPassword,
                role: models_1.UserRole.ADMIN,
                eloRating: faker_1.faker.number.int({ min: 1000, max: 2000 }),
                totalMatches: faker_1.faker.number.int({ min: 0, max: 100 }),
                isActive: true
            });
        }
        for (let i = 0; i < 80; i++) {
            users.push({
                username: faker_1.faker.internet.username(),
                email: faker_1.faker.internet.email(),
                passwordHash: hashedPassword,
                role: models_1.UserRole.PLAYER,
                eloRating: faker_1.faker.number.int({ min: 800, max: 1600 }),
                totalMatches: faker_1.faker.number.int({ min: 0, max: 200 }),
                isActive: faker_1.faker.datatype.boolean(0.95)
            });
        }
        const createdUsers = await models_1.User.bulkCreate(users);
        console.log(`✅ Created ${createdUsers.length} users`);
        console.log('📚 Creating categories...');
        const categoryNames = [
            'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
            'History', 'Geography', 'Literature', 'Philosophy', 'Psychology'
        ];
        const categories = [];
        const adminUser = createdUsers.find(u => u.role === models_1.UserRole.ADMIN);
        for (let i = 0; i < config.categories; i++) {
            categories.push({
                name: categoryNames[i],
                description: faker_1.faker.lorem.paragraph(),
                createdById: adminUser.id,
                isActive: true
            });
        }
        const createdCategories = await models_1.Category.bulkCreate(categories);
        console.log(`✅ Created ${createdCategories.length} categories`);
        console.log('❓ Creating questions...');
        const questions = [];
        const allOptions = [];
        for (const category of createdCategories) {
            for (let i = 0; i < config.questionsPerCategory; i++) {
                const question = {
                    categoryId: category.id,
                    createdById: adminUser.id,
                    questionText: `What is the main concept of ${faker_1.faker.lorem.word()} in ${category.name}?`,
                    difficulty: faker_1.faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']),
                    isActive: true
                };
                questions.push(question);
            }
        }
        const createdQuestions = await models_1.QuestionBankItem.bulkCreate(questions);
        for (const question of createdQuestions) {
            const correctIndex = faker_1.faker.number.int({ min: 0, max: 3 });
            for (let i = 0; i < 4; i++) {
                allOptions.push({
                    questionId: question.id,
                    optionText: faker_1.faker.lorem.sentence(),
                    isCorrect: i === correctIndex
                });
            }
        }
        await models_1.QuestionBankOption.bulkCreate(allOptions);
        console.log(`✅ Created ${createdQuestions.length} questions with ${allOptions.length} options`);
        console.log('📝 Creating quizzes...');
        const quizzes = [];
        for (const category of createdCategories) {
            for (let i = 0; i < config.quizzesPerCategory; i++) {
                quizzes.push({
                    title: `${category.name} Quiz ${i + 1}`,
                    description: faker_1.faker.lorem.paragraph(),
                    difficulty: faker_1.faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']),
                    timeLimit: faker_1.faker.number.int({ min: 300, max: 1800 }),
                    maxQuestions: config.questionsPerQuiz,
                    categoryId: category.id,
                    createdById: adminUser.id,
                    isActive: true
                });
            }
        }
        const createdQuizzes = await models_1.Quiz.bulkCreate(quizzes);
        console.log(`✅ Created ${createdQuizzes.length} quizzes`);
        console.log('🔗 Assigning questions to quizzes...');
        const assignments = [];
        for (const quiz of createdQuizzes) {
            const categoryQuestions = createdQuestions.filter(q => q.categoryId === quiz.categoryId);
            const selectedQuestions = faker_1.faker.helpers.arrayElements(categoryQuestions, Math.min(config.questionsPerQuiz, categoryQuestions.length));
            selectedQuestions.forEach((question, index) => {
                assignments.push({
                    quizId: quiz.id,
                    questionId: question.id,
                    order: index + 1
                });
            });
        }
        await models_1.QuizQuestion.bulkCreate(assignments);
        console.log(`✅ Created ${assignments.length} question-quiz assignments`);
        console.log('🎯 Creating quiz attempts...');
        const attempts = [];
        const answers = [];
        const playerUsers = createdUsers.filter(u => u.role === models_1.UserRole.PLAYER);
        for (const user of playerUsers.slice(0, 50)) {
            for (let i = 0; i < config.attemptsPerUser; i++) {
                const quiz = faker_1.faker.helpers.arrayElement(createdQuizzes);
                const startedAt = faker_1.faker.date.past({ years: 1 });
                const completedAt = faker_1.faker.datatype.boolean(0.8) ?
                    faker_1.faker.date.between({ from: startedAt, to: new Date() }) : null;
                const score = completedAt ? faker_1.faker.number.int({ min: 0, max: 100 }) : 0;
                const status = completedAt ? models_1.AttemptStatus.COMPLETED : models_1.AttemptStatus.IN_PROGRESS;
                attempts.push({
                    userId: user.id,
                    quizId: quiz.id,
                    status,
                    score,
                    totalQuestions: config.questionsPerQuiz,
                    correctAnswers: Math.floor((score / 100) * config.questionsPerQuiz),
                    timeSpent: completedAt ? faker_1.faker.number.int({ min: 60, max: 1800 }) : null,
                    startedAt,
                    completedAt
                });
            }
        }
        const createdAttempts = await models_1.QuizAttempt.bulkCreate(attempts);
        console.log(`✅ Created ${createdAttempts.length} quiz attempts`);
        const userCount = await models_1.User.count();
        const categoryCount = await models_1.Category.count();
        const questionCount = await models_1.QuestionBankItem.count();
        const optionCount = await models_1.QuestionBankOption.count();
        const quizCount = await models_1.Quiz.count();
        const assignmentCount = await models_1.QuizQuestion.count();
        const attemptCount = await models_1.QuizAttempt.count();
        console.log('\n📊 SEEDING SUMMARY:');
        console.log(`   👥 Users: ${userCount}`);
        console.log(`   📚 Categories: ${categoryCount}`);
        console.log(`   ❓ Questions: ${questionCount}`);
        console.log(`   📝 Options: ${optionCount}`);
        console.log(`   📋 Quizzes: ${quizCount}`);
        console.log(`   🔗 Assignments: ${assignmentCount}`);
        console.log(`   🎯 Attempts: ${attemptCount}`);
        console.log(`   📊 Total Records: ${userCount + categoryCount + questionCount + optionCount + quizCount + assignmentCount + attemptCount}`);
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('💾 Your database is now loaded with realistic test data');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
    finally {
        await models_1.sequelize.close();
    }
};
exports.quickSeed = quickSeed;
if (require.main === module) {
    quickSeed()
        .then(() => {
        console.log('✅ Quick seeding process completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Quick seeding process failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=quickSeed.js.map
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { 
  User, 
  Category, 
  Quiz, 
  QuestionBankItem, 
  QuestionBankOption, 
  QuizAttempt, 
  QuizAttemptAnswer,
  QuizQuestion,
  sequelize,
  UserRole,
  Difficulty,
  AttemptStatus
} from '../models';

const quickSeed = async () => {
  try {
    console.log('🚀 Starting QUICK database seeding...');
    
    // Connect and sync database
    await connectDatabase();
    console.log('✅ Database connection and sync completed');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await QuizAttemptAnswer.destroy({ where: {} });
    await QuizAttempt.destroy({ where: {} });
    await QuizQuestion.destroy({ where: {} });
    await QuestionBankOption.destroy({ where: {} });
    await QuestionBankItem.destroy({ where: {} });
    await Quiz.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });
    console.log('✅ Database cleared');
    
    // Configuration
    const config = {
      users: 100,
      categories: 10,
      questionsPerCategory: 20,
      quizzesPerCategory: 5,
      attemptsPerUser: 5,
      questionsPerQuiz: 5
    };
    
    console.log('📊 Seeding Configuration:', config);
    
    // 1. Create Users
    console.log('👥 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const users = [];
    
    // Create 20 admin users
    for (let i = 0; i < 20; i++) {
      users.push({
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        eloRating: faker.number.int({ min: 1000, max: 2000 }),
        totalMatches: faker.number.int({ min: 0, max: 100 }),
        isActive: true
      });
    }
    
    // Create 80 player users
    for (let i = 0; i < 80; i++) {
      users.push({
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        eloRating: faker.number.int({ min: 800, max: 1600 }),
        totalMatches: faker.number.int({ min: 0, max: 200 }),
        isActive: faker.datatype.boolean(0.95)
      });
    }
    
    const createdUsers = await User.bulkCreate(users);
    console.log(`✅ Created ${createdUsers.length} users`);
    
    // 2. Create Categories
    console.log('📚 Creating categories...');
    const categoryNames = [
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
      'History', 'Geography', 'Literature', 'Philosophy', 'Psychology'
    ];
    
    const categories = [];
    const adminUser = createdUsers.find(u => u.role === UserRole.ADMIN)!;
    
    for (let i = 0; i < config.categories; i++) {
      categories.push({
        name: categoryNames[i],
        description: faker.lorem.paragraph(),
        createdById: adminUser.id,
        isActive: true
      });
    }
    
    const createdCategories = await Category.bulkCreate(categories);
    console.log(`✅ Created ${createdCategories.length} categories`);
    
    // 3. Create Questions with Options
    console.log('❓ Creating questions...');
    const questions = [];
    const allOptions: any[] = [];
    
    for (const category of createdCategories) {
      for (let i = 0; i < config.questionsPerCategory; i++) {
        const question = {
          categoryId: category.id,
          createdById: adminUser.id,
          questionText: `What is the main concept of ${faker.lorem.word()} in ${category.name}?`,
          difficulty: faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']) as Difficulty,
          isActive: true
        };
        
        questions.push(question);
      }
    }
    
    const createdQuestions = await QuestionBankItem.bulkCreate(questions);
    
    // Create options for each question
    for (const question of createdQuestions) {
      const correctIndex = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < 4; i++) {
        allOptions.push({
          questionId: question.id,
          optionText: faker.lorem.sentence(),
          isCorrect: i === correctIndex
        });
      }
    }
    
    await QuestionBankOption.bulkCreate(allOptions);
    console.log(`✅ Created ${createdQuestions.length} questions with ${allOptions.length} options`);
    
    // 4. Create Quizzes
    console.log('📝 Creating quizzes...');
    const quizzes = [];
    
    for (const category of createdCategories) {
      for (let i = 0; i < config.quizzesPerCategory; i++) {
        quizzes.push({
          title: `${category.name} Quiz ${i + 1}`,
          description: faker.lorem.paragraph(),
          difficulty: faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']) as Difficulty,
          timeLimit: faker.number.int({ min: 300, max: 1800 }),
          maxQuestions: config.questionsPerQuiz,
          categoryId: category.id,
          createdById: adminUser.id,
          isActive: true
        });
      }
    }
    
    const createdQuizzes = await Quiz.bulkCreate(quizzes);
    console.log(`✅ Created ${createdQuizzes.length} quizzes`);
    
    // 5. Assign Questions to Quizzes
    console.log('🔗 Assigning questions to quizzes...');
    const assignments: any[] = [];
    
    for (const quiz of createdQuizzes) {
      const categoryQuestions = createdQuestions.filter(q => q.categoryId === quiz.categoryId);
      const selectedQuestions = faker.helpers.arrayElements(
        categoryQuestions, 
        Math.min(config.questionsPerQuiz, categoryQuestions.length)
      );
      
      selectedQuestions.forEach((question, index) => {
        assignments.push({
          quizId: quiz.id,
          questionId: question.id,
          order: index + 1
        });
      });
    }
    
    await QuizQuestion.bulkCreate(assignments);
    console.log(`✅ Created ${assignments.length} question-quiz assignments`);
    
    // 6. Create Quiz Attempts
    console.log('🎯 Creating quiz attempts...');
    const attempts = [];
    const answers: any[] = [];
    
    const playerUsers = createdUsers.filter(u => u.role === UserRole.PLAYER);
    
    for (const user of playerUsers.slice(0, 50)) { // Only first 50 players to keep it manageable
      for (let i = 0; i < config.attemptsPerUser; i++) {
        const quiz = faker.helpers.arrayElement(createdQuizzes);
        const startedAt = faker.date.past({ years: 1 });
        const completedAt = faker.datatype.boolean(0.8) ? 
          faker.date.between({ from: startedAt, to: new Date() }) : null;
        
        const score = completedAt ? faker.number.int({ min: 0, max: 100 }) : 0;
        const status = completedAt ? AttemptStatus.COMPLETED : AttemptStatus.IN_PROGRESS;
        
        attempts.push({
          userId: user.id,
          quizId: quiz.id,
          status,
          score,
          totalQuestions: config.questionsPerQuiz,
          correctAnswers: Math.floor((score / 100) * config.questionsPerQuiz),
          timeSpent: completedAt ? faker.number.int({ min: 60, max: 1800 }) : null,
          startedAt,
          completedAt
        });
      }
    }
    
    const createdAttempts = await QuizAttempt.bulkCreate(attempts);
    console.log(`✅ Created ${createdAttempts.length} quiz attempts`);
    
    // Print Summary
    const userCount = await User.count();
    const categoryCount = await Category.count();
    const questionCount = await QuestionBankItem.count();
    const optionCount = await QuestionBankOption.count();
    const quizCount = await Quiz.count();
    const assignmentCount = await QuizQuestion.count();
    const attemptCount = await QuizAttempt.count();
    
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
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
};

// Run if called directly
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

export { quickSeed };

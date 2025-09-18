import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
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
import { logInfo, logError } from '../utils/logger';

interface SeederConfig {
  users: number;
  categories: number;
  questionsPerCategory: number;
  quizzesPerCategory: number;
  attemptsPerUser: number;
  questionsPerQuiz: number;
}

const DEFAULT_CONFIG: SeederConfig = {
  users: 500,              // 500 users
  categories: 25,          // 25 categories
  questionsPerCategory: 100, // 100 questions per category = 2,500 questions
  quizzesPerCategory: 20,   // 20 quizzes per category = 500 quizzes
  attemptsPerUser: 15,     // 15 attempts per user = 7,500 attempts
  questionsPerQuiz: 10     // 10 questions per quiz
};

class MassiveSeeder {
  private config: SeederConfig;
  private createdUsers: User[] = [];
  private createdCategories: Category[] = [];
  private createdQuestions: QuestionBankItem[] = [];
  private createdQuizzes: Quiz[] = [];

  constructor(config: SeederConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async seed() {
    try {
      logInfo('🚀 Starting MASSIVE database seeding...', this.config);
      
      // Clear existing data first
      await this.clearDatabase();
      
      // Seed in order due to dependencies
      await this.seedUsers();
      await this.seedCategories();
      await this.seedQuestions();
      await this.seedQuizzes();
      await this.assignQuestionsToQuizzes();
      await this.seedQuizAttempts();
      
      await this.printSummary();
      
      logInfo('🎉 MASSIVE seeding completed successfully!');
    } catch (error) {
      logError('❌ Seeding failed', error as Error);
      throw error;
    }
  }

  private async clearDatabase() {
    logInfo('🧹 Clearing existing data...');
    
    // Clear in reverse dependency order
    await QuizAttemptAnswer.destroy({ where: {} });
    await QuizAttempt.destroy({ where: {} });
    await QuizQuestion.destroy({ where: {} });
    await QuestionBankOption.destroy({ where: {} });
    await QuestionBankItem.destroy({ where: {} });
    await Quiz.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });
    
    logInfo('✅ Database cleared');
  }

  private async seedUsers() {
    logInfo(`👥 Creating ${this.config.users} users...`);
    
    const users = [];
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create admin users (10% of total)
    const adminCount = Math.floor(this.config.users * 0.1);
    for (let i = 0; i < adminCount; i++) {
      users.push({
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        eloRating: faker.number.int({ min: 1000, max: 2000 }),
        totalMatches: faker.number.int({ min: 0, max: 100 }),
        isActive: true,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: new Date()
      });
    }
    
    // Create faculty users (20% of total)
    const facultyCount = Math.floor(this.config.users * 0.2);
    for (let i = 0; i < facultyCount; i++) {
      users.push({
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        eloRating: faker.number.int({ min: 1200, max: 1800 }),
        totalMatches: faker.number.int({ min: 0, max: 50 }),
        isActive: true,
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: new Date()
      });
    }
    
    // Create student users (70% of total)
    const studentCount = this.config.users - adminCount - facultyCount;
    for (let i = 0; i < studentCount; i++) {
      users.push({
        username: faker.internet.username(),
        email: faker.internet.email(),
        passwordHash: hashedPassword,
        role: UserRole.PLAYER,
        eloRating: faker.number.int({ min: 800, max: 1600 }),
        totalMatches: faker.number.int({ min: 0, max: 200 }),
        isActive: faker.datatype.boolean(0.95), // 95% active
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: new Date()
      });
    }
    
    this.createdUsers = await User.bulkCreate(users);
    logInfo(`✅ Created ${this.createdUsers.length} users`);
  }

  private async seedCategories() {
    logInfo(`📚 Creating hierarchical category structure...`);
    
    const adminUser = this.createdUsers.find(u => u.role === UserRole.ADMIN);
    const creatorId = adminUser?.id || this.createdUsers[0].id;
    
    // Define hierarchical category structure
    const categoryHierarchy = [
      {
        name: 'Science',
        description: 'Natural and applied sciences',
        children: [
          {
            name: 'Mathematics',
            description: 'Pure and applied mathematics',
            children: [
              { name: 'Algebra', description: 'Algebraic structures and equations' },
              { name: 'Calculus', description: 'Differential and integral calculus' },
              { name: 'Geometry', description: 'Euclidean and non-Euclidean geometry' },
              { name: 'Statistics', description: 'Statistical analysis and probability' }
            ]
          },
          {
            name: 'Physics',
            description: 'Physical sciences and natural phenomena',
            children: [
              { name: 'Classical Mechanics', description: 'Newtonian physics and motion' },
              { name: 'Quantum Physics', description: 'Quantum mechanics and particle physics' },
              { name: 'Thermodynamics', description: 'Heat, energy, and entropy' }
            ]
          },
          {
            name: 'Chemistry',
            description: 'Chemical sciences and reactions',
            children: [
              { name: 'Organic Chemistry', description: 'Carbon-based compounds' },
              { name: 'Inorganic Chemistry', description: 'Non-organic compounds and elements' },
              { name: 'Physical Chemistry', description: 'Chemical physics and thermodynamics' }
            ]
          },
          {
            name: 'Biology',
            description: 'Life sciences and living organisms',
            children: [
              { name: 'Molecular Biology', description: 'Cellular and molecular processes' },
              { name: 'Ecology', description: 'Environmental biology and ecosystems' },
              { name: 'Genetics', description: 'Heredity and genetic variation' }
            ]
          }
        ]
      },
      {
        name: 'Technology',
        description: 'Computer science and information technology',
        children: [
          {
            name: 'Computer Science',
            description: 'Programming and computational theory',
            children: [
              { name: 'Algorithms', description: 'Data structures and algorithms' },
              { name: 'Web Development', description: 'Frontend and backend development' },
              { name: 'Database Systems', description: 'Database design and management' },
              { name: 'Machine Learning', description: 'AI and machine learning algorithms' }
            ]
          },
          {
            name: 'Engineering',
            description: 'Applied engineering disciplines',
            children: [
              { name: 'Software Engineering', description: 'Software development methodologies' },
              { name: 'Electrical Engineering', description: 'Electrical systems and circuits' },
              { name: 'Mechanical Engineering', description: 'Mechanical systems and design' }
            ]
          }
        ]
      },
      {
        name: 'Humanities',
        description: 'Liberal arts and social sciences',
        children: [
          {
            name: 'History',
            description: 'Historical events and civilizations',
            children: [
              { name: 'Ancient History', description: 'Ancient civilizations and cultures' },
              { name: 'Modern History', description: 'Recent historical events and periods' },
              { name: 'World History', description: 'Global historical perspectives' }
            ]
          },
          {
            name: 'Literature',
            description: 'Literary works and analysis',
            children: [
              { name: 'Classical Literature', description: 'Classical literary works' },
              { name: 'Modern Literature', description: 'Contemporary literary works' },
              { name: 'Poetry', description: 'Poetic forms and analysis' }
            ]
          },
          {
            name: 'Philosophy',
            description: 'Philosophical thought and ethics',
            children: [
              { name: 'Ethics', description: 'Moral philosophy and ethical systems' },
              { name: 'Logic', description: 'Logical reasoning and argumentation' },
              { name: 'Metaphysics', description: 'Nature of reality and existence' }
            ]
          }
        ]
      },
      {
        name: 'Business',
        description: 'Business and economics',
        children: [
          {
            name: 'Economics',
            description: 'Economic theory and analysis',
            children: [
              { name: 'Microeconomics', description: 'Individual and firm behavior' },
              { name: 'Macroeconomics', description: 'National and global economics' },
              { name: 'International Economics', description: 'Global trade and finance' }
            ]
          },
          {
            name: 'Management',
            description: 'Business management and strategy',
            children: [
              { name: 'Strategic Management', description: 'Business strategy and planning' },
              { name: 'Human Resources', description: 'Personnel management and development' },
              { name: 'Operations Management', description: 'Business operations and processes' }
            ]
          }
        ]
      }
    ];

    // Create categories hierarchically
    const allCategories: Category[] = [];
    
    for (const rootCat of categoryHierarchy) {
      // Create root category
      const rootCategory = await Category.create({
        name: rootCat.name,
        description: rootCat.description,
        parentId: null,
        isActive: true,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: new Date()
      });
      allCategories.push(rootCategory);
      
      // Create child categories
      for (const childCat of rootCat.children) {
        const childCategory = await Category.create({
          name: childCat.name,
          description: childCat.description,
          parentId: rootCategory.id,
          isActive: faker.datatype.boolean(0.95), // 95% active
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: new Date()
        });
        allCategories.push(childCategory);
        
        // Create grandchild categories if they exist
        if (childCat.children) {
          for (const grandchildCat of childCat.children) {
            const grandchildCategory = await Category.create({
              name: grandchildCat.name,
              description: grandchildCat.description,
              parentId: childCategory.id,
              isActive: faker.datatype.boolean(0.9), // 90% active
              createdAt: faker.date.past({ years: 1 }),
              updatedAt: new Date()
            });
            allCategories.push(grandchildCategory);
          }
        }
      }
    }
    
    this.createdCategories = allCategories;
    logInfo(`✅ Created ${this.createdCategories.length} hierarchical categories`);
    logInfo(`   - Root categories: ${categoryHierarchy.length}`);
    logInfo(`   - Total depth: 3 levels`);
  }

  private async seedQuestions() {
    logInfo(`❓ Creating ${this.config.categories * this.config.questionsPerCategory} questions...`);

    const questions = [];
    const options = [];
    
    for (const category of this.createdCategories) {
      for (let i = 0; i < this.config.questionsPerCategory; i++) {
        const facultyUsers = this.createdUsers.filter(u => u.role === UserRole.ADMIN);
        const creator = faker.helpers.arrayElement(facultyUsers);
        
        const question = {
          categoryId: category.id,
          createdById: creator.id,
          questionText: this.generateQuestionText(category.name),
          difficulty: faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']) as Difficulty,
          isActive: faker.datatype.boolean(0.95), // 95% active
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: new Date()
        };
        
        questions.push(question);
      }
    }
    
    this.createdQuestions = await QuestionBankItem.bulkCreate(questions);
    
    // Create options for each question
    for (const question of this.createdQuestions) {
      const questionOptions = [];
      const numOptions = faker.number.int({ min: 3, max: 5 });
      const correctOptionIndex = faker.number.int({ min: 0, max: numOptions - 1 });
      
      for (let i = 0; i < numOptions; i++) {
        questionOptions.push({
          questionId: question.id,
          optionText: faker.lorem.sentence(),
          isCorrect: i === correctOptionIndex,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      options.push(...questionOptions);
    }
    
    await QuestionBankOption.bulkCreate(options);
    logInfo(`✅ Created ${this.createdQuestions.length} questions with ${options.length} options`);
  }

  private async seedQuizzes() {
    logInfo(`📝 Creating ${this.config.categories * this.config.quizzesPerCategory} quizzes...`);
    
    const quizzes = [];
    
    for (const category of this.createdCategories) {
      for (let i = 0; i < this.config.quizzesPerCategory; i++) {
        const facultyUsers = this.createdUsers.filter(u => u.role === UserRole.ADMIN);
        const creator = faker.helpers.arrayElement(facultyUsers);
        
        quizzes.push({
          title: this.generateQuizTitle(category.name),
          description: faker.lorem.paragraph(),
          difficulty: faker.helpers.arrayElement(['EASY', 'MEDIUM', 'HARD']) as Difficulty,
          timeLimit: faker.number.int({ min: 300, max: 3600 }), // 5 minutes to 1 hour
          maxQuestions: this.config.questionsPerQuiz,
          categoryId: category.id,
          createdById: creator.id,
          isActive: faker.datatype.boolean(0.9), // 90% active
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: new Date()
        });
      }
    }
    
    this.createdQuizzes = await Quiz.bulkCreate(quizzes);
    logInfo(`✅ Created ${this.createdQuizzes.length} quizzes`);
  }

  private async assignQuestionsToQuizzes() {
    logInfo('🔗 Assigning questions to quizzes...');
    
    const assignments: any[] = [];
    
    for (const quiz of this.createdQuizzes) {
      // Get questions from the same category
      const categoryQuestions = this.createdQuestions.filter(q => q.categoryId === quiz.categoryId);
      
      if (categoryQuestions.length > 0) {
        // Randomly select questions for this quiz
        const selectedQuestions = faker.helpers.arrayElements(
          categoryQuestions, 
          Math.min(this.config.questionsPerQuiz, categoryQuestions.length)
        );
        
        selectedQuestions.forEach((question, index) => {
          assignments.push({
            quizId: quiz.id,
            questionId: question.id,
            order: index + 1,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      }
    }
    
    await QuizQuestion.bulkCreate(assignments);
    logInfo(`✅ Created ${assignments.length} question-quiz assignments`);
  }

  private async seedQuizAttempts() {
    logInfo(`🎯 Creating ${this.config.users * this.config.attemptsPerUser} quiz attempts...`);
    
    const attempts = [];
    const answers = [];
    
    const studentUsers = this.createdUsers.filter(u => u.role === UserRole.PLAYER);
    
    for (const user of studentUsers) {
      for (let i = 0; i < this.config.attemptsPerUser; i++) {
        const quiz = faker.helpers.arrayElement(this.createdQuizzes);
        const startTime = faker.date.past({ years: 1 });
        const endTime = faker.datatype.boolean(0.8) ? 
          faker.date.between({ from: startTime, to: new Date() }) : 
          null; // 80% completed, 20% in progress
        
        const score = endTime ? faker.number.int({ min: 0, max: 100 }) : null;
        const status = endTime ? 
          (faker.datatype.boolean(0.9) ? 'COMPLETED' : 'ABANDONED') as AttemptStatus :
          'IN_PROGRESS' as AttemptStatus;
        
        const attempt = {
          userId: user.id,
          quizId: quiz.id,
          status,
          score,
          startedAt: startTime,
          completedAt: endTime,
          createdAt: startTime,
          updatedAt: endTime || startTime
        };
        
        attempts.push(attempt);
      }
    }
    
    const createdAttempts = await QuizAttempt.bulkCreate(attempts);
    
    // Create answers for completed attempts
    for (const attempt of createdAttempts) {
      if (attempt.status === 'COMPLETED') {
        // Get quiz questions
        const quizQuestions = await QuizQuestion.findAll({
          where: { quizId: attempt.quizId },
          include: [{ 
            model: QuestionBankItem, 
            as: 'question',
            include: [{ model: QuestionBankOption, as: 'options' }]
          }]
        });
        
        for (const quizQuestion of quizQuestions) {
          if (quizQuestion.question?.options && quizQuestion.question.options.length > 0) {
            // Randomly select an answer (80% chance of correct answer)
            const isCorrect = faker.datatype.boolean(0.8);
            let selectedOption;
            
            if (isCorrect) {
              selectedOption = quizQuestion.question.options.find(opt => opt.isCorrect);
            } else {
              const incorrectOptions = quizQuestion.question.options.filter(opt => !opt.isCorrect);
              selectedOption = faker.helpers.arrayElement(incorrectOptions);
            }
            
            if (selectedOption) {
              answers.push({
                attemptId: attempt.id,
                questionId: quizQuestion.question.id,
                selectedOptionId: selectedOption.id,
                isCorrect,
                timeSpent: faker.number.int({ min: 10, max: 300 }), // 10 seconds to 5 minutes
                createdAt: faker.date.between({ 
                  from: attempt.startedAt!, 
                  to: attempt.completedAt || new Date() 
                }),
                updatedAt: new Date()
              });
            }
          }
        }
      }
    }
    
    if (answers.length > 0) {
      await QuizAttemptAnswer.bulkCreate(answers);
    }
    
    logInfo(`✅ Created ${createdAttempts.length} quiz attempts with ${answers.length} answers`);
  }

  private generateQuestionText(categoryName: string): string {
    const questionTypes = [
      `What is the main concept of ${faker.lorem.word()} in ${categoryName}?`,
      `Which of the following best describes ${faker.lorem.word()} in ${categoryName}?`,
      `How does ${faker.lorem.word()} relate to ${faker.lorem.word()} in ${categoryName}?`,
      `What are the key principles of ${faker.lorem.word()} in ${categoryName}?`,
      `Which statement about ${faker.lorem.word()} in ${categoryName} is correct?`
    ];
    
    return faker.helpers.arrayElement(questionTypes);
  }

  private generateQuizTitle(categoryName: string): string {
    const titleFormats = [
      `${categoryName} Fundamentals Quiz`,
      `Advanced ${categoryName} Test`,
      `${categoryName} Knowledge Assessment`,
      `${categoryName} Mastery Challenge`,
      `Introduction to ${categoryName}`,
      `${categoryName} Concepts Review`,
      `${categoryName} Skills Evaluation`
    ];
    
    return faker.helpers.arrayElement(titleFormats);
  }

  private async printSummary() {
    const userCount = await User.count();
    const categoryCount = await Category.count();
    const questionCount = await QuestionBankItem.count();
    const optionCount = await QuestionBankOption.count();
    const quizCount = await Quiz.count();
    const assignmentCount = await QuizQuestion.count();
    const attemptCount = await QuizAttempt.count();
    const answerCount = await QuizAttemptAnswer.count();
    
    logInfo('📊 SEEDING SUMMARY:', {
      users: userCount,
      categories: categoryCount,
      questions: questionCount,
      options: optionCount,
      quizzes: quizCount,
      questionAssignments: assignmentCount,
      quizAttempts: attemptCount,
      answers: answerCount,
      totalRecords: userCount + categoryCount + questionCount + optionCount + 
                   quizCount + assignmentCount + attemptCount + answerCount
    });
  }
}

// Export for use in other files
export { MassiveSeeder, DEFAULT_CONFIG };

// CLI execution
if (require.main === module) {
  const runSeeder = async () => {
    try {
      // Custom config for even more data
      const MASSIVE_CONFIG: SeederConfig = {
        users: 1000,           // 1,000 users
        categories: 30,        // 30 categories  
        questionsPerCategory: 150, // 150 questions per category = 4,500 questions
        quizzesPerCategory: 25,    // 25 quizzes per category = 750 quizzes
        attemptsPerUser: 20,       // 20 attempts per user = 20,000 attempts
        questionsPerQuiz: 12       // 12 questions per quiz
      };
      
      const seeder = new MassiveSeeder(MASSIVE_CONFIG);
      await seeder.seed();
      
      console.log('🎉 MASSIVE seeding completed! Database is now loaded with tons of data.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  };
  
  runSeeder();
}

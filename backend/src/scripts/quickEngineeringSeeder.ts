import { 
  User, 
  Category, 
  QuestionBankItem, 
  QuestionBankOption, 
  Quiz, 
  QuizQuestion,
  sequelize,
  UserRole,
  Difficulty
} from '../models';

async function seedEngineeringData() {
  try {
    console.log('🚀 Starting Engineering Database Seeding...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // 1. Clear existing data in correct order to avoid foreign key constraints
    console.log('🧹 Clearing existing data...');
    
    // Import additional models for proper cleanup
    const { QuizAttempt, QuizAttemptAnswer } = await import('../models');
    
    // Clear in reverse dependency order
    await QuizAttemptAnswer.destroy({ where: {} });
    await QuizAttempt.destroy({ where: {} });
    await QuizQuestion.destroy({ where: {} });
    await QuestionBankOption.destroy({ where: {} });
    await QuestionBankItem.destroy({ where: {} });
    await Quiz.destroy({ where: {} });
    await Category.destroy({ where: {} });
    await User.destroy({ where: {} });
    console.log('✅ Existing data cleared\n');
    
    // 2. Create users with password 1234567890
    console.log('👥 Creating users...');
    const admin = await User.create({
      username: 'admin',
      email: 'admin@engineering.edu',
      passwordHash: '1234567890', // Fixed password as requested
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true
    });
    
    const student = await User.create({
      username: 'student',
      email: 'student@engineering.edu',
      passwordHash: '1234567890', // Fixed password as requested
      firstName: 'Test',
      lastName: 'Student',
      role: UserRole.PLAYER,
      isActive: true
    });
    console.log('✅ Users created with password: 1234567890\n');
    
    // 3. Create B.Tech Engineering categories
    console.log('📚 Creating B.Tech Engineering categories...');
    
    // Root category
    const engineeringRoot = await Category.create({
      name: 'B.Tech Engineering',
      description: 'Bachelor of Technology Engineering Programs',
      parentId: null,
      isActive: true
    });
    
    // CSE Branch
    const cseCategory = await Category.create({
      name: 'Computer Science & Engineering',
      description: 'CSE Core Subjects',
      parentId: engineeringRoot.id,
      isActive: true
    });
    
    const programmingCategory = await Category.create({
      name: 'Programming Languages',
      description: 'Programming languages and syntax',
      parentId: cseCategory.id,
      isActive: true
    });
    
    const cProgrammingCategory = await Category.create({
      name: 'C Programming',
      description: 'C language fundamentals',
      parentId: programmingCategory.id,
      isActive: true
    });
    
    const javaCategory = await Category.create({
      name: 'Java Programming',
      description: 'Java and OOP concepts',
      parentId: programmingCategory.id,
      isActive: true
    });
    
    // IT Branch
    const itCategory = await Category.create({
      name: 'Information Technology',
      description: 'IT Core Subjects',
      parentId: engineeringRoot.id,
      isActive: true
    });
    
    const webDevCategory = await Category.create({
      name: 'Web Development',
      description: 'Frontend and Backend Technologies',
      parentId: itCategory.id,
      isActive: true
    });
    
    // AIML Branch
    const aimlCategory = await Category.create({
      name: 'Artificial Intelligence & Machine Learning',
      description: 'AI/ML Core Subjects',
      parentId: engineeringRoot.id,
      isActive: true
    });
    
    const mlCategory = await Category.create({
      name: 'Machine Learning',
      description: 'ML Algorithms and Concepts',
      parentId: aimlCategory.id,
      isActive: true
    });
    
    console.log('✅ Categories created\n');
    
    // 4. Create English Engineering Questions
    console.log('❓ Creating English engineering questions...');
    
    // C Programming Questions
    const cQuestions = [
      {
        questionText: "What is the correct syntax to declare a pointer in C?",
        difficulty: "EASY" as Difficulty,
        categoryId: cProgrammingCategory.id,
        options: [
          { text: "int *ptr;", correct: true },
          { text: "int ptr*;", correct: false },
          { text: "pointer int ptr;", correct: false },
          { text: "*int ptr;", correct: false }
        ]
      },
      {
        questionText: "Which function is used to allocate memory dynamically in C?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: cProgrammingCategory.id,
        options: [
          { text: "alloc()", correct: false },
          { text: "malloc()", correct: true },
          { text: "calloc()", correct: false },
          { text: "realloc()", correct: false }
        ]
      },
      {
        questionText: "What does the 'sizeof' operator return in C?",
        difficulty: "EASY" as Difficulty,
        categoryId: cProgrammingCategory.id,
        options: [
          { text: "Size of variable in bits", correct: false },
          { text: "Size of variable in bytes", correct: true },
          { text: "Address of variable", correct: false },
          { text: "Value of variable", correct: false }
        ]
      },
      {
        questionText: "Which of the following is NOT a valid C data type?",
        difficulty: "EASY" as Difficulty,
        categoryId: cProgrammingCategory.id,
        options: [
          { text: "int", correct: false },
          { text: "float", correct: false },
          { text: "string", correct: true },
          { text: "char", correct: false }
        ]
      },
      {
        questionText: "What is the output of printf(\"%d\", sizeof(int)) on a 32-bit system?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: cProgrammingCategory.id,
        options: [
          { text: "2", correct: false },
          { text: "4", correct: true },
          { text: "8", correct: false },
          { text: "1", correct: false }
        ]
      }
    ];
    
    // Java Programming Questions
    const javaQuestions = [
      {
        questionText: "Which principle of OOP is achieved by using access modifiers in Java?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: javaCategory.id,
        options: [
          { text: "Inheritance", correct: false },
          { text: "Polymorphism", correct: false },
          { text: "Encapsulation", correct: true },
          { text: "Abstraction", correct: false }
        ]
      },
      {
        questionText: "What is the default value of a boolean variable in Java?",
        difficulty: "EASY" as Difficulty,
        categoryId: javaCategory.id,
        options: [
          { text: "true", correct: false },
          { text: "false", correct: true },
          { text: "0", correct: false },
          { text: "null", correct: false }
        ]
      },
      {
        questionText: "Which method is called when an object is created in Java?",
        difficulty: "EASY" as Difficulty,
        categoryId: javaCategory.id,
        options: [
          { text: "main()", correct: false },
          { text: "constructor", correct: true },
          { text: "init()", correct: false },
          { text: "start()", correct: false }
        ]
      },
      {
        questionText: "What does JVM stand for?",
        difficulty: "EASY" as Difficulty,
        categoryId: javaCategory.id,
        options: [
          { text: "Java Virtual Machine", correct: true },
          { text: "Java Variable Method", correct: false },
          { text: "Java Verified Module", correct: false },
          { text: "Java Version Manager", correct: false }
        ]
      },
      {
        questionText: "Which keyword is used to inherit a class in Java?",
        difficulty: "EASY" as Difficulty,
        categoryId: javaCategory.id,
        options: [
          { text: "inherits", correct: false },
          { text: "extends", correct: true },
          { text: "implements", correct: false },
          { text: "super", correct: false }
        ]
      }
    ];
    
    // Machine Learning Questions
    const mlQuestions = [
      {
        questionText: "Which algorithm is commonly used for binary classification?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: mlCategory.id,
        options: [
          { text: "K-means", correct: false },
          { text: "Logistic Regression", correct: true },
          { text: "DBSCAN", correct: false },
          { text: "PCA", correct: false }
        ]
      },
      {
        questionText: "What is overfitting in machine learning?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: mlCategory.id,
        options: [
          { text: "Model performs well on training but poor on test data", correct: true },
          { text: "Model performs poorly on both training and test data", correct: false },
          { text: "Model takes too long to train", correct: false },
          { text: "Model uses too much memory", correct: false }
        ]
      },
      {
        questionText: "Which metric is best for evaluating a classification model with imbalanced data?",
        difficulty: "HARD" as Difficulty,
        categoryId: mlCategory.id,
        options: [
          { text: "Accuracy", correct: false },
          { text: "Precision", correct: false },
          { text: "F1-Score", correct: true },
          { text: "Mean Squared Error", correct: false }
        ]
      }
    ];
    
    // Web Development Questions
    const webQuestions = [
      {
        questionText: "What does HTML stand for?",
        difficulty: "EASY" as Difficulty,
        categoryId: webDevCategory.id,
        options: [
          { text: "Hyper Text Markup Language", correct: true },
          { text: "High Tech Modern Language", correct: false },
          { text: "Home Tool Markup Language", correct: false },
          { text: "Hyperlink and Text Markup Language", correct: false }
        ]
      },
      {
        questionText: "Which HTTP method is used to retrieve data from a server?",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: webDevCategory.id,
        options: [
          { text: "POST", correct: false },
          { text: "GET", correct: true },
          { text: "PUT", correct: false },
          { text: "DELETE", correct: false }
        ]
      }
    ];
    
    // Combine all questions
    const allQuestions = [...cQuestions, ...javaQuestions, ...mlQuestions, ...webQuestions];
    
    // Create questions and options
    const createdQuestions = [];
    for (const q of allQuestions) {
      const question = await QuestionBankItem.create({
        questionText: q.questionText,
        difficulty: q.difficulty,
        categoryId: q.categoryId,
        createdById: admin.id
      });
      createdQuestions.push(question);
      
      // Create exactly 4 options for each question
      for (const option of q.options) {
        await QuestionBankOption.create({
          questionId: question.id,
          optionText: option.text,
          isCorrect: option.correct
        });
      }
    }
    
    console.log(`✅ Created ${createdQuestions.length} questions with 4 options each\n`);
    
    // 5. Create quizzes
    console.log('📋 Creating quizzes...');
    
    const quizzes = [
      {
        title: "C Programming Fundamentals",
        description: "Basic C programming concepts and syntax",
        difficulty: "EASY" as Difficulty,
        categoryId: cProgrammingCategory.id,
        timeLimit: 30
      },
      {
        title: "Java OOP Concepts",
        description: "Object-oriented programming with Java",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: javaCategory.id,
        timeLimit: 30
      },
      {
        title: "Machine Learning Basics",
        description: "Fundamental ML algorithms and concepts",
        difficulty: "MEDIUM" as Difficulty,
        categoryId: mlCategory.id,
        timeLimit: 30
      },
      {
        title: "Web Development Essentials",
        description: "HTML, CSS, and web technologies",
        difficulty: "EASY" as Difficulty,
        categoryId: webDevCategory.id,
        timeLimit: 30
      }
    ];
    
    const createdQuizzes = [];
    for (const quiz of quizzes) {
      const createdQuiz = await Quiz.create({
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        maxQuestions: 5,
        categoryId: quiz.categoryId,
        createdById: admin.id,
        isActive: true
      });
      createdQuizzes.push(createdQuiz);
    }
    
    console.log(`✅ Created ${createdQuizzes.length} quizzes\n`);
    
    // 6. Assign questions to quizzes
    console.log('🔗 Assigning questions to quizzes...');
    
    let assignmentCount = 0;
    for (const quiz of createdQuizzes) {
      // Get questions from the same category as the quiz
      const categoryQuestions = createdQuestions.filter(q => q.categoryId === quiz.categoryId);
      
      // Assign up to 5 questions per quiz
      const questionsToAssign = categoryQuestions.slice(0, Math.min(5, categoryQuestions.length));
      
      for (let i = 0; i < questionsToAssign.length; i++) {
        await QuizQuestion.create({
          quizId: quiz.id,
          questionId: questionsToAssign[i].id,
          order: i + 1
        });
        assignmentCount++;
      }
    }
    
    console.log(`✅ Created ${assignmentCount} question-quiz assignments\n`);
    
    // 7. Print summary
    const userCount = await User.count();
    const categoryCount = await Category.count();
    const questionCount = await QuestionBankItem.count();
    const optionCount = await QuestionBankOption.count();
    const quizCount = await Quiz.count();
    const assignmentCountFinal = await QuizQuestion.count();
    
    console.log('\n📊 ENGINEERING SEEDING SUMMARY:');
    console.log(`   👥 Users: ${userCount} (admin/student with password: 1234567890)`);
    console.log(`   📚 Categories: ${categoryCount} (B.Tech Engineering hierarchy)`);
    console.log(`   ❓ Questions: ${questionCount} (English engineering questions)`);
    console.log(`   📝 Options: ${optionCount} (exactly 4 per question)`);
    console.log(`   📋 Quizzes: ${quizCount} (CSE/IT/AIML topics)`);
    console.log(`   🔗 Assignments: ${assignmentCountFinal} (questions assigned to quizzes)`);
    console.log(`   📊 Total Records: ${userCount + categoryCount + questionCount + optionCount + quizCount + assignmentCountFinal}`);
    
    console.log('\n🎉 Engineering Database seeding completed successfully!');
    console.log('💾 Your database now has proper English B.Tech questions');
    console.log('🔑 Login credentials: admin/student with password: 1234567890');
    console.log('✅ All questions have exactly 4 options each');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run the seeder
seedEngineeringData()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

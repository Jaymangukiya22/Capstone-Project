import { 
  User, 
  Category, 
  QuestionBankItem, 
  QuestionBankOption, 
  Quiz, 
  QuizQuestion,
  QuizAttempt, 
  QuizAttemptAnswer,
  sequelize,
  UserRole,
  Difficulty,
  AttemptStatus
} from '../models';
import { logInfo, logError } from '../utils/logger';
import * as bcrypt from 'bcrypt';

// Engineering Categories Structure
const ENGINEERING_CATEGORIES = [
  {
    name: "Computer Science & Engineering",
    description: "Core Computer Science and Engineering subjects",
    children: [
      {
        name: "Programming Languages",
        description: "Programming languages and syntax",
        children: [
          { name: "C Programming", description: "C language fundamentals and advanced concepts" },
          { name: "C++ Programming", description: "Object-oriented programming with C++" },
          { name: "Java Programming", description: "Java language and OOP concepts" },
          { name: "Python Programming", description: "Python programming and applications" },
          { name: "JavaScript", description: "JavaScript for web development" },
          { name: "TypeScript", description: "TypeScript for type-safe development" }
        ]
      },
      {
        name: "Data Structures & Algorithms",
        description: "Core DSA concepts and problem solving",
        children: [
          { name: "Arrays & Strings", description: "Array and string manipulation" },
          { name: "Linked Lists", description: "Linear data structures" },
          { name: "Stacks & Queues", description: "LIFO and FIFO data structures" },
          { name: "Trees & Graphs", description: "Hierarchical and network data structures" },
          { name: "Sorting Algorithms", description: "Various sorting techniques" },
          { name: "Searching Algorithms", description: "Linear and binary search methods" }
        ]
      },
      {
        name: "Database Management",
        description: "Database concepts and management systems",
        children: [
          { name: "SQL Fundamentals", description: "Structured Query Language basics" },
          { name: "Database Design", description: "ER diagrams and normalization" },
          { name: "RDBMS Concepts", description: "Relational database management" },
          { name: "NoSQL Databases", description: "MongoDB, Redis, and document stores" },
          { name: "Database Optimization", description: "Query optimization and indexing" }
        ]
      },
      {
        name: "Web Development",
        description: "Frontend and backend web technologies",
        children: [
          { name: "HTML & CSS", description: "Web markup and styling" },
          { name: "React.js", description: "Frontend JavaScript library" },
          { name: "Node.js", description: "Server-side JavaScript runtime" },
          { name: "Express.js", description: "Web application framework" },
          { name: "REST APIs", description: "RESTful web services" }
        ]
      }
    ]
  },
  {
    name: "Artificial Intelligence & Machine Learning",
    description: "AI/ML concepts and applications",
    children: [
      {
        name: "Machine Learning Fundamentals",
        description: "Core ML concepts and algorithms",
        children: [
          { name: "Supervised Learning", description: "Classification and regression" },
          { name: "Unsupervised Learning", description: "Clustering and dimensionality reduction" },
          { name: "Neural Networks", description: "Perceptrons and deep learning basics" },
          { name: "Model Evaluation", description: "Metrics and validation techniques" }
        ]
      },
      {
        name: "Deep Learning",
        description: "Advanced neural network architectures",
        children: [
          { name: "CNN", description: "Convolutional Neural Networks" },
          { name: "RNN & LSTM", description: "Recurrent Neural Networks" },
          { name: "Transformers", description: "Attention mechanisms and transformers" },
          { name: "Computer Vision", description: "Image processing and recognition" }
        ]
      },
      {
        name: "Natural Language Processing",
        description: "Text processing and language understanding",
        children: [
          { name: "Text Preprocessing", description: "Tokenization and cleaning" },
          { name: "Sentiment Analysis", description: "Opinion mining and classification" },
          { name: "Language Models", description: "N-grams and transformer models" }
        ]
      }
    ]
  },
  {
    name: "Information Technology",
    description: "IT infrastructure and systems",
    children: [
      {
        name: "Network Security",
        description: "Cybersecurity and network protection",
        children: [
          { name: "Cryptography", description: "Encryption and security protocols" },
          { name: "Network Protocols", description: "TCP/IP, HTTP, and security protocols" },
          { name: "Ethical Hacking", description: "Penetration testing and security auditing" }
        ]
      },
      {
        name: "Cloud Computing",
        description: "Cloud platforms and services",
        children: [
          { name: "AWS Services", description: "Amazon Web Services" },
          { name: "Docker & Kubernetes", description: "Containerization and orchestration" },
          { name: "Microservices", description: "Distributed system architecture" }
        ]
      }
    ]
  },
  {
    name: "Big Data & Analytics",
    description: "Big data processing and analytics",
    children: [
      {
        name: "Big Data Technologies",
        description: "Tools and frameworks for big data",
        children: [
          { name: "Hadoop Ecosystem", description: "HDFS, MapReduce, and Hive" },
          { name: "Apache Spark", description: "In-memory data processing" },
          { name: "Apache Kafka", description: "Stream processing and messaging" }
        ]
      },
      {
        name: "Data Analytics",
        description: "Data analysis and visualization",
        children: [
          { name: "Statistical Analysis", description: "Descriptive and inferential statistics" },
          { name: "Data Visualization", description: "Charts, graphs, and dashboards" },
          { name: "Business Intelligence", description: "BI tools and reporting" }
        ]
      }
    ]
  }
];

// Engineering Questions Database
const ENGINEERING_QUESTIONS = [
  // C Programming Questions
  {
    category: "C Programming",
    questions: [
      {
        questionText: "What is the correct syntax to declare a pointer in C?",
        difficulty: "EASY" as Difficulty,
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
        options: [
          { text: "alloc()", correct: false },
          { text: "malloc()", correct: true },
          { text: "calloc()", correct: false },
          { text: "Both malloc() and calloc()", correct: false }
        ]
      },
      {
        questionText: "What does the 'sizeof' operator return in C?",
        difficulty: "EASY" as Difficulty,
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
        options: [
          { text: "int", correct: false },
          { text: "float", correct: false },
          { text: "string", correct: true },
          { text: "char", correct: false }
        ]
      }
    ]
  },
  // Java Programming Questions
  {
    category: "Java Programming",
    questions: [
      {
        questionText: "Which principle of OOP is achieved by using access modifiers in Java?",
        difficulty: "MEDIUM" as Difficulty,
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
        options: [
          { text: "Java Virtual Machine", correct: true },
          { text: "Java Variable Method", correct: false },
          { text: "Java Verified Module", correct: false },
          { text: "Java Version Manager", correct: false }
        ]
      }
    ]
  },
  // Data Structures Questions
  {
    category: "Arrays & Strings",
    questions: [
      {
        questionText: "What is the time complexity of accessing an element in an array by index?",
        difficulty: "EASY" as Difficulty,
        options: [
          { text: "O(1)", correct: true },
          { text: "O(n)", correct: false },
          { text: "O(log n)", correct: false },
          { text: "O(n²)", correct: false }
        ]
      },
      {
        questionText: "Which of the following is the best algorithm to sort an array of integers?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "Bubble Sort", correct: false },
          { text: "Selection Sort", correct: false },
          { text: "Quick Sort", correct: true },
          { text: "Insertion Sort", correct: false }
        ]
      },
      {
        questionText: "What is the space complexity of merge sort?",
        difficulty: "HARD" as Difficulty,
        options: [
          { text: "O(1)", correct: false },
          { text: "O(log n)", correct: false },
          { text: "O(n)", correct: true },
          { text: "O(n log n)", correct: false }
        ]
      }
    ]
  },
  // Database Questions
  {
    category: "SQL Fundamentals",
    questions: [
      {
        questionText: "Which SQL command is used to retrieve data from a database?",
        difficulty: "EASY" as Difficulty,
        options: [
          { text: "GET", correct: false },
          { text: "SELECT", correct: true },
          { text: "RETRIEVE", correct: false },
          { text: "FETCH", correct: false }
        ]
      },
      {
        questionText: "What does ACID stand for in database management?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "Atomicity, Consistency, Isolation, Durability", correct: true },
          { text: "Access, Control, Integration, Data", correct: false },
          { text: "Automatic, Consistent, Independent, Durable", correct: false },
          { text: "Atomic, Concurrent, Isolated, Distributed", correct: false }
        ]
      },
      {
        questionText: "Which normal form eliminates partial dependencies?",
        difficulty: "HARD" as Difficulty,
        options: [
          { text: "1NF", correct: false },
          { text: "2NF", correct: true },
          { text: "3NF", correct: false },
          { text: "BCNF", correct: false }
        ]
      }
    ]
  },
  // Machine Learning Questions
  {
    category: "Supervised Learning",
    questions: [
      {
        questionText: "Which algorithm is commonly used for binary classification?",
        difficulty: "MEDIUM" as Difficulty,
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
        options: [
          { text: "Accuracy", correct: false },
          { text: "Precision", correct: false },
          { text: "F1-Score", correct: true },
          { text: "Mean Squared Error", correct: false }
        ]
      }
    ]
  },
  // Web Development Questions
  {
    category: "React.js",
    questions: [
      {
        questionText: "What is JSX in React?",
        difficulty: "EASY" as Difficulty,
        options: [
          { text: "JavaScript XML", correct: true },
          { text: "Java Syntax Extension", correct: false },
          { text: "JSON Extended", correct: false },
          { text: "JavaScript Extension", correct: false }
        ]
      },
      {
        questionText: "Which hook is used to manage state in functional components?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "useEffect", correct: false },
          { text: "useState", correct: true },
          { text: "useContext", correct: false },
          { text: "useReducer", correct: false }
        ]
      },
      {
        questionText: "What is the virtual DOM in React?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "A copy of the real DOM kept in memory", correct: true },
          { text: "A new HTML standard", correct: false },
          { text: "A CSS framework", correct: false },
          { text: "A JavaScript library", correct: false }
        ]
      }
    ]
  },
  // Network Security Questions
  {
    category: "Cryptography",
    questions: [
      {
        questionText: "What type of encryption uses the same key for encryption and decryption?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "Asymmetric encryption", correct: false },
          { text: "Symmetric encryption", correct: true },
          { text: "Hash encryption", correct: false },
          { text: "Digital signature", correct: false }
        ]
      },
      {
        questionText: "Which protocol provides secure communication over the internet?",
        difficulty: "EASY" as Difficulty,
        options: [
          { text: "HTTP", correct: false },
          { text: "HTTPS", correct: true },
          { text: "FTP", correct: false },
          { text: "SMTP", correct: false }
        ]
      }
    ]
  },
  // Big Data Questions
  {
    category: "Apache Spark",
    questions: [
      {
        questionText: "What is the main advantage of Apache Spark over Hadoop MapReduce?",
        difficulty: "MEDIUM" as Difficulty,
        options: [
          { text: "Better security", correct: false },
          { text: "In-memory processing", correct: true },
          { text: "Smaller file size", correct: false },
          { text: "Easier installation", correct: false }
        ]
      },
      {
        questionText: "What is an RDD in Apache Spark?",
        difficulty: "HARD" as Difficulty,
        options: [
          { text: "Resilient Distributed Dataset", correct: true },
          { text: "Rapid Data Distribution", correct: false },
          { text: "Real-time Data Delivery", correct: false },
          { text: "Relational Database Driver", correct: false }
        ]
      }
    ]
  }
];

export class EngineeringSeeder {
  async run() {
    try {
      console.log('🚀 Starting Engineering Database Seeding...\n');
      
      // 1. Clear existing data
      await this.clearExistingData();
      
      // 2. Create users
      const users = await this.createUsers();
      
      // 3. Create category hierarchy
      const categories = await this.createCategoryHierarchy();
      
      // 4. Create questions and options
      const { questions, options } = await this.createQuestionsAndOptions(categories, users);
      
      // 5. Create quizzes
      const quizzes = await this.createQuizzes(categories, users);
      
      // 6. Assign questions to quizzes
      await this.assignQuestionsToQuizzes(quizzes, questions);
      
      // 7. Create sample quiz attempts
      await this.createSampleAttempts(users, quizzes);
      
      // 8. Print summary
      await this.printSummary();
      
      console.log('\n🎉 Engineering Database seeding completed successfully!');
      console.log('💾 Your database is now loaded with B.Tech Engineering questions');
      console.log('✅ All questions are in English with proper technical content');
      
    } catch (error) {
      logError('Seeding failed', error as Error);
      throw error;
    }
  }

  private async clearExistingData() {
    console.log('🧹 Clearing existing data...');
    
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
  }

  private async createUsers() {
    console.log('👥 Creating users...');
     // Hash the password once to avoid re-hashing the same string repeatedly
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('1234567890', saltRounds);
    const users = [];
    
    // Create admin users
    for (let i = 1; i <= 5; i++) {
      users.push({
        username: `admin${i}`,
        email: `admin${i}@engineering.edu`,
        passwordHash: hashedPassword,
        firstName: `Admin`,
        lastName: `User ${i}`,
        role: UserRole.ADMIN,
        isActive: true
      });
    }
    
    // Create student users
    const studentNames = [
      'Arjun Sharma', 'Priya Patel', 'Rahul Kumar', 'Sneha Singh', 'Vikram Reddy',
      'Ananya Gupta', 'Karthik Nair', 'Divya Iyer', 'Rohit Agarwal', 'Meera Joshi',
      'Siddharth Roy', 'Kavya Menon', 'Aditya Verma', 'Riya Bansal', 'Harsh Malhotra',
      'Pooja Sinha', 'Nikhil Pandey', 'Shreya Kapoor', 'Varun Saxena', 'Isha Tiwari'
    ];
    
    studentNames.forEach((name, index) => {
      const [firstName, lastName] = name.split(' ');
      users.push({
        username: `student${index + 1}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@student.edu`,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        role: UserRole.PLAYER,
        isActive: true
      });
    });
    
    const createdUsers = await User.bulkCreate(users);
    console.log(`✅ Created ${createdUsers.length} users (5 admins, ${studentNames.length} students)\n`);
    
    return createdUsers;
  }

  private async createCategoryHierarchy() {
    console.log('📚 Creating engineering category hierarchy...');
    
    const categories = new Map<string, any>();
    
    // Create root categories
    for (const rootCat of ENGINEERING_CATEGORIES) {
      const category = await Category.create({
        name: rootCat.name,
        description: rootCat.description,
        parentId: null,
        isActive: true
      });
      categories.set(rootCat.name, category);
      
      // Create subcategories
      for (const subCat of rootCat.children) {
        const subCategory = await Category.create({
          name: subCat.name,
          description: subCat.description,
          parentId: category.id,
          isActive: true
        });
        categories.set(subCat.name, subCategory);
        
        // Create sub-subcategories
        if (subCat.children) {
          for (const subSubCat of subCat.children) {
            const subSubCategory = await Category.create({
              name: subSubCat.name,
              description: subSubCat.description,
              parentId: subCategory.id,
              isActive: true
            });
            categories.set(subSubCat.name, subSubCategory);
          }
        }
      }
    }
    
    console.log(`✅ Created ${categories.size} categories with proper hierarchy\n`);
    return categories;
  }

  private async createQuestionsAndOptions(categories: Map<string, any>, users: any[]) {
    console.log('❓ Creating engineering questions and options...');
    
    const questions = [];
    const options = [];
    const adminUsers = users.filter(u => u.role === UserRole.ADMIN);
    const firstAdminId = adminUsers.length > 0 ? adminUsers[0].id : users[0].id;
    
    for (const questionSet of ENGINEERING_QUESTIONS) {
      const category = categories.get(questionSet.category);
      if (!category) {
        console.warn(`⚠️ Category not found: ${questionSet.category}`);
        continue;
      }
      
      for (const q of questionSet.questions) {
        const question = await QuestionBankItem.create({
          questionText: q.questionText,
          difficulty: q.difficulty,
          categoryId: category.id,
          createdById: firstAdminId
        });
        questions.push(question);
        
        // Create exactly 4 options for each question
        for (let i = 0; i < 4; i++) {
          if (q.options[i]) {
            const option = await QuestionBankOption.create({
              questionId: question.id,
              optionText: q.options[i].text,
              isCorrect: q.options[i].correct
            });
            options.push(option);
          }
        }
      }
    }
    
    console.log(`✅ Created ${questions.length} questions with ${options.length} options (4 per question)\n`);
    return { questions, options };
  }

  private async createQuizzes(categories: Map<string, any>, users: any[]) {
    console.log('📋 Creating engineering quizzes...');
    
    const quizzes = [];
    const adminUsers = users.filter(u => u.role === UserRole.ADMIN);
    
    const quizTemplates = [
      { name: "C Programming Fundamentals", category: "C Programming", difficulty: "EASY" },
      { name: "Advanced C Programming", category: "C Programming", difficulty: "MEDIUM" },
      { name: "Java OOP Concepts", category: "Java Programming", difficulty: "MEDIUM" },
      { name: "Java Advanced Topics", category: "Java Programming", difficulty: "HARD" },
      { name: "Data Structures Basics", category: "Arrays & Strings", difficulty: "EASY" },
      { name: "Algorithm Analysis", category: "Arrays & Strings", difficulty: "HARD" },
      { name: "SQL Query Writing", category: "SQL Fundamentals", difficulty: "MEDIUM" },
      { name: "Database Design Principles", category: "SQL Fundamentals", difficulty: "HARD" },
      { name: "Machine Learning Basics", category: "Supervised Learning", difficulty: "MEDIUM" },
      { name: "ML Model Evaluation", category: "Supervised Learning", difficulty: "HARD" },
      { name: "React Development", category: "React.js", difficulty: "MEDIUM" },
      { name: "React Advanced Patterns", category: "React.js", difficulty: "HARD" },
      { name: "Network Security Fundamentals", category: "Cryptography", difficulty: "MEDIUM" },
      { name: "Big Data Processing", category: "Apache Spark", difficulty: "HARD" }
    ];
    
    for (const template of quizTemplates) {
      const category = categories.get(template.category);
      if (category) {
        const quiz = await Quiz.create({
          title: template.name,
          description: `Comprehensive ${template.name} quiz covering key concepts and practical applications`,
          difficulty: template.difficulty as Difficulty,
          timeLimit: 30, // 30 seconds per question
          maxQuestions: 10,
          categoryId: category.id,
          createdById: adminUsers[Math.floor(Math.random() * adminUsers.length)].id,
          isActive: true
        });
        quizzes.push(quiz);
      }
    }
    
    console.log(`✅ Created ${quizzes.length} engineering quizzes\n`);
    return quizzes;
  }

  private async assignQuestionsToQuizzes(quizzes: any[], questions: any[]) {
    console.log('🔗 Assigning questions to quizzes...');
    
    const assignments: Array<{quizId: number, questionId: number, order: number}> = [];
    
    for (const quiz of quizzes) {
      // Get questions from the same category as the quiz
      const categoryQuestions = questions.filter(q => q.categoryId === quiz.categoryId);
      
      // Assign up to 10 questions per quiz
      const questionsToAssign = categoryQuestions.slice(0, Math.min(10, categoryQuestions.length));
      
      questionsToAssign.forEach((question, index) => {
        assignments.push({
          quizId: quiz.id,
          questionId: question.id,
          order: index + 1
        });
      });
    }
    
    await QuizQuestion.bulkCreate(assignments);
    console.log(`✅ Created ${assignments.length} question-quiz assignments\n`);
  }

  private async createSampleAttempts(users: any[], quizzes: any[]) {
    console.log('🎯 Creating sample quiz attempts...');
    
    const studentUsers = users.filter(u => u.role === UserRole.PLAYER);
    const attempts = [];
    
    // Create 50 sample attempts
    for (let i = 0; i < 50; i++) {
      const user = studentUsers[Math.floor(Math.random() * studentUsers.length)];
      const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
      
      const attempt = await QuizAttempt.create({
        userId: user.id,
        quizId: quiz.id,
        status: AttemptStatus.COMPLETED,
        score: Math.floor(Math.random() * 101), // 0-100
        correctAnswers: Math.floor(Math.random() * 11), // 0-10
        totalQuestions: 10,
        timeSpent: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
        startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        completedAt: new Date()
      });
      attempts.push(attempt);
    }
    
    console.log(`✅ Created ${attempts.length} sample quiz attempts\n`);
  }

  private async printSummary() {
    const userCount = await User.count();
    const categoryCount = await Category.count();
    const questionCount = await QuestionBankItem.count();
    const optionCount = await QuestionBankOption.count();
    const quizCount = await Quiz.count();
    const assignmentCount = await QuizQuestion.count();
    const attemptCount = await QuizAttempt.count();
    
    console.log('\n📊 ENGINEERING SEEDING SUMMARY:');
    console.log(`   👥 Users: ${userCount} (5 admins + 20 students)`);
    console.log(`   📚 Categories: ${categoryCount} (hierarchical structure)`);
    console.log(`   ❓ Questions: ${questionCount} (English engineering questions)`);
    console.log(`   📝 Options: ${optionCount} (exactly 4 per question)`);
    console.log(`   📋 Quizzes: ${quizCount} (B.Tech engineering topics)`);
    console.log(`   🔗 Assignments: ${assignmentCount} (questions assigned to quizzes)`);
    console.log(`   🎯 Attempts: ${attemptCount} (sample student attempts)`);
    console.log(`   📊 Total Records: ${userCount + categoryCount + questionCount + optionCount + quizCount + assignmentCount + attemptCount}`);
  }
}

// Main execution
async function runEngineeringSeeder() {
  try {
    const seeder = new EngineeringSeeder();
    await seeder.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runEngineeringSeeder();
}

// export { EngineeringSeeder };
export default EngineeringSeeder;

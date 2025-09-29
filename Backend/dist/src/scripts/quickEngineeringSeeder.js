"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../models");
async function seedEngineeringData() {
    try {
        console.log('🚀 Starting Engineering Database Seeding...\n');
        await models_1.sequelize.authenticate();
        console.log('✅ Database connection established\n');
        console.log('🧹 Clearing existing data...');
        const { QuizAttempt, QuizAttemptAnswer } = await Promise.resolve().then(() => require('../models'));
        await QuizAttemptAnswer.destroy({ where: {} });
        await QuizAttempt.destroy({ where: {} });
        await models_1.QuizQuestion.destroy({ where: {} });
        await models_1.QuestionBankOption.destroy({ where: {} });
        await models_1.QuestionBankItem.destroy({ where: {} });
        await models_1.Quiz.destroy({ where: {} });
        await models_1.Category.destroy({ where: {} });
        await models_1.User.destroy({ where: {} });
        console.log('✅ Existing data cleared\n');
        console.log('👥 Creating users...');
        const admin = await models_1.User.create({
            username: 'admin',
            email: 'admin@engineering.edu',
            passwordHash: '1234567890',
            firstName: 'Admin',
            lastName: 'User',
            role: models_1.UserRole.ADMIN,
            isActive: true
        });
        const student = await models_1.User.create({
            username: 'student',
            email: 'student@engineering.edu',
            passwordHash: '1234567890',
            firstName: 'Test',
            lastName: 'Student',
            role: models_1.UserRole.PLAYER,
            isActive: true
        });
        console.log('✅ Users created with password: 1234567890\n');
        console.log('📚 Creating B.Tech Engineering categories...');
        const engineeringRoot = await models_1.Category.create({
            name: 'B.Tech Engineering',
            description: 'Bachelor of Technology Engineering Programs',
            parentId: null,
            isActive: true
        });
        const cseCategory = await models_1.Category.create({
            name: 'Computer Science & Engineering',
            description: 'CSE Core Subjects',
            parentId: engineeringRoot.id,
            isActive: true
        });
        const programmingCategory = await models_1.Category.create({
            name: 'Programming Languages',
            description: 'Programming languages and syntax',
            parentId: cseCategory.id,
            isActive: true
        });
        const cProgrammingCategory = await models_1.Category.create({
            name: 'C Programming',
            description: 'C language fundamentals',
            parentId: programmingCategory.id,
            isActive: true
        });
        const javaCategory = await models_1.Category.create({
            name: 'Java Programming',
            description: 'Java and OOP concepts',
            parentId: programmingCategory.id,
            isActive: true
        });
        const itCategory = await models_1.Category.create({
            name: 'Information Technology',
            description: 'IT Core Subjects',
            parentId: engineeringRoot.id,
            isActive: true
        });
        const webDevCategory = await models_1.Category.create({
            name: 'Web Development',
            description: 'Frontend and Backend Technologies',
            parentId: itCategory.id,
            isActive: true
        });
        const aimlCategory = await models_1.Category.create({
            name: 'Artificial Intelligence & Machine Learning',
            description: 'AI/ML Core Subjects',
            parentId: engineeringRoot.id,
            isActive: true
        });
        const mlCategory = await models_1.Category.create({
            name: 'Machine Learning',
            description: 'ML Algorithms and Concepts',
            parentId: aimlCategory.id,
            isActive: true
        });
        console.log('✅ Categories created\n');
        console.log('❓ Creating English engineering questions...');
        const cQuestions = [
            {
                questionText: "What is the correct syntax to declare a pointer in C?",
                difficulty: "EASY",
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
                difficulty: "MEDIUM",
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
                difficulty: "EASY",
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
                difficulty: "EASY",
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
                difficulty: "MEDIUM",
                categoryId: cProgrammingCategory.id,
                options: [
                    { text: "2", correct: false },
                    { text: "4", correct: true },
                    { text: "8", correct: false },
                    { text: "1", correct: false }
                ]
            }
        ];
        const javaQuestions = [
            {
                questionText: "Which principle of OOP is achieved by using access modifiers in Java?",
                difficulty: "MEDIUM",
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
                difficulty: "EASY",
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
                difficulty: "EASY",
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
                difficulty: "EASY",
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
                difficulty: "EASY",
                categoryId: javaCategory.id,
                options: [
                    { text: "inherits", correct: false },
                    { text: "extends", correct: true },
                    { text: "implements", correct: false },
                    { text: "super", correct: false }
                ]
            }
        ];
        const mlQuestions = [
            {
                questionText: "Which algorithm is commonly used for binary classification?",
                difficulty: "MEDIUM",
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
                difficulty: "MEDIUM",
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
                difficulty: "HARD",
                categoryId: mlCategory.id,
                options: [
                    { text: "Accuracy", correct: false },
                    { text: "Precision", correct: false },
                    { text: "F1-Score", correct: true },
                    { text: "Mean Squared Error", correct: false }
                ]
            }
        ];
        const webQuestions = [
            {
                questionText: "What does HTML stand for?",
                difficulty: "EASY",
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
                difficulty: "MEDIUM",
                categoryId: webDevCategory.id,
                options: [
                    { text: "POST", correct: false },
                    { text: "GET", correct: true },
                    { text: "PUT", correct: false },
                    { text: "DELETE", correct: false }
                ]
            }
        ];
        const allQuestions = [...cQuestions, ...javaQuestions, ...mlQuestions, ...webQuestions];
        const createdQuestions = [];
        for (const q of allQuestions) {
            const question = await models_1.QuestionBankItem.create({
                questionText: q.questionText,
                difficulty: q.difficulty,
                categoryId: q.categoryId,
                createdById: admin.id
            });
            createdQuestions.push(question);
            for (const option of q.options) {
                await models_1.QuestionBankOption.create({
                    questionId: question.id,
                    optionText: option.text,
                    isCorrect: option.correct
                });
            }
        }
        console.log(`✅ Created ${createdQuestions.length} questions with 4 options each\n`);
        console.log('📋 Creating quizzes...');
        const quizzes = [
            {
                title: "C Programming Fundamentals",
                description: "Basic C programming concepts and syntax",
                difficulty: "EASY",
                categoryId: cProgrammingCategory.id,
                timeLimit: 30
            },
            {
                title: "Java OOP Concepts",
                description: "Object-oriented programming with Java",
                difficulty: "MEDIUM",
                categoryId: javaCategory.id,
                timeLimit: 30
            },
            {
                title: "Machine Learning Basics",
                description: "Fundamental ML algorithms and concepts",
                difficulty: "MEDIUM",
                categoryId: mlCategory.id,
                timeLimit: 30
            },
            {
                title: "Web Development Essentials",
                description: "HTML, CSS, and web technologies",
                difficulty: "EASY",
                categoryId: webDevCategory.id,
                timeLimit: 30
            }
        ];
        const createdQuizzes = [];
        for (const quiz of quizzes) {
            const createdQuiz = await models_1.Quiz.create({
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
        console.log('🔗 Assigning questions to quizzes...');
        let assignmentCount = 0;
        for (const quiz of createdQuizzes) {
            const categoryQuestions = createdQuestions.filter(q => q.categoryId === quiz.categoryId);
            const questionsToAssign = categoryQuestions.slice(0, Math.min(5, categoryQuestions.length));
            for (let i = 0; i < questionsToAssign.length; i++) {
                await models_1.QuizQuestion.create({
                    quizId: quiz.id,
                    questionId: questionsToAssign[i].id,
                    order: i + 1
                });
                assignmentCount++;
            }
        }
        console.log(`✅ Created ${assignmentCount} question-quiz assignments\n`);
        const userCount = await models_1.User.count();
        const categoryCount = await models_1.Category.count();
        const questionCount = await models_1.QuestionBankItem.count();
        const optionCount = await models_1.QuestionBankOption.count();
        const quizCount = await models_1.Quiz.count();
        const assignmentCountFinal = await models_1.QuizQuestion.count();
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
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}
seedEngineeringData()
    .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
});
//# sourceMappingURL=quickEngineeringSeeder.js.map
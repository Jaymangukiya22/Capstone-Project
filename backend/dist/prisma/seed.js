"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('🧹 Cleaning existing data...');
    await prisma.quizAttempt.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    console.log('👥 Creating users...');
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    const admin = await prisma.user.create({
        data: {
            username: 'admin',
            email: 'admin@example.com',
            passwordHash: hashedPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            eloRating: 1500
        }
    });
    const player1 = await prisma.user.create({
        data: {
            username: 'john_doe',
            email: 'john@example.com',
            passwordHash: hashedPassword,
            firstName: 'John',
            lastName: 'Doe',
            role: 'PLAYER',
            eloRating: 1200
        }
    });
    const player2 = await prisma.user.create({
        data: {
            username: 'jane_smith',
            email: 'jane@example.com',
            passwordHash: hashedPassword,
            firstName: 'Jane',
            lastName: 'Smith',
            role: 'PLAYER',
            eloRating: 1300
        }
    });
    console.log('📚 Creating categories and subcategories...');
    const scienceCategory = await prisma.category.create({
        data: {
            name: 'Science',
            description: 'All science-related topics'
        }
    });
    const physicsSubcat = await prisma.category.create({
        data: {
            name: 'Physics',
            description: 'Physics concepts and principles',
            parentId: scienceCategory.id
        }
    });
    const chemistrySubcat = await prisma.category.create({
        data: {
            name: 'Chemistry',
            description: 'Chemical reactions and compounds',
            parentId: scienceCategory.id
        }
    });
    const biologySubcat = await prisma.category.create({
        data: {
            name: 'Biology',
            description: 'Living organisms and life processes',
            parentId: scienceCategory.id
        }
    });
    const mechanicsSubSubcat = await prisma.category.create({
        data: {
            name: 'Mechanics',
            description: 'Motion, forces, and energy',
            parentId: physicsSubcat.id
        }
    });
    const thermodynamicsSubSubcat = await prisma.category.create({
        data: {
            name: 'Thermodynamics',
            description: 'Heat and temperature',
            parentId: physicsSubcat.id
        }
    });
    const technologyCategory = await prisma.category.create({
        data: {
            name: 'Technology',
            description: 'Computer science and technology topics'
        }
    });
    const programmingSubcat = await prisma.category.create({
        data: {
            name: 'Programming',
            description: 'Programming languages and concepts',
            parentId: technologyCategory.id
        }
    });
    const webDevSubcat = await prisma.category.create({
        data: {
            name: 'Web Development',
            description: 'Frontend and backend web development',
            parentId: technologyCategory.id
        }
    });
    const javascriptSubSubcat = await prisma.category.create({
        data: {
            name: 'JavaScript',
            description: 'JavaScript programming language',
            parentId: programmingSubcat.id
        }
    });
    const pythonSubSubcat = await prisma.category.create({
        data: {
            name: 'Python',
            description: 'Python programming language',
            parentId: programmingSubcat.id
        }
    });
    const historyCategory = await prisma.category.create({
        data: {
            name: 'History',
            description: 'Historical events and periods'
        }
    });
    const ancientHistorySubcat = await prisma.category.create({
        data: {
            name: 'Ancient History',
            description: 'Ancient civilizations and events',
            parentId: historyCategory.id
        }
    });
    const modernHistorySubcat = await prisma.category.create({
        data: {
            name: 'Modern History',
            description: 'Modern era historical events',
            parentId: historyCategory.id
        }
    });
    const sportsCategory = await prisma.category.create({
        data: {
            name: 'Sports',
            description: 'Various sports and athletics'
        }
    });
    const footballSubcat = await prisma.category.create({
        data: {
            name: 'Football',
            description: 'Football/Soccer related questions',
            parentId: sportsCategory.id
        }
    });
    const basketballSubcat = await prisma.category.create({
        data: {
            name: 'Basketball',
            description: 'Basketball related questions',
            parentId: sportsCategory.id
        }
    });
    console.log('❓ Creating questions...');
    const physicsQuestion1 = await prisma.questionBankItem.create({
        data: {
            questionText: 'What is the speed of light in vacuum?',
            difficulty: 'MEDIUM',
            categoryId: physicsSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: '299,792,458 m/s', isCorrect: true },
                    { optionText: '300,000,000 m/s', isCorrect: false },
                    { optionText: '299,000,000 m/s', isCorrect: false },
                    { optionText: '298,792,458 m/s', isCorrect: false }
                ]
            }
        }
    });
    const physicsQuestion2 = await prisma.questionBankItem.create({
        data: {
            questionText: 'What is Newton\'s first law of motion?',
            difficulty: 'EASY',
            categoryId: mechanicsSubSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: 'F = ma', isCorrect: false },
                    { optionText: 'An object at rest stays at rest', isCorrect: true },
                    { optionText: 'For every action there is an equal and opposite reaction', isCorrect: false },
                    { optionText: 'E = mc²', isCorrect: false }
                ]
            }
        }
    });
    const jsQuestion1 = await prisma.questionBankItem.create({
        data: {
            questionText: 'What does "typeof null" return in JavaScript?',
            difficulty: 'MEDIUM',
            categoryId: javascriptSubSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: 'null', isCorrect: false },
                    { optionText: 'undefined', isCorrect: false },
                    { optionText: 'object', isCorrect: true },
                    { optionText: 'boolean', isCorrect: false }
                ]
            }
        }
    });
    const jsQuestion2 = await prisma.questionBankItem.create({
        data: {
            questionText: 'Which method is used to add an element to the end of an array?',
            difficulty: 'EASY',
            categoryId: javascriptSubSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: 'push()', isCorrect: true },
                    { optionText: 'pop()', isCorrect: false },
                    { optionText: 'shift()', isCorrect: false },
                    { optionText: 'unshift()', isCorrect: false }
                ]
            }
        }
    });
    const historyQuestion1 = await prisma.questionBankItem.create({
        data: {
            questionText: 'In which year did World War II end?',
            difficulty: 'EASY',
            categoryId: modernHistorySubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: '1944', isCorrect: false },
                    { optionText: '1945', isCorrect: true },
                    { optionText: '1946', isCorrect: false },
                    { optionText: '1947', isCorrect: false }
                ]
            }
        }
    });
    const historyQuestion2 = await prisma.questionBankItem.create({
        data: {
            questionText: 'Who was the first emperor of Rome?',
            difficulty: 'MEDIUM',
            categoryId: ancientHistorySubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: 'Julius Caesar', isCorrect: false },
                    { optionText: 'Augustus', isCorrect: true },
                    { optionText: 'Nero', isCorrect: false },
                    { optionText: 'Caligula', isCorrect: false }
                ]
            }
        }
    });
    const sportsQuestion1 = await prisma.questionBankItem.create({
        data: {
            questionText: 'How many players are on a basketball team on the court at one time?',
            difficulty: 'EASY',
            categoryId: basketballSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: '4', isCorrect: false },
                    { optionText: '5', isCorrect: true },
                    { optionText: '6', isCorrect: false },
                    { optionText: '7', isCorrect: false }
                ]
            }
        }
    });
    const sportsQuestion2 = await prisma.questionBankItem.create({
        data: {
            questionText: 'Which country won the FIFA World Cup in 2018?',
            difficulty: 'EASY',
            categoryId: footballSubcat.id,
            createdById: admin.id,
            options: {
                create: [
                    { optionText: 'Brazil', isCorrect: false },
                    { optionText: 'Germany', isCorrect: false },
                    { optionText: 'France', isCorrect: true },
                    { optionText: 'Argentina', isCorrect: false }
                ]
            }
        }
    });
    console.log('📝 Creating quizzes...');
    const physicsQuiz = await prisma.quiz.create({
        data: {
            title: 'Basic Physics Quiz',
            description: 'Test your knowledge of basic physics concepts',
            difficulty: 'MEDIUM',
            timeLimit: 30,
            maxQuestions: 10,
            categoryId: physicsSubcat.id,
            createdById: admin.id
        }
    });
    const jsQuiz = await prisma.quiz.create({
        data: {
            title: 'JavaScript Fundamentals',
            description: 'Essential JavaScript concepts every developer should know',
            difficulty: 'MEDIUM',
            timeLimit: 25,
            maxQuestions: 15,
            categoryId: javascriptSubSubcat.id,
            createdById: admin.id
        }
    });
    const historyQuiz = await prisma.quiz.create({
        data: {
            title: 'World History Quiz',
            description: 'Test your knowledge of world historical events',
            difficulty: 'EASY',
            timeLimit: 20,
            maxQuestions: 12,
            categoryId: historyCategory.id,
            createdById: admin.id
        }
    });
    const sportsQuiz = await prisma.quiz.create({
        data: {
            title: 'Sports Trivia',
            description: 'General sports knowledge quiz',
            difficulty: 'EASY',
            timeLimit: 15,
            maxQuestions: 8,
            categoryId: sportsCategory.id,
            createdById: admin.id
        }
    });
    console.log('✅ Database seeding completed successfully!');
    console.log(`Created:
  - 4 main categories
  - 8 subcategories  
  - 4 sub-subcategories
  - 3 users (1 admin, 2 players)
  - 8 questions across different categories
  - 4 quizzes
  `);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
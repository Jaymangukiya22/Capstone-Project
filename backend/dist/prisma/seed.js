"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    const scienceCategory = await prisma.category.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Science',
        },
    });
    const sportsCategory = await prisma.category.upsert({
        where: { id: 2 },
        update: {},
        create: {
            name: 'Sports',
        },
    });
    const technologyCategory = await prisma.category.upsert({
        where: { id: 3 },
        update: {},
        create: {
            name: 'Technology',
        },
    });
    const physicsCategory = await prisma.category.upsert({
        where: { id: 4 },
        update: {},
        create: {
            name: 'Physics',
            parentId: scienceCategory.id,
        },
    });
    const quantumMechanicsCategory = await prisma.category.upsert({
        where: { id: 5 },
        update: {},
        create: {
            name: 'Quantum Mechanics',
            parentId: physicsCategory.id,
        },
    });
    const cricketCategory = await prisma.category.upsert({
        where: { id: 6 },
        update: {},
        create: {
            name: 'Cricket',
            parentId: sportsCategory.id,
        },
    });
    const t20Category = await prisma.category.upsert({
        where: { id: 7 },
        update: {},
        create: {
            name: 'T20',
            parentId: cricketCategory.id,
        },
    });
    const programmingCategory = await prisma.category.upsert({
        where: { id: 8 },
        update: {},
        create: {
            name: 'Programming',
            parentId: technologyCategory.id,
        },
    });
    const javascriptCategory = await prisma.category.upsert({
        where: { id: 9 },
        update: {},
        create: {
            name: 'JavaScript',
            parentId: programmingCategory.id,
        },
    });
    console.log('✅ Categories created');
    const physicsQuiz = await prisma.quiz.upsert({
        where: { id: 1 },
        update: {},
        create: {
            title: 'Basic Physics Quiz',
            description: 'A basic quiz about physics concepts',
            difficulty: 'MEDIUM',
            timeLimit: 30,
            categoryId: physicsCategory.id,
        },
    });
    const question1 = await prisma.question.create({
        data: {
            quizId: physicsQuiz.id,
            questionText: 'What is the force that attracts two objects with mass?',
        },
    });
    await prisma.option.createMany({
        data: [
            {
                questionId: question1.id,
                optionText: 'Gravity',
                isCorrect: true,
            },
            {
                questionId: question1.id,
                optionText: 'Electromagnetic force',
                isCorrect: false,
            },
            {
                questionId: question1.id,
                optionText: 'Centrifugal force',
                isCorrect: false,
            },
            {
                questionId: question1.id,
                optionText: 'Strong nuclear force',
                isCorrect: false,
            },
        ],
    });
    const question2 = await prisma.question.create({
        data: {
            quizId: physicsQuiz.id,
            questionText: 'What is the speed of light in vacuum?',
        },
    });
    await prisma.option.createMany({
        data: [
            {
                questionId: question2.id,
                optionText: '3 × 10⁸ m/s',
                isCorrect: true,
            },
            {
                questionId: question2.id,
                optionText: '3 × 10⁶ m/s',
                isCorrect: false,
            },
            {
                questionId: question2.id,
                optionText: '3 × 10¹⁰ m/s',
                isCorrect: false,
            },
            {
                questionId: question2.id,
                optionText: '3 × 10⁴ m/s',
                isCorrect: false,
            },
        ],
    });
    const quantumQuiz = await prisma.quiz.upsert({
        where: { id: 2 },
        update: {},
        create: {
            title: 'Quantum Mechanics Fundamentals',
            description: 'A quiz about quantum mechanics concepts',
            difficulty: 'HARD',
            timeLimit: 45,
            categoryId: quantumMechanicsCategory.id,
            questions: {
                create: [
                    {
                        questionText: 'What is the principle of wave-particle duality?',
                        options: {
                            create: [
                                {
                                    optionText: 'Particles can exhibit wave-like behavior',
                                    isCorrect: true,
                                },
                                {
                                    optionText: 'Waves can exhibit particle-like behavior',
                                    isCorrect: true,
                                },
                                {
                                    optionText: 'Particles and waves are mutually exclusive',
                                    isCorrect: false,
                                },
                                {
                                    optionText: 'The principle is only applicable to macroscopic objects',
                                    isCorrect: false,
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });
    const techQuiz = await prisma.quiz.upsert({
        where: { id: 3 },
        update: {},
        create: {
            title: 'Technology Trivia',
            description: 'A quiz about technology and programming',
            difficulty: 'EASY',
            timeLimit: 20,
            categoryId: technologyCategory.id,
            questions: {
                create: [
                    {
                        questionText: 'What is the most popular programming language?',
                        options: {
                            create: [
                                {
                                    optionText: 'JavaScript',
                                    isCorrect: true,
                                },
                                {
                                    optionText: 'Python',
                                    isCorrect: false,
                                },
                                {
                                    optionText: 'Java',
                                    isCorrect: false,
                                },
                                {
                                    optionText: 'C++',
                                    isCorrect: false,
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });
    console.log('✅ Quizzes created');
    const jsQuiz = await prisma.quiz.upsert({
        where: { id: 4 },
        update: {},
        create: {
            title: 'JavaScript Fundamentals',
            description: 'A quiz about JavaScript programming',
            difficulty: 'EASY',
            timeLimit: 25,
            categoryId: javascriptCategory.id,
            questions: {
                create: [
                    {
                        questionText: 'Which of the following is used to declare a variable in JavaScript?',
                        options: {
                            create: [
                                { optionText: 'var', isCorrect: true },
                                { optionText: 'let', isCorrect: true },
                                { optionText: 'const', isCorrect: true },
                                { optionText: 'variable', isCorrect: false }
                            ]
                        }
                    },
                    {
                        questionText: 'What does JSON stand for?',
                        options: {
                            create: [
                                { optionText: 'JavaScript Object Notation', isCorrect: true },
                                { optionText: 'Java Standard Object Notation', isCorrect: false },
                                { optionText: 'JavaScript Object Naming', isCorrect: false },
                                { optionText: 'JavaScript Oriented Notation', isCorrect: false }
                            ]
                        }
                    }
                ]
            }
        }
    });
    const cricketQuiz = await prisma.quiz.upsert({
        where: { id: 5 },
        update: {},
        create: {
            title: 'Cricket Trivia',
            description: 'A quiz about cricket',
            difficulty: 'MEDIUM',
            timeLimit: 20,
            categoryId: cricketCategory.id,
            questions: {
                create: [
                    {
                        questionText: 'How many overs are there in a T20 match per team?',
                        options: {
                            create: [
                                { optionText: '20', isCorrect: true },
                                { optionText: '50', isCorrect: false },
                                { optionText: '10', isCorrect: false },
                                { optionText: '25', isCorrect: false }
                            ]
                        }
                    },
                    {
                        questionText: 'Which country won the first ever Cricket World Cup in 1975?',
                        options: {
                            create: [
                                { optionText: 'West Indies', isCorrect: true },
                                { optionText: 'Australia', isCorrect: false },
                                { optionText: 'England', isCorrect: false },
                                { optionText: 'India', isCorrect: false }
                            ]
                        }
                    }
                ]
            }
        }
    });
    console.log('✅ Questions and options created');
    console.log('🎉 Database seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create root categories
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

  // Create subcategories for Science
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

  // Create subcategories for Sports
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

  // Create subcategories for Technology
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

  // Create sample quizzes
  const physicsQuiz = await prisma.quiz.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Basic Physics Concepts',
      description: 'Test your knowledge of fundamental physics principles',
      categoryId: physicsCategory.id,
      difficulty: Difficulty.MEDIUM,
      timeLimit: 600, // 10 minutes
    },
  });

  const quantumQuiz = await prisma.quiz.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'Quantum Mechanics Fundamentals',
      description: 'Advanced concepts in quantum mechanics',
      categoryId: quantumMechanicsCategory.id,
      difficulty: Difficulty.HARD,
      timeLimit: 900, // 15 minutes
    },
  });

  const cricketQuiz = await prisma.quiz.upsert({
    where: { id: 3 },
    update: {},
    create: {
      title: 'T20 Cricket Rules',
      description: 'Test your knowledge of T20 cricket format',
      categoryId: t20Category.id,
      difficulty: Difficulty.EASY,
      timeLimit: 300, // 5 minutes
    },
  });

  const jsQuiz = await prisma.quiz.upsert({
    where: { id: 4 },
    update: {},
    create: {
      title: 'JavaScript Fundamentals',
      description: 'Basic JavaScript concepts and syntax',
      categoryId: javascriptCategory.id,
      difficulty: Difficulty.MEDIUM,
      timeLimit: 480, // 8 minutes
    },
  });

  console.log('✅ Quizzes created');

  // Create sample questions for Physics Quiz
  const physicsQ1 = await prisma.question.upsert({
    where: { id: 1 },
    update: {},
    create: {
      quizId: physicsQuiz.id,
      questionText: 'What is the speed of light in vacuum?',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: physicsQ1.id, optionText: '3 × 10⁸ m/s', isCorrect: true },
      { questionId: physicsQ1.id, optionText: '3 × 10⁶ m/s', isCorrect: false },
      { questionId: physicsQ1.id, optionText: '3 × 10¹⁰ m/s', isCorrect: false },
      { questionId: physicsQ1.id, optionText: '3 × 10⁴ m/s', isCorrect: false },
    ],
    skipDuplicates: true,
  });

  const physicsQ2 = await prisma.question.upsert({
    where: { id: 2 },
    update: {},
    create: {
      quizId: physicsQuiz.id,
      questionText: 'Which of the following are fundamental forces in nature?',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: physicsQ2.id, optionText: 'Gravitational force', isCorrect: true },
      { questionId: physicsQ2.id, optionText: 'Electromagnetic force', isCorrect: true },
      { questionId: physicsQ2.id, optionText: 'Centrifugal force', isCorrect: false },
      { questionId: physicsQ2.id, optionText: 'Strong nuclear force', isCorrect: true },
    ],
    skipDuplicates: true,
  });

  // Create sample questions for JavaScript Quiz
  const jsQ1 = await prisma.question.upsert({
    where: { id: 3 },
    update: {},
    create: {
      quizId: jsQuiz.id,
      questionText: 'Which of the following is used to declare a variable in JavaScript?',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: jsQ1.id, optionText: 'var', isCorrect: true },
      { questionId: jsQ1.id, optionText: 'let', isCorrect: true },
      { questionId: jsQ1.id, optionText: 'const', isCorrect: true },
      { questionId: jsQ1.id, optionText: 'variable', isCorrect: false },
    ],
    skipDuplicates: true,
  });

  const jsQ2 = await prisma.question.upsert({
    where: { id: 4 },
    update: {},
    create: {
      quizId: jsQuiz.id,
      questionText: 'What does JSON stand for?',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: jsQ2.id, optionText: 'JavaScript Object Notation', isCorrect: true },
      { questionId: jsQ2.id, optionText: 'Java Standard Object Notation', isCorrect: false },
    ],
    skipDuplicates: true,
  });

  // Create sample questions for Cricket Quiz
  const cricketQ1 = await prisma.question.upsert({
    where: { id: 5 },
    update: {},
    create: {
      quizId: cricketQuiz.id,
      questionText: 'How many overs are there in a T20 match per team?',
    },
  });

  await prisma.option.createMany({
    data: [
      { questionId: cricketQ1.id, optionText: '20', isCorrect: true },
      { questionId: cricketQ1.id, optionText: '50', isCorrect: false },
      { questionId: cricketQ1.id, optionText: '10', isCorrect: false },
      { questionId: cricketQ1.id, optionText: '25', isCorrect: false },
    ],
    skipDuplicates: true,
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

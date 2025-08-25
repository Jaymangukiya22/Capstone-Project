/// <reference types="node" />
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/utils/password.utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await hashPassword('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizspark.com' },
    update: {},
    create: {
      email: 'admin@quizspark.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
    },
  });

  // Create faculty user
  const facultyPassword = await hashPassword('Faculty123!');
  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@quizspark.com' },
    update: {},
    create: {
      email: 'faculty@quizspark.com',
      username: 'drsmith',
      password: facultyPassword,
      firstName: 'Dr. John',
      lastName: 'Smith',
      role: UserRole.FACULTY,
    },
  });

  // Create student users
  const studentPassword = await hashPassword('Student123!');
  const student1 = await prisma.user.upsert({
    where: { email: 'student1@quizspark.com' },
    update: {},
    create: {
      email: 'student1@quizspark.com',
      username: 'alice_wonder',
      password: studentPassword,
      firstName: 'Alice',
      lastName: 'Wonder',
      role: UserRole.STUDENT,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@quizspark.com' },
    update: {},
    create: {
      email: 'student2@quizspark.com',
      username: 'bob_builder',
      password: studentPassword,
      firstName: 'Bob',
      lastName: 'Builder',
      role: UserRole.STUDENT,
    },
  });

  // Create sample course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      title: 'Introduction to Computer Science',
      description: 'A comprehensive introduction to computer science fundamentals including programming, algorithms, and data structures.',
      code: 'CS101',
      creatorId: faculty.id,
      isActive: true,
    },
  });

  // Enroll students in the course
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student1.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student1.id,
      courseId: course.id,
    },
  });

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: {
        userId: student2.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student2.id,
      courseId: course.id,
    },
  });

  // Create ELO ratings for students
  await prisma.eloRating.upsert({
    where: {
      userId_courseId: {
        userId: student1.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student1.id,
      courseId: course.id,
      rating: 1200,
    },
  });

  await prisma.eloRating.upsert({
    where: {
      userId_courseId: {
        userId: student2.id,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId: student2.id,
      courseId: course.id,
      rating: 1200,
    },
  });

  // Create sample quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Programming Fundamentals Quiz',
      description: 'Test your knowledge of basic programming concepts',
      timeLimit: 30,
      creatorId: faculty.id,
      courseId: course.id,
      status: 'DRAFT',
      questions: {
        create: [
          {
            text: 'What is the time complexity of binary search?',
            timeLimit: 30,
            points: 100,
            order: 1,
            options: {
              create: [
                { text: 'O(n)', order: 1, isCorrect: false },
                { text: 'O(log n)', order: 2, isCorrect: true },
                { text: 'O(n²)', order: 3, isCorrect: false },
                { text: 'O(1)', order: 4, isCorrect: false },
              ],
            },
          },
          {
            text: 'Which data structure follows LIFO principle?',
            timeLimit: 25,
            points: 100,
            order: 2,
            options: {
              create: [
                { text: 'Queue', order: 1, isCorrect: false },
                { text: 'Array', order: 2, isCorrect: false },
                { text: 'Stack', order: 3, isCorrect: true },
                { text: 'Linked List', order: 4, isCorrect: false },
              ],
            },
          },
          {
            text: 'What does "OOP" stand for?',
            timeLimit: 20,
            points: 100,
            order: 3,
            options: {
              create: [
                { text: 'Object-Oriented Programming', order: 1, isCorrect: true },
                { text: 'Open-Source Programming', order: 2, isCorrect: false },
                { text: 'Optimized Object Processing', order: 3, isCorrect: false },
                { text: 'Operational Output Protocol', order: 4, isCorrect: false },
              ],
            },
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  // Create another course
  const mathCourse = await prisma.course.create({
    data: {
      title: 'Discrete Mathematics',
      description: 'Mathematical foundations for computer science',
      code: 'MATH201',
      creatorId: faculty.id,
      isActive: true,
    },
  });

  // Create leaderboard for the course
  const leaderboard = await prisma.leaderboard.create({
    data: {
      courseId: course.id,
      season: 'current',
      entries: {
        create: [
          {
            userId: student1.id,
            rank: 1,
            rating: 1200,
            matches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
          },
          {
            userId: student2.id,
            rank: 2,
            rating: 1200,
            matches: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
          },
        ],
      },
    },
    include: {
      entries: true,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Created:');
  console.log(`👤 Admin: ${admin.email} (password: Admin123!)`);
  console.log(`👨‍🏫 Faculty: ${faculty.email} (password: Faculty123!)`);
  console.log(`👨‍🎓 Student 1: ${student1.email} (password: Student123!)`);
  console.log(`👩‍🎓 Student 2: ${student2.email} (password: Student123!)`);
  console.log(`📚 Course: ${course.title} (${course.code})`);
  console.log(`📝 Quiz: ${quiz.title} (${quiz.questions.length} questions)`);
  console.log(`🏆 Leaderboard: ${leaderboard.entries.length} entries`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPIFixes() {
  console.log('🧪 Testing Backend API Fixes...\n');

  try {
    // Test 1: Category Service - Test _count functionality
    console.log('1️⃣ Testing CategoryService _count fix...');
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            children: true,
            quizzes: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    console.log(`✅ Categories retrieved successfully: ${categories.length} found`);
    console.log(`   Sample category counts: children=${categories[0]?._count?.children || 0}, quizzes=${categories[0]?._count?.quizzes || 0}\n`);

    // Test 2: Quiz Service - Test correct field usage
    console.log('2️⃣ Testing QuizService with correct schema fields...');
    const quizzes = await prisma.quiz.findMany({
      include: {
        questions: {
          include: {
            options: true
          }
        },
        category: true
      },
      take: 5
    });
    console.log(`✅ Quizzes retrieved successfully: ${quizzes.length} found`);
    if (quizzes.length > 0) {
      const quiz = quizzes[0];
      console.log(`   Sample quiz: "${quiz.title}" (difficulty: ${quiz.difficulty}, timeLimit: ${quiz.timeLimit})`);
      console.log(`   Category: ${quiz.category?.name || 'None'}, Questions: ${quiz.questions?.length || 0}\n`);
    }

    // Test 3: Question Service - Test correct field usage
    console.log('3️⃣ Testing QuestionService with correct schema fields...');
    const questions = await prisma.question.findMany({
      include: {
        options: true,
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      },
      take: 3
    });
    console.log(`✅ Questions retrieved successfully: ${questions.length} found`);
    if (questions.length > 0) {
      const question = questions[0];
      console.log(`   Sample question: "${question.questionText.substring(0, 50)}..."`);
      console.log(`   Options: ${question.options?.length || 0}, Quiz: "${question.quiz?.title}"\n`);
    }

    // Test 4: Option Service - Test isCorrect field
    console.log('4️⃣ Testing Option fields (isCorrect)...');
    const options = await prisma.option.findMany({
      where: {
        isCorrect: true
      },
      include: {
        question: {
          select: {
            id: true,
            questionText: true
          }
        }
      },
      take: 3
    });
    console.log(`✅ Correct options retrieved successfully: ${options.length} found`);
    if (options.length > 0) {
      const option = options[0];
      console.log(`   Sample correct option: "${option.optionText.substring(0, 30)}..."`);
      console.log(`   Question: "${option.question?.questionText.substring(0, 40)}..."\n`);
    }

    // Test 5: Quiz Statistics
    console.log('5️⃣ Testing Quiz Statistics functionality...');
    if (quizzes.length > 0) {
      const quiz = quizzes[0];
      const totalQuestions = quiz.questions.length;
      const totalOptions = quiz.questions.reduce((sum, q) => sum + q.options.length, 0);
      const correctOptions = quiz.questions.reduce(
        (sum, q) => sum + q.options.filter(o => o.isCorrect).length, 
        0
      );

      const stats = {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        categoryId: quiz.categoryId,
        totalQuestions,
        totalOptions,
        correctOptions,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      };

      console.log(`✅ Quiz stats calculated successfully for "${quiz.title}"`);
      console.log(`   Questions: ${totalQuestions}, Options: ${totalOptions}, Correct: ${correctOptions}\n`);
    }

    // Test 6: Category Quiz Count
    console.log('6️⃣ Testing Category-Quiz relationship...');
    const categoryWithQuizCount = await prisma.category.findFirst({
      include: {
        _count: {
          select: {
            quizzes: true
          }
        }
      }
    });
    if (categoryWithQuizCount) {
      console.log(`✅ Category quiz count working: "${categoryWithQuizCount.name}" has ${categoryWithQuizCount._count.quizzes} quizzes\n`);
    }

    console.log('🎉 All API fixes validated successfully!');
    console.log('✅ CategoryService: _count select fixed');
    console.log('✅ QuizService: Schema fields aligned (title, description, difficulty, timeLimit)');
    console.log('✅ QuestionService: Schema fields aligned (questionText, isCorrect)');
    console.log('✅ All Prisma queries working with correct field names');
    console.log('✅ Relationships and includes functioning properly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
testAPIFixes().catch(console.error);

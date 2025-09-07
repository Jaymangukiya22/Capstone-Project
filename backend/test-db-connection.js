const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test categories table
    const categoryCount = await prisma.category.count();
    console.log(`📁 Categories in database: ${categoryCount}`);
    
    // Test quizzes table
    const quizCount = await prisma.quiz.count();
    console.log(`📝 Quizzes in database: ${quizCount}`);
    
    // Test questions table
    const questionCount = await prisma.question.count();
    console.log(`❓ Questions in database: ${questionCount}`);
    
    // Create test category if none exist
    if (categoryCount === 0) {
      console.log('📁 Creating test category...');
      const testCategory = await prisma.category.create({
        data: {
          name: 'Test Category'
        }
      });
      console.log('✅ Test category created:', testCategory);
    }
    
    // Get all categories with relations
    const categories = await prisma.category.findMany({
      include: {
        quizzes: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        },
        children: true,
        parent: true
      }
    });
    
    console.log('📊 Database structure:');
    categories.forEach(category => {
      console.log(`  Category: ${category.name} (ID: ${category.id})`);
      category.quizzes.forEach(quiz => {
        console.log(`    Quiz: ${quiz.title} (${quiz.questions.length} questions)`);
      });
    });
    
    console.log('🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();

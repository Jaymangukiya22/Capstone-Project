const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

async function startServer() {
  console.log('🚀 Starting Quiz Management System Backend...\n');

  try {
    // Step 1: Test Prisma connection
    console.log('1️⃣ Testing database connection...');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Check if tables exist by trying to count records
      const categoryCount = await prisma.category.count();
      const quizCount = await prisma.quiz.count();
      const questionCount = await prisma.question.count();
      
      console.log(`📊 Database status:`);
      console.log(`   Categories: ${categoryCount}`);
      console.log(`   Quizzes: ${quizCount}`);
      console.log(`   Questions: ${questionCount}`);
      
      // Create sample data if empty
      if (categoryCount === 0) {
        console.log('📁 Creating sample category...');
        await prisma.category.create({
          data: { name: 'General Knowledge' }
        });
        console.log('✅ Sample category created');
      }
      
    } catch (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
      console.log('🔧 Trying to run migrations...');
      
      // Try to run migrations
      const migrate = spawn('npx', ['prisma', 'migrate', 'dev', '--name', 'init'], {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
      });
      
      await new Promise((resolve, reject) => {
        migrate.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Database migrations completed');
            resolve();
          } else {
            reject(new Error(`Migration failed with code ${code}`));
          }
        });
      });
    } finally {
      await prisma.$disconnect();
    }

    // Step 2: Start the server
    console.log('\n2️⃣ Starting Express server...');
    const server = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Test server health
    console.log('\n3️⃣ Testing server health...');
    try {
      const response = await axios.get('http://localhost:3000/health');
      console.log('✅ Server health check passed:', response.data);
      
      // Test API endpoints
      console.log('\n4️⃣ Testing API endpoints...');
      
      try {
        const categoriesResponse = await axios.get('http://localhost:3000/api/categories');
        console.log('✅ Categories endpoint working:', categoriesResponse.data);
      } catch (apiError) {
        console.log('⚠️  Categories endpoint issue:', apiError.response?.data || apiError.message);
      }

      console.log('\n🎉 Backend server is ready!');
      console.log('📍 Server URL: http://localhost:3000');
      console.log('🏥 Health Check: http://localhost:3000/health');
      console.log('📁 Categories API: http://localhost:3000/api/categories');
      console.log('📝 Quizzes API: http://localhost:3000/api/quizzes');
      console.log('❓ Questions API: http://localhost:3000/api/questions');
      
    } catch (healthError) {
      console.log('❌ Server health check failed:', healthError.message);
      console.log('🔧 Please check if the server started correctly');
    }

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      server.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

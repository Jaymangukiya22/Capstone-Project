/**
 * API Testing Script - Quiz Management System
 * Tests all fixed endpoints with correct field names and routes
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let categoryId, quizId, questionId;

// Test configuration
const testData = {
  category: {
    name: 'Technology',
    description: 'Technology related quizzes'
  },
  quiz: {
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of JavaScript basics',
    difficulty: 'MEDIUM',
    timeLimit: 30
  },
  question: {
    questionText: 'What is the correct way to declare a variable in JavaScript?',
    options: [
      {
        optionText: 'var myVar = 5;',
        isCorrect: true
      },
      {
        optionText: 'variable myVar = 5;',
        isCorrect: false
      },
      {
        optionText: 'let myVar = 5;',
        isCorrect: true
      },
      {
        optionText: 'declare myVar = 5;',
        isCorrect: false
      }
    ]
  }
};

async function testAPI() {
  console.log('🚀 Starting API Tests...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Testing Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', health.data);
    console.log('');

    // 2. Create Category
    console.log('2️⃣ Creating Category...');
    const categoryResponse = await axios.post(`${BASE_URL}/api/categories`, testData.category);
    categoryId = categoryResponse.data.data.id;
    console.log('✅ Category Created:', categoryResponse.data);
    console.log('📝 Category ID:', categoryId);
    console.log('');

    // 3. Create Quiz (FIXED - using correct fields)
    console.log('3️⃣ Creating Quiz with FIXED fields...');
    const quizResponse = await axios.post(`${BASE_URL}/api/quizzes`, testData.quiz);
    quizId = quizResponse.data.data.id;
    console.log('✅ Quiz Created:', quizResponse.data);
    console.log('📝 Quiz ID:', quizId);
    console.log('');

    // 4. Get All Quizzes
    console.log('4️⃣ Getting All Quizzes...');
    const allQuizzes = await axios.get(`${BASE_URL}/api/quizzes`);
    console.log('✅ All Quizzes:', allQuizzes.data);
    console.log('');

    // 5. Get Quiz by ID
    console.log('5️⃣ Getting Quiz by ID...');
    const quizById = await axios.get(`${BASE_URL}/api/quizzes/${quizId}`);
    console.log('✅ Quiz by ID:', quizById.data);
    console.log('');

    // 6. Add Question to Quiz (FIXED - using correct route and fields)
    console.log('6️⃣ Adding Question to Quiz with FIXED route...');
    const questionResponse = await axios.post(`${BASE_URL}/api/questions/quiz/${quizId}`, testData.question);
    questionId = questionResponse.data.data.id;
    console.log('✅ Question Added:', questionResponse.data);
    console.log('📝 Question ID:', questionId);
    console.log('');

    // 7. Get Questions by Quiz ID (FIXED - using correct route)
    console.log('7️⃣ Getting Questions by Quiz ID with FIXED route...');
    const questionsByQuiz = await axios.get(`${BASE_URL}/api/questions/quiz/${quizId}`);
    console.log('✅ Questions by Quiz:', questionsByQuiz.data);
    console.log('');

    // 8. Get Question by ID (FIXED - using simplified route)
    console.log('8️⃣ Getting Question by ID with FIXED route...');
    const questionById = await axios.get(`${BASE_URL}/api/questions/${questionId}`);
    console.log('✅ Question by ID:', questionById.data);
    console.log('');

    // 9. Update Quiz (FIXED - using correct fields)
    console.log('9️⃣ Updating Quiz with FIXED fields...');
    const updatedQuizData = {
      title: 'JavaScript Fundamentals - Updated',
      description: 'Updated description for JavaScript quiz',
      difficulty: 'HARD',
      timeLimit: 60
    };
    const updatedQuiz = await axios.put(`${BASE_URL}/api/quizzes/${quizId}`, updatedQuizData);
    console.log('✅ Quiz Updated:', updatedQuiz.data);
    console.log('');

    // 10. Update Question (FIXED - using correct fields)
    console.log('🔟 Updating Question with FIXED fields...');
    const updatedQuestionData = {
      questionText: 'What is the BEST way to declare a variable in modern JavaScript?',
      options: [
        {
          optionText: 'let myVar = 5;',
          isCorrect: true
        },
        {
          optionText: 'const myVar = 5;',
          isCorrect: true
        },
        {
          optionText: 'var myVar = 5;',
          isCorrect: false
        },
        {
          optionText: 'variable myVar = 5;',
          isCorrect: false
        }
      ]
    };
    const updatedQuestion = await axios.put(`${BASE_URL}/api/questions/${questionId}`, updatedQuestionData);
    console.log('✅ Question Updated:', updatedQuestion.data);
    console.log('');

    // 11. Get Quiz Stats
    console.log('1️⃣1️⃣ Getting Quiz Stats...');
    const quizStats = await axios.get(`${BASE_URL}/api/quizzes/${quizId}/stats`);
    console.log('✅ Quiz Stats:', quizStats.data);
    console.log('');

    // 12. Get Question Stats (FIXED - using correct route)
    console.log('1️⃣2️⃣ Getting Question Stats with FIXED route...');
    const questionStats = await axios.get(`${BASE_URL}/api/questions/quiz/${quizId}/stats`);
    console.log('✅ Question Stats:', questionStats.data);
    console.log('');

    console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📊 Test Summary:');
    console.log(`✅ Category ID: ${categoryId}`);
    console.log(`✅ Quiz ID: ${quizId}`);
    console.log(`✅ Question ID: ${questionId}`);
    console.log('✅ All API endpoints working with correct field names and routes');

  } catch (error) {
    console.error('❌ Test Failed:', error.response?.data || error.message);
    console.error('📍 Error Details:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data
    });
  }
}

// Run tests
testAPI();

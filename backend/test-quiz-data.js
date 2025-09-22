// Quick test to check quiz data structure
const axios = require('axios');

async function testQuizData() {
  try {
    console.log('🔍 Testing quiz data...');
    
    // Get all quizzes first
    const quizzesResponse = await axios.get('http://localhost:3000/api/quizzes');
    console.log('📊 Available quizzes:', quizzesResponse.data.data?.quizzes?.length || 0);
    
    if (quizzesResponse.data.data?.quizzes?.length > 0) {
      const firstQuiz = quizzesResponse.data.data.quizzes[0];
      console.log('🎯 Testing quiz:', firstQuiz.title, '(ID:', firstQuiz.id + ')');
      
      // Get quiz for play
      const playResponse = await axios.get(`http://localhost:3000/api/quizzes/${firstQuiz.id}/play`);
      console.log('📝 Quiz play data:', JSON.stringify(playResponse.data, null, 2));
      
      if (playResponse.data.data?.quiz?.questions) {
        const questions = playResponse.data.data.quiz.questions;
        console.log(`\n🔍 Found ${questions.length} questions:`);
        
        questions.forEach((q, idx) => {
          console.log(`\nQuestion ${idx + 1}: ${q.questionText}`);
          console.log(`Options (${q.options.length}):`);
          q.options.forEach((opt, optIdx) => {
            console.log(`  ${optIdx + 1}. ${opt.optionText} ${opt.isCorrect ? '✅' : '❌'}`);
          });
        });
      } else {
        console.log('❌ No questions found in quiz');
      }
    } else {
      console.log('❌ No quizzes found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testQuizData();

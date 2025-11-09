/**
 * Verification script to check imported quiz data
 */

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('quizup_db', 'quizup_user', 'quizup_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

async function verifyImport() {
  try {
    await sequelize.authenticate();
    console.log('\n📊 Database Quiz Import Verification');
    console.log('=====================================\n');
    
    // Check categories
    const categories = await sequelize.query(`
      SELECT c.name, c.description, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c."parentId" = p.id
      ORDER BY c.id;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`✓ Total Categories: ${categories.length}`);
    
    // Check Hardware categories
    const hardwareCategories = categories.filter(c => 
      c.name === 'Hardware' || c.parent_name === 'Hardware'
    );
    console.log(`✓ Hardware Categories: ${hardwareCategories.length}`);
    if (hardwareCategories.length > 0) {
      hardwareCategories.forEach(cat => {
        console.log(`  - ${cat.name}${cat.parent_name ? ` (under ${cat.parent_name})` : ''}`);
      });
    }
    
    // Check quizzes
    const quizzes = await sequelize.query(`
      SELECT q.title, c.name as category_name, 
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq."quizId" = q.id) as question_count
      FROM quizzes q
      JOIN categories c ON q."categoryId" = c.id
      ORDER BY q.id;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n✓ Total Quizzes: ${quizzes.length}`);
    
    // Group quizzes by question count
    const quizzesWith10Plus = quizzes.filter(q => q.question_count >= 10);
    const quizzesWithLess = quizzes.filter(q => q.question_count < 10);
    
    console.log(`  - Quizzes with 10+ questions: ${quizzesWith10Plus.length}`);
    console.log(`  - Quizzes with <10 questions: ${quizzesWithLess.length}`);
    
    if (quizzes.length > 0) {
      console.log('\nQuiz Details:');
      quizzes.forEach(quiz => {
        const status = quiz.question_count >= 10 ? '✅' : '⚠️';
        console.log(`  ${status} ${quiz.title} (${quiz.category_name}): ${quiz.question_count} questions`);
      });
    }
    
    // Check questions
    const [[questionStats]] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_questions,
        COUNT(DISTINCT "categoryId") as categories_with_questions
      FROM question_bank_items;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n✓ Total Questions: ${questionStats.total_questions}`);
    console.log(`✓ Categories with Questions: ${questionStats.categories_with_questions}`);
    
    // Check options
    const [[optionStats]] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_options,
        SUM(CASE WHEN "isCorrect" = true THEN 1 ELSE 0 END) as correct_options
      FROM question_bank_options;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n✓ Total Options: ${optionStats.total_options}`);
    console.log(`✓ Correct Answers: ${optionStats.correct_options}`);
    
    // Check admin user
    const admins = await sequelize.query(`
      SELECT username, email FROM users 
      WHERE role = 'ADMIN' AND (email = 'admin@gmail.com' OR username = 'admin')
      LIMIT 5;
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n✓ Admin Users Found: ${admins.length}`);
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`  - ${admin.username} (${admin.email})`);
      });
    }
    
    // Summary
    console.log('\n=====================================');
    if (quizzesWith10Plus.length > 0 && hardwareCategories.length > 0) {
      console.log('✅ Import verification PASSED!');
      console.log('   - Hardware categories created');
      console.log(`   - ${quizzesWith10Plus.length} quizzes with 10+ questions`);
    } else {
      console.log('⚠️ Import verification INCOMPLETE');
      if (hardwareCategories.length === 0) {
        console.log('   - Missing Hardware categories');
      }
      if (quizzesWith10Plus.length === 0) {
        console.log('   - No quizzes with 10+ questions');
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyImport();

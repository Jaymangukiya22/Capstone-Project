/**
 * Working Quiz Import Script - Fixed all issues
 * Imports from both hardware.json and final proejct quizzes (1).json
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration - UPDATE PASSWORD
const pool = new Pool({
  user: 'quizup_user',
  host: 'localhost',
  database: 'quizup_db',
  password: 'quizup_password', // UPDATE THIS
  port: 5432,
});

// File paths
const HARDWARE_JSON = path.join(__dirname, '..', 'dump', 'harware.json');
const MAIN_QUIZ_JSON = path.join(__dirname, '..', 'dump', 'final proejct quizzes (1).json');

async function workingImport() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Working Quiz Import...\n');
    console.log('Connected to database...\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Step 1: Clean old quiz data (preserve users and categories)
    console.log('🗑️ Step 1: Cleaning old quiz data...');
    await client.query('DELETE FROM quiz_questions');
    await client.query('DELETE FROM question_bank_options');
    await client.query('DELETE FROM quiz_attempt_answers');
    await client.query('DELETE FROM quiz_attempts');
    await client.query('DELETE FROM quizzes');
    await client.query('DELETE FROM question_bank_items');
    console.log('✅ Old quiz data cleaned\n');
    
    // Step 2: Setup or get admin user
    console.log('📌 Step 2: Setting up admin user...');
    
    // Check for existing admin
    const adminCheck = await client.query(
      `SELECT id FROM users WHERE email = 'admin@gmail.com' OR username = 'admin' ORDER BY id LIMIT 1`
    );
    
    let adminId;
    if (adminCheck.rows.length > 0) {
      adminId = adminCheck.rows[0].id;
      console.log(`✅ Using existing admin (ID: ${adminId})\n`);
    } else {
      // Create admin with bcrypt hash for password '1234567890'
      const adminInsert = await client.query(`
        INSERT INTO users (username, email, "passwordHash", role, "firstName", "lastName", 
                         "eloRating", "totalMatches", wins, losses, "isActive", "createdAt", "updatedAt")
        VALUES ('admin', 'admin@gmail.com', 
                '$2b$10$ZLYKnH9nQqKhFvJxQqzZLuR7h2VcG8v0a8nYkJQzH/kxoSyYQ7pXO', 
                'ADMIN', 'Admin', 'User', 1500, 0, 0, 0, true, NOW(), NOW())
        RETURNING id
      `);
      adminId = adminInsert.rows[0].id;
      console.log(`✅ Created admin user (ID: ${adminId})\n`);
    }
    
    // Step 3: Create Hardware category structure
    console.log('📌 Step 3: Setting up Hardware categories...');
    
    // Check if Hardware already exists
    const hardwareCheck = await client.query(
      `SELECT id FROM categories WHERE name = 'Hardware'`
    );
    
    let hardwareId;
    
    if (hardwareCheck.rows.length > 0) {
      hardwareId = hardwareCheck.rows[0].id;
      console.log(`   Found existing Hardware category (ID: ${hardwareId})`);
    } else {
      // Get parent category (Computer Science & Engineering or create it)
      const parentCheck = await client.query(
        `SELECT id FROM categories WHERE name = 'Computer Science & Engineering' OR name = 'Computer Science' LIMIT 1`
      );
      
      let parentId = null;
      if (parentCheck.rows.length > 0) {
        parentId = parentCheck.rows[0].id;
      } else {
        // Create root category
        const rootInsert = await client.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ('Computer Science & Engineering', 'Core CS and Engineering subjects', NULL, true, NOW(), NOW())
          RETURNING id
        `);
        parentId = rootInsert.rows[0].id;
        console.log(`   Created root category (ID: ${parentId})`);
      }
      
      // Create Hardware main category
      const hardwareInsert = await client.query(`
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES ('Hardware', 'Topics related to hardware, VLSI, and embedded systems', $1, true, NOW(), NOW())
        RETURNING id
      `, [parentId]);
      
      hardwareId = hardwareInsert.rows[0].id;
      console.log(`   Created Hardware category (ID: ${hardwareId})`);
    }
    
    // Create Hardware subcategories
    const hardwareSubcategories = [
      { name: 'Computer Hardware', description: 'CPUs, RAM, Motherboards' },
      { name: 'Digital Electronics (DE)', description: 'Logic gates, circuits, and digital design' },
      { name: 'Basic Electrical Engineering (BEE)', description: "Ohm's law, circuits, and electrical principles" },
      { name: 'Embedded Systems', description: 'Microcontrollers, RTOS, and firmware' },
      { name: 'VLSI', description: 'Very Large Scale Integration design' },
      { name: 'VHDL/VERILOG', description: 'Hardware Description Languages' },
      { name: 'ASIC', description: 'Application-Specific Integrated Circuits' }
    ];
    
    for (const subcat of hardwareSubcategories) {
      const check = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [subcat.name]
      );
      
      if (check.rows.length === 0) {
        await client.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, true, NOW(), NOW())
        `, [subcat.name, subcat.description, hardwareId]);
        console.log(`     ✓ Created: ${subcat.name}`);
      }
    }
    
    console.log('✅ Hardware categories ready\n');
    
    // Step 4: Import Hardware JSON questions
    console.log('📌 Step 4: Importing Hardware questions...\n');
    
    let totalQuizzes = 0;
    let totalQuestions = 0;
    
    if (fs.existsSync(HARDWARE_JSON)) {
      const hardwareData = JSON.parse(fs.readFileSync(HARDWARE_JSON, 'utf-8'));
      
      for (const [categoryName, questions] of Object.entries(hardwareData)) {
        // Skip if less than 10 questions
        if (!questions || questions.length < 10) {
          console.log(`   ⚠️ ${categoryName}: Only ${questions?.length || 0} questions (need 10+). Skipping...`);
          continue;
        }
        
        // Get category ID
        const catResult = await client.query(
          'SELECT id FROM categories WHERE name = $1',
          [categoryName]
        );
        
        if (catResult.rows.length === 0) {
          console.log(`   ⚠️ Category '${categoryName}' not found. Skipping...`);
          continue;
        }
        
        const categoryId = catResult.rows[0].id;
        
        // Create quiz for this category
        const quizResult = await client.query(`
          INSERT INTO quizzes (title, description, difficulty, "timeLimit", "categoryId", 
                              "createdById", "isActive", popularity, "createdAt", "updatedAt")
          VALUES ($1, $2, 'MEDIUM', 30, $3, $4, true, 0, NOW(), NOW())
          RETURNING id
        `, [
          `${categoryName} Challenge`,
          `Test your knowledge of ${categoryName}`,
          categoryId,
          adminId
        ]);
        
        const quizId = quizResult.rows[0].id;
        totalQuizzes++;
        let questionOrder = 0;
        
        // Add questions (up to 15)
        const questionsToAdd = questions.slice(0, Math.min(15, questions.length));
        
        for (const q of questionsToAdd) {
          questionOrder++;
          totalQuestions++;
          
          // Insert question
          const questionResult = await client.query(`
            INSERT INTO question_bank_items ("questionText", "categoryId", difficulty, 
                                            "createdById", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, 'MEDIUM', $3, true, NOW(), NOW())
            RETURNING id
          `, [q.question, categoryId, adminId]);
          
          const questionId = questionResult.rows[0].id;
          
          // Map correct answer from letter to option text
          let correctAnswerText;
          switch(q.correct_answer) {
            case 'a': correctAnswerText = q.option_a; break;
            case 'b': correctAnswerText = q.option_b; break;
            case 'c': correctAnswerText = q.option_c; break;
            case 'd': correctAnswerText = q.option_d; break;
          }
          
          // Insert options
          const options = [
            { text: q.option_a, isCorrect: q.option_a === correctAnswerText },
            { text: q.option_b, isCorrect: q.option_b === correctAnswerText },
            { text: q.option_c, isCorrect: q.option_c === correctAnswerText },
            { text: q.option_d, isCorrect: q.option_d === correctAnswerText }
          ];
          
          for (const opt of options) {
            await client.query(`
              INSERT INTO question_bank_options ("questionId", "optionText", "isCorrect", 
                                                "createdAt", "updatedAt")
              VALUES ($1, $2, $3, NOW(), NOW())
            `, [questionId, opt.text, opt.isCorrect]);
          }
          
          // Link question to quiz
          await client.query(`
            INSERT INTO quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [quizId, questionId, questionOrder]);
        }
        
        console.log(`   ✅ ${categoryName}: ${questionsToAdd.length} questions imported`);
      }
    } else {
      console.log('   ⚠️ Hardware JSON file not found');
    }
    
    // Step 5: Import main quiz JSON
    console.log('\n📌 Step 5: Importing main quiz questions...\n');
    
    if (fs.existsSync(MAIN_QUIZ_JSON)) {
      const mainQuizData = JSON.parse(fs.readFileSync(MAIN_QUIZ_JSON, 'utf-8'));
      
      // Create Programming Languages category if needed
      const progLangCheck = await client.query(
        `SELECT id FROM categories WHERE name = 'Programming Languages'`
      );
      
      let progLangId;
      if (progLangCheck.rows.length === 0) {
        const progLangInsert = await client.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ('Programming Languages', 'Various programming languages', NULL, true, NOW(), NOW())
          RETURNING id
        `);
        progLangId = progLangInsert.rows[0].id;
      } else {
        progLangId = progLangCheck.rows[0].id;
      }
      
      // Process each category from main quiz JSON
      for (const [categoryName, questions] of Object.entries(mainQuizData)) {
        // Skip if less than 10 questions
        if (!questions || questions.length < 10) {
          console.log(`   ⚠️ ${categoryName}: Only ${questions?.length || 0} questions (need 10+). Skipping...`);
          continue;
        }
        
        // Check if category exists or create under Programming Languages
        let categoryId;
        const catCheck = await client.query(
          `SELECT id FROM categories WHERE name = $1`,
          [categoryName]
        );
        
        if (catCheck.rows.length > 0) {
          categoryId = catCheck.rows[0].id;
        } else {
          // Create category
          const catInsert = await client.query(`
            INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, true, NOW(), NOW())
            RETURNING id
          `, [categoryName, `${categoryName} concepts and problems`, progLangId]);
          categoryId = catInsert.rows[0].id;
        }
        
        // Create quiz
        const quizResult = await client.query(`
          INSERT INTO quizzes (title, description, difficulty, "timeLimit", "categoryId", 
                              "createdById", "isActive", popularity, "createdAt", "updatedAt")
          VALUES ($1, $2, 'MEDIUM', 30, $3, $4, true, 0, NOW(), NOW())
          RETURNING id
        `, [
          `${categoryName} Master Quiz`,
          `Comprehensive ${categoryName} assessment`,
          categoryId,
          adminId
        ]);
        
        const quizId = quizResult.rows[0].id;
        totalQuizzes++;
        
        // Add questions (take up to 15)
        const questionsToAdd = questions.slice(0, Math.min(15, questions.length));
        let questionOrder = 0;
        
        for (const q of questionsToAdd) {
          questionOrder++;
          totalQuestions++;
          
          // Insert question
          const questionResult = await client.query(`
            INSERT INTO question_bank_items ("questionText", "categoryId", difficulty, 
                                            "createdById", "isActive", "createdAt", "updatedAt")
            VALUES ($1, $2, 'MEDIUM', $3, true, NOW(), NOW())
            RETURNING id
          `, [q.question, categoryId, adminId]);
          
          const questionId = questionResult.rows[0].id;
          
          // Insert options - handle both formats
          const options = [
            { text: q.option_a, isCorrect: q.correct_answer === q.option_a || q.correct_answer === 'a' },
            { text: q.option_b, isCorrect: q.correct_answer === q.option_b || q.correct_answer === 'b' },
            { text: q.option_c, isCorrect: q.correct_answer === q.option_c || q.correct_answer === 'c' },
            { text: q.option_d, isCorrect: q.correct_answer === q.option_d || q.correct_answer === 'd' }
          ];
          
          // If correct_answer is the actual text, fix the comparison
          if (q.correct_answer && q.correct_answer.length > 1) {
            options[0].isCorrect = q.correct_answer === q.option_a;
            options[1].isCorrect = q.correct_answer === q.option_b;
            options[2].isCorrect = q.correct_answer === q.option_c;
            options[3].isCorrect = q.correct_answer === q.option_d;
          }
          
          for (const opt of options) {
            await client.query(`
              INSERT INTO question_bank_options ("questionId", "optionText", "isCorrect", 
                                                "createdAt", "updatedAt")
              VALUES ($1, $2, $3, NOW(), NOW())
            `, [questionId, opt.text, opt.isCorrect]);
          }
          
          // Link question to quiz
          await client.query(`
            INSERT INTO quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
          `, [quizId, questionId, questionOrder]);
        }
        
        console.log(`   ✅ ${categoryName}: ${questionsToAdd.length} questions imported`);
      }
    } else {
      console.log('   ⚠️ Main quiz JSON file not found');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`\n✅ Import Complete!`);
    console.log(`   Total Quizzes: ${totalQuizzes}`);
    console.log(`   Total Questions: ${totalQuestions}`);
    
    // Show final statistics
    console.log('\n📊 Import Complete! Final Statistics:');
    console.log('=====================================');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM quizzes) as quizzes,
        (SELECT COUNT(*) FROM question_bank_items) as questions,
        (SELECT COUNT(*) FROM question_bank_options) as options,
        (SELECT COUNT(*) FROM quiz_questions) as quiz_links
    `);
    
    const s = stats.rows[0];
    console.log(`Categories: ${s.categories}`);
    console.log(`Quizzes: ${s.quizzes}`);
    console.log(`Questions: ${s.questions}`);
    console.log(`Options: ${s.options}`);
    console.log(`Quiz-Question Links: ${s.quiz_links}`);
    
    // Show quiz details
    const quizDetails = await client.query(`
      SELECT q.title, c.name as category, 
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq."quizId" = q.id) as question_count
      FROM quizzes q
      JOIN categories c ON q."categoryId" = c.id
      ORDER BY q.id
    `);
    
    console.log('\nQuizzes Created:');
    console.log('----------------');
    quizDetails.rows.forEach(q => {
      const status = q.question_count >= 10 ? '✅' : '⚠️';
      console.log(`${status} ${q.title} (${q.category}): ${q.question_count} questions`);
    });
    
    console.log('\n✨ Import successful!');
    console.log('======================');
    console.log('Admin Login:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: 1234567890');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during import:', error);
    console.error('Transaction rolled back. No changes made.');
  } finally {
    client.release();
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the import
workingImport().catch(console.error);

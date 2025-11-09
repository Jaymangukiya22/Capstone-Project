/**
 * Fixed Complete Quiz Import Script
 * Imports from both hardware.json and final proejct quizzes (1).json
 * Fixed all array destructuring issues
 */

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Database configuration
const sequelize = new Sequelize('quizup_db', 'quizup_user', 'quizup_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false // Set to console.log to see SQL queries
});

// File paths
const HARDWARE_JSON = path.join(__dirname, '..', 'dump', 'harware.json');
const MAIN_QUIZ_JSON = path.join(__dirname, '..', 'dump', 'final proejct quizzes (1).json');

async function completeImport() {
  let transaction;
  
  try {
    console.log('🚀 Starting Complete Quiz Import...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Start transaction
    transaction = await sequelize.transaction();
    
    // Step 1: Clean old quiz data (preserve users and categories)
    console.log('🗑️ Step 1: Cleaning old quiz data...');
    await sequelize.query('DELETE FROM quiz_questions', { transaction });
    await sequelize.query('DELETE FROM question_bank_options', { transaction });
    await sequelize.query('DELETE FROM quiz_attempt_answers', { transaction });
    await sequelize.query('DELETE FROM quiz_attempts', { transaction });
    await sequelize.query('DELETE FROM quizzes', { transaction });
    await sequelize.query('DELETE FROM question_bank_items', { transaction });
    console.log('✅ Old quiz data cleaned\n');
    
    // Step 2: Setup or get admin user
    console.log('📌 Step 2: Setting up admin user...');
    
    // Check for existing admin
    const existingAdmins = await sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@gmail.com' OR username = 'admin' ORDER BY id LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT, transaction }
    );
    
    let adminId;
    if (existingAdmins && existingAdmins.length > 0) {
      adminId = existingAdmins[0].id;
      console.log(`✅ Using existing admin (ID: ${adminId})\n`);
    } else {
      // Create admin - use bcrypt hash
      const passwordHash = '$2b$10$ZLYKnH9nQqKhFvJxQqzZLuR7h2VcG8v0a8nYkJQzH/kxoSyYQ7pXO'; // hash for '1234567890'
      const adminResult = await sequelize.query(`
        INSERT INTO users (username, email, "passwordHash", role, "firstName", "lastName", 
                         "eloRating", "totalMatches", wins, losses, "isActive", "createdAt", "updatedAt")
        VALUES ('admin', 'admin@gmail.com', :passwordHash, 'ADMIN', 'Admin', 'User', 
                1500, 0, 0, 0, true, NOW(), NOW())
        RETURNING id
      `, {
        replacements: { passwordHash },
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
      adminId = adminResult[0].id;
      console.log(`✅ Created admin user (ID: ${adminId})\n`);
    }
    
    // Step 3: Create Hardware category structure
    console.log('📌 Step 3: Setting up Hardware categories...');
    
    // Check if Hardware already exists
    const hardwareCheck = await sequelize.query(
      `SELECT id FROM categories WHERE name = 'Hardware'`,
      { type: Sequelize.QueryTypes.SELECT, transaction }
    );
    
    let hardwareId;
    
    if (hardwareCheck && hardwareCheck.length > 0) {
      hardwareId = hardwareCheck[0].id;
      console.log(`   Found existing Hardware category (ID: ${hardwareId})`);
    } else {
      // Get or create parent category
      const parentCheck = await sequelize.query(
        `SELECT id FROM categories WHERE name = 'Computer Science & Engineering' OR name = 'Computer Science' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      let parentId = null;
      if (parentCheck && parentCheck.length > 0) {
        parentId = parentCheck[0].id;
      } else {
        // Create root category
        const rootInsert = await sequelize.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ('Computer Science & Engineering', 'Core CS and Engineering subjects', NULL, true, NOW(), NOW())
          RETURNING id
        `, { type: Sequelize.QueryTypes.INSERT, transaction });
        parentId = rootInsert[0].id;
        console.log(`   Created root category (ID: ${parentId})`);
      }
      
      // Create Hardware main category
      const hardwareInsert = await sequelize.query(`
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES ('Hardware', 'Topics related to hardware, VLSI, and embedded systems', :parentId, true, NOW(), NOW())
        RETURNING id
      `, {
        replacements: { parentId },
        type: Sequelize.QueryTypes.INSERT,
        transaction
      });
      
      hardwareId = hardwareInsert[0].id;
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
      const check = await sequelize.query(
        `SELECT id FROM categories WHERE name = :name`,
        { 
          replacements: { name: subcat.name },
          type: Sequelize.QueryTypes.SELECT, 
          transaction 
        }
      );
      
      if (!check || check.length === 0) {
        await sequelize.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES (:name, :description, :parentId, true, NOW(), NOW())
        `, {
          replacements: { 
            name: subcat.name,
            description: subcat.description,
            parentId: hardwareId
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction
        });
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
        const catResult = await sequelize.query(
          'SELECT id FROM categories WHERE name = :name',
          { 
            replacements: { name: categoryName },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        
        if (!catResult || catResult.length === 0) {
          console.log(`   ⚠️ Category '${categoryName}' not found. Skipping...`);
          continue;
        }
        
        const categoryId = catResult[0].id;
        
        // Create quiz for this category
        const quizResult = await sequelize.query(`
          INSERT INTO quizzes (title, description, difficulty, "timeLimit", "categoryId", 
                              "createdById", "isActive", popularity, "createdAt", "updatedAt")
          VALUES (:title, :description, 'MEDIUM', 30, :categoryId, :createdById, true, 0, NOW(), NOW())
          RETURNING id
        `, {
          replacements: {
            title: `${categoryName} Challenge`,
            description: `Test your knowledge of ${categoryName}`,
            categoryId: categoryId,
            createdById: adminId
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction
        });
        
        const quizId = quizResult[0].id;
        totalQuizzes++;
        
        // Add questions (take up to 15)
        const questionsToAdd = questions.slice(0, Math.min(15, questions.length));
        let questionOrder = 0;
        
        for (const q of questionsToAdd) {
          questionOrder++;
          totalQuestions++;
          
          // Insert question
          const questionResult = await sequelize.query(`
            INSERT INTO question_bank_items ("questionText", "categoryId", difficulty, 
                                            "createdById", "isActive", "createdAt", "updatedAt")
            VALUES (:questionText, :categoryId, 'MEDIUM', :createdById, true, NOW(), NOW())
            RETURNING id
          `, {
            replacements: {
              questionText: q.question,
              categoryId: categoryId,
              createdById: adminId
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction
          });
          
          const questionId = questionResult[0].id;
          
          // Map correct answer from letter to option text
          let correctAnswerText;
          switch(q.correct_answer) {
            case 'a': correctAnswerText = q.option_a; break;
            case 'b': correctAnswerText = q.option_b; break;
            case 'c': correctAnswerText = q.option_c; break;
            case 'd': correctAnswerText = q.option_d; break;
            default: correctAnswerText = q.option_a; // fallback
          }
          
          // Insert options
          const options = [
            { text: q.option_a, isCorrect: q.option_a === correctAnswerText },
            { text: q.option_b, isCorrect: q.option_b === correctAnswerText },
            { text: q.option_c, isCorrect: q.option_c === correctAnswerText },
            { text: q.option_d, isCorrect: q.option_d === correctAnswerText }
          ];
          
          for (const opt of options) {
            await sequelize.query(`
              INSERT INTO question_bank_options ("questionId", "optionText", "isCorrect", 
                                                "createdAt", "updatedAt")
              VALUES (:questionId, :optionText, :isCorrect, NOW(), NOW())
            `, {
              replacements: {
                questionId: questionId,
                optionText: opt.text,
                isCorrect: opt.isCorrect
              },
              type: Sequelize.QueryTypes.INSERT,
              transaction
            });
          }
          
          // Link question to quiz
          await sequelize.query(`
            INSERT INTO quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
            VALUES (:quizId, :questionId, :order, NOW(), NOW())
          `, {
            replacements: {
              quizId: quizId,
              questionId: questionId,
              order: questionOrder
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction
          });
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
      const progLangCheck = await sequelize.query(
        `SELECT id FROM categories WHERE name = 'Programming Languages'`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      let progLangId;
      if (!progLangCheck || progLangCheck.length === 0) {
        const progLangInsert = await sequelize.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ('Programming Languages', 'Various programming languages', NULL, true, NOW(), NOW())
          RETURNING id
        `, { type: Sequelize.QueryTypes.INSERT, transaction });
        progLangId = progLangInsert[0].id;
      } else {
        progLangId = progLangCheck[0].id;
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
        const catCheck = await sequelize.query(
          `SELECT id FROM categories WHERE name = :name`,
          { 
            replacements: { name: categoryName },
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );
        
        if (catCheck && catCheck.length > 0) {
          categoryId = catCheck[0].id;
        } else {
          // Create category
          const catInsert = await sequelize.query(`
            INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
            VALUES (:name, :description, :parentId, true, NOW(), NOW())
            RETURNING id
          `, {
            replacements: {
              name: categoryName,
              description: `${categoryName} concepts and problems`,
              parentId: progLangId
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction
          });
          categoryId = catInsert[0].id;
        }
        
        // Create quiz
        const quizResult = await sequelize.query(`
          INSERT INTO quizzes (title, description, difficulty, "timeLimit", "categoryId", 
                              "createdById", "isActive", popularity, "createdAt", "updatedAt")
          VALUES (:title, :description, 'MEDIUM', 30, :categoryId, :createdById, true, 0, NOW(), NOW())
          RETURNING id
        `, {
          replacements: {
            title: `${categoryName} Master Quiz`,
            description: `Comprehensive ${categoryName} assessment`,
            categoryId: categoryId,
            createdById: adminId
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction
        });
        
        const quizId = quizResult[0].id;
        totalQuizzes++;
        
        // Add questions (take up to 15)
        const questionsToAdd = questions.slice(0, Math.min(15, questions.length));
        let questionOrder = 0;
        
        for (const q of questionsToAdd) {
          questionOrder++;
          totalQuestions++;
          
          // Insert question
          const questionResult = await sequelize.query(`
            INSERT INTO question_bank_items ("questionText", "categoryId", difficulty, 
                                            "createdById", "isActive", "createdAt", "updatedAt")
            VALUES (:questionText, :categoryId, 'MEDIUM', :createdById, true, NOW(), NOW())
            RETURNING id
          `, {
            replacements: {
              questionText: q.question,
              categoryId: categoryId,
              createdById: adminId
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction
          });
          
          const questionId = questionResult[0].id;
          
          // Insert options - handle both formats (letter or full text)
          const options = [
            { text: q.option_a, isCorrect: false },
            { text: q.option_b, isCorrect: false },
            { text: q.option_c, isCorrect: false },
            { text: q.option_d, isCorrect: false }
          ];
          
          // Determine which option is correct
          if (q.correct_answer === 'a' || q.correct_answer === q.option_a) {
            options[0].isCorrect = true;
          } else if (q.correct_answer === 'b' || q.correct_answer === q.option_b) {
            options[1].isCorrect = true;
          } else if (q.correct_answer === 'c' || q.correct_answer === q.option_c) {
            options[2].isCorrect = true;
          } else if (q.correct_answer === 'd' || q.correct_answer === q.option_d) {
            options[3].isCorrect = true;
          } else {
            // Default to first option if unclear
            options[0].isCorrect = true;
          }
          
          for (const opt of options) {
            await sequelize.query(`
              INSERT INTO question_bank_options ("questionId", "optionText", "isCorrect", 
                                                "createdAt", "updatedAt")
              VALUES (:questionId, :optionText, :isCorrect, NOW(), NOW())
            `, {
              replacements: {
                questionId: questionId,
                optionText: opt.text,
                isCorrect: opt.isCorrect
              },
              type: Sequelize.QueryTypes.INSERT,
              transaction
            });
          }
          
          // Link question to quiz
          await sequelize.query(`
            INSERT INTO quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
            VALUES (:quizId, :questionId, :order, NOW(), NOW())
          `, {
            replacements: {
              quizId: quizId,
              questionId: questionId,
              order: questionOrder
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction
          });
        }
        
        console.log(`   ✅ ${categoryName}: ${questionsToAdd.length} questions imported`);
      }
    } else {
      console.log('   ⚠️ Main quiz JSON file not found');
    }
    
    // Commit transaction
    await transaction.commit();
    
    console.log(`\n✅ Import Complete!`);
    console.log(`   Total Quizzes: ${totalQuizzes}`);
    console.log(`   Total Questions: ${totalQuestions}`);
    
    // Show final statistics
    console.log('\n📊 Final Database Statistics:');
    console.log('=====================================');
    
    const stats = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM quizzes) as quizzes,
        (SELECT COUNT(*) FROM question_bank_items) as questions,
        (SELECT COUNT(*) FROM question_bank_options) as options,
        (SELECT COUNT(*) FROM quiz_questions) as quiz_links
    `, { type: Sequelize.QueryTypes.SELECT });
    
    const s = stats[0];
    console.log(`Categories: ${s.categories}`);
    console.log(`Quizzes: ${s.quizzes}`);
    console.log(`Questions: ${s.questions}`);
    console.log(`Options: ${s.options}`);
    console.log(`Quiz-Question Links: ${s.quiz_links}`);
    
    // Show quiz details
    const quizDetails = await sequelize.query(`
      SELECT q.title, c.name as category, 
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq."quizId" = q.id) as question_count
      FROM quizzes q
      JOIN categories c ON q."categoryId" = c.id
      ORDER BY q.id
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log('\nQuizzes Created:');
    console.log('----------------');
    quizDetails.forEach(q => {
      const status = q.question_count >= 10 ? '✅' : '⚠️';
      console.log(`${status} ${q.title} (${q.category}): ${q.question_count} questions`);
    });
    
    console.log('\n✨ Import successful!');
    console.log('======================');
    console.log('Admin Login:');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: 1234567890');
    
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('\n❌ Error during import:', error.message);
    console.error('Details:', error);
    console.error('Transaction rolled back. No changes made.');
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the import
completeImport().catch(console.error);

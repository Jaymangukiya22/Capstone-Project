/**
 * Clean import script for quiz data
 * This version removes all old quiz data (keeping users) and adds fresh data
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

// Database configuration - update password if needed
const sequelize = new Sequelize('quizup_db', 'quizup_user', 'quizup_password', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false // Set to console.log to see SQL queries
});

async function cleanAndImport() {
  try {
    console.log('🚀 Starting clean quiz data import...\n');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
    
    // Start transaction for safety
    const t = await sequelize.transaction();
    
    try {
      // Step 1: Clean old data (preserve users)
      console.log('🗑️ Step 1: Cleaning old data...');
      
      // Delete in correct order due to foreign keys
      await sequelize.query(`DELETE FROM quiz_questions;`, { transaction: t });
      await sequelize.query(`DELETE FROM question_bank_options;`, { transaction: t });
      await sequelize.query(`DELETE FROM quiz_attempt_answers;`, { transaction: t });
      await sequelize.query(`DELETE FROM quiz_attempts;`, { transaction: t });
      await sequelize.query(`DELETE FROM quizzes;`, { transaction: t });
      await sequelize.query(`DELETE FROM question_bank_items;`, { transaction: t });
      
      // Delete only non-root categories that we'll recreate
      await sequelize.query(`
        DELETE FROM categories 
        WHERE name IN ('Hardware', 'Embedded Systems', 'VHDL', 'Verilog', 
                       'Basic Electronics', 'Digital Electronics')
           OR "parentId" IN (SELECT id FROM categories WHERE name = 'Hardware');
      `, { transaction: t });
      
      console.log('✅ Old data cleaned\n');
      
      // Step 2: Ensure admin user exists
      console.log('📌 Step 2: Setting up admin user...');
      
      // Check for existing admin by username or email
      const [existingAdminByUsername] = await sequelize.query(
        `SELECT id, email FROM users WHERE username = 'admin'`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      
      const [existingAdminByEmail] = await sequelize.query(
        `SELECT id, username FROM users WHERE email = 'admin@gmail.com'`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      
      // Also check for any existing ADMIN role user we can use
      const [anyAdmin] = await sequelize.query(
        `SELECT id, username, email FROM users WHERE role = 'ADMIN' LIMIT 1`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      
      let adminId;
      if (existingAdminByUsername) {
        adminId = existingAdminByUsername.id;
        console.log(`✅ Using existing admin user (ID: ${adminId})`);
      } else if (existingAdminByEmail) {
        adminId = existingAdminByEmail.id;
        console.log(`✅ Using existing user with admin@gmail.com (ID: ${adminId})`);
      } else if (anyAdmin) {
        adminId = anyAdmin.id;
        console.log(`✅ Using existing admin: ${anyAdmin.username} (ID: ${adminId})`);
      } else {
        // Create new admin with unique username
        const passwordHash = await bcrypt.hash('1234567890', 10);
        const timestamp = Date.now();
        const newUsername = `admin_quiz_${timestamp}`;
        
        const [adminResult] = await sequelize.query(`
          INSERT INTO users (username, email, "passwordHash", role, "firstName", "lastName", 
                           "eloRating", "totalMatches", wins, losses, "isActive", "createdAt", "updatedAt")
          VALUES (:username, :email, :passwordHash, 'ADMIN', 'Admin', 'Quiz User', 
                  1500, 0, 0, 0, true, NOW(), NOW())
          RETURNING id;
        `, {
          replacements: { 
            username: newUsername, 
            email: `${newUsername}@quizdash.com`,
            passwordHash 
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction: t
        });
        adminId = adminResult[0].id;
        console.log(`✅ Created new admin user: ${newUsername}`);
      }
      console.log(`   Admin ID: ${adminId}\n`);
      
      // Step 3: Create Hardware category structure
      console.log('📌 Step 3: Creating Hardware categories...');
      
      // First check if any categories exist
      const existingCategories = await sequelize.query(
        `SELECT id, name FROM categories ORDER BY id`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      
      let parentId;
      
      if (!existingCategories || existingCategories.length === 0) {
        // No categories exist, create root category
        const [rootCat] = await sequelize.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES ('Computer Science & Engineering', 'Core CS and Engineering subjects', NULL, true, NOW(), NOW())
          RETURNING id;
        `, { type: Sequelize.QueryTypes.INSERT, transaction: t });
        parentId = rootCat[0].id;
        console.log(`   Created root category (ID: ${parentId})`);
      } else {
        // Find CS category or use first available
        const csCategory = existingCategories.find(cat => 
          cat.name === 'Computer Science & Engineering' || 
          cat.name === 'Computer Science'
        );
        
        if (csCategory) {
          parentId = csCategory.id;
          console.log(`   Found parent category: ${csCategory.name} (ID: ${parentId})`);
        } else {
          // Create as root level or use first category
          parentId = null; // Create as root level
          console.log(`   Creating Hardware as root category`);
        }
      }
      
      // Create Hardware main category
      const [hardwareCat] = await sequelize.query(`
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES ('Hardware', 'Hardware design and electronics', :parentId, true, NOW(), NOW())
        RETURNING id;
      `, {
        replacements: { parentId },
        type: Sequelize.QueryTypes.INSERT,
        transaction: t
      });
      
      const hardwareId = hardwareCat[0].id;
      console.log(`   Hardware category created (ID: ${hardwareId})`);
      
      // Create Hardware subcategories
      const subcategories = [
        'Embedded Systems',
        'VHDL',
        'Verilog', 
        'Basic Electronics',
        'Digital Electronics'
      ];
      
      for (const name of subcategories) {
        await sequelize.query(`
          INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
          VALUES (:name, :description, :parentId, true, NOW(), NOW());
        `, {
          replacements: {
            name,
            description: `${name} concepts and applications`,
            parentId: hardwareId
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction: t
        });
        console.log(`   ✓ ${name} subcategory created`);
      }
      
      console.log('✅ Hardware categories created\n');
      
      // Step 4: Add sample quizzes
      console.log('📌 Step 4: Adding sample quizzes...');
      
      // Get category IDs for quiz creation
      const categories = await sequelize.query(
        `SELECT id, name FROM categories`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      
      const categoryMap = {};
      categories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });
      
      // Create sample quizzes with questions
      const sampleQuizzes = [
        { 
          title: 'Basic Electronics Fundamentals',
          categoryName: 'Basic Electronics',
          questions: [
            { text: "What is Ohm's Law?", correctAnswer: "V = I × R" },
            { text: "What does a capacitor store?", correctAnswer: "Electric charge" },
            { text: "What is the unit of resistance?", correctAnswer: "Ohm" }
          ]
        },
        {
          title: 'Digital Electronics Basics',
          categoryName: 'Digital Electronics',
          questions: [
            { text: "What is the output of AND gate when both inputs are 1?", correctAnswer: "1" },
            { text: "How many bits in a byte?", correctAnswer: "8" },
            { text: "What is a flip-flop?", correctAnswer: "A sequential circuit that stores one bit" }
          ]
        },
        {
          title: 'C Programming Fundamentals',
          categoryName: 'C Programming',
          questions: [
            { text: "What is the format specifier for integer in printf?", correctAnswer: "%d" },
            { text: "Which symbol is used to get address of a variable?", correctAnswer: "&" },
            { text: "What is the size of char in bytes?", correctAnswer: "1" }
          ]
        }
      ];
      
      let totalQuizzes = 0;
      let totalQuestions = 0;
      
      for (const quizData of sampleQuizzes) {
        const categoryId = categoryMap[quizData.categoryName];
        if (!categoryId) {
          console.log(`   ⚠️ Category not found: ${quizData.categoryName}`);
          continue;
        }
        
        // Create quiz
        const [quizResult] = await sequelize.query(`
          INSERT INTO quizzes (title, description, difficulty, "timeLimit", "categoryId", 
                              "createdById", "isActive", popularity, "createdAt", "updatedAt")
          VALUES (:title, :description, 'MEDIUM', 30, :categoryId, 
                  :createdById, true, 0, NOW(), NOW())
          RETURNING id;
        `, {
          replacements: {
            title: quizData.title,
            description: `Test your knowledge of ${quizData.categoryName}`,
            categoryId,
            createdById: adminId
          },
          type: Sequelize.QueryTypes.INSERT,
          transaction: t
        });
        
        const quizId = quizResult[0].id;
        totalQuizzes++;
        
        // Add questions
        for (let i = 0; i < quizData.questions.length; i++) {
          const question = quizData.questions[i];
          
          // Create question
          const [questionResult] = await sequelize.query(`
            INSERT INTO question_bank_items ("questionText", "categoryId", difficulty, 
                                            "createdById", "isActive", "createdAt", "updatedAt")
            VALUES (:questionText, :categoryId, 'MEDIUM', :createdById, true, NOW(), NOW())
            RETURNING id;
          `, {
            replacements: {
              questionText: question.text,
              categoryId,
              createdById: adminId
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction: t
          });
          
          const questionId = questionResult[0].id;
          totalQuestions++;
          
          // Add options (simplified - one correct, three incorrect)
          const options = [
            { text: question.correctAnswer, correct: true },
            { text: 'Incorrect option A', correct: false },
            { text: 'Incorrect option B', correct: false },
            { text: 'Incorrect option C', correct: false }
          ];
          
          for (const option of options) {
            await sequelize.query(`
              INSERT INTO question_bank_options ("questionId", "optionText", "isCorrect", 
                                                "createdAt", "updatedAt")
              VALUES (:questionId, :optionText, :isCorrect, NOW(), NOW());
            `, {
              replacements: {
                questionId,
                optionText: option.text,
                isCorrect: option.correct
              },
              type: Sequelize.QueryTypes.INSERT,
              transaction: t
            });
          }
          
          // Link question to quiz
          await sequelize.query(`
            INSERT INTO quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
            VALUES (:quizId, :questionId, :order, NOW(), NOW());
          `, {
            replacements: {
              quizId,
              questionId,
              order: i + 1
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction: t
          });
        }
        
        console.log(`   ✓ ${quizData.title} (${quizData.questions.length} questions)`);
      }
      
      console.log(`✅ Created ${totalQuizzes} quizzes with ${totalQuestions} questions\n`);
      
      // Commit transaction
      await t.commit();
      
      // Step 5: Show statistics
      console.log('📊 Import Statistics:');
      console.log('====================');
      
      const stats = await sequelize.query(`
        SELECT 
          (SELECT COUNT(*) FROM categories) as categories,
          (SELECT COUNT(*) FROM quizzes) as quizzes,
          (SELECT COUNT(*) FROM question_bank_items) as questions,
          (SELECT COUNT(*) FROM question_bank_options) as options,
          (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') as admins;
      `, { type: Sequelize.QueryTypes.SELECT });
      
      console.log(`Total Categories: ${stats[0].categories}`);
      console.log(`Total Quizzes: ${stats[0].quizzes}`);
      console.log(`Total Questions: ${stats[0].questions}`);
      console.log(`Total Options: ${stats[0].options}`);
      console.log(`Admin Users: ${stats[0].admins}`);
      
      console.log('\n✨ Import completed successfully!');
      console.log('================================');
      console.log('Admin Credentials:');
      console.log('  Email: admin@gmail.com');
      console.log('  Password: 1234567890');
      
    } catch (error) {
      // Rollback transaction on error
      await t.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    if (error.parent) {
      console.error('Database error:', error.parent.message);
    }
  } finally {
    await sequelize.close();
  }
}

// Run import
cleanAndImport();

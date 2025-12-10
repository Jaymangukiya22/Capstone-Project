-- ===============================================
-- Clean Import - No ON CONFLICT Required
-- ===============================================
-- This script clears old quiz data and imports fresh data
-- User table is preserved

BEGIN;

-- Step 1: Clear old quiz data (preserve users)
DELETE FROM public.quiz_questions;
DELETE FROM public.question_bank_options;
DELETE FROM public.quiz_attempt_answers;
DELETE FROM public.quiz_attempts;
DELETE FROM public.quizzes;
DELETE FROM public.question_bank_items;

-- Delete Hardware categories if they exist
DELETE FROM public.categories 
WHERE name IN ('Hardware', 'Embedded Systems', 'VHDL', 'Verilog', 'Basic Electronics', 'Digital Electronics')
   OR "parentId" IN (SELECT id FROM public.categories WHERE name = 'Hardware');

-- Step 2: Add admin user if not exists
INSERT INTO public.users (username, email, "passwordHash", role, "firstName", "lastName", "eloRating", "totalMatches", wins, losses, "isActive", "createdAt", "updatedAt")
SELECT 'admin', 'admin@gmail.com', '$2b$10$ZLYKnH9nQqKhFvJxQqzZLuR7h2VcG8v0a8nYkJQzH/kxoSyYQ7pXO', 'ADMIN', 'Admin', 'User', 1500, 0, 0, 0, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@gmail.com');

-- Step 3: Add Hardware categories
DO $$
DECLARE
    admin_id INTEGER;
    parent_cat_id INTEGER;
    hardware_cat_id INTEGER;
    embedded_cat_id INTEGER;
    vhdl_cat_id INTEGER;
    verilog_cat_id INTEGER;
    basic_elec_cat_id INTEGER;
    digital_elec_cat_id INTEGER;
    quiz_id INTEGER;
    question_id INTEGER;
BEGIN
    -- Get admin ID
    SELECT id INTO admin_id FROM public.users WHERE email = 'admin@gmail.com';
    IF admin_id IS NULL THEN
        -- Use first admin or ID 1 as fallback
        SELECT id INTO admin_id FROM public.users WHERE role = 'ADMIN' LIMIT 1;
        IF admin_id IS NULL THEN
            admin_id := 1;
        END IF;
    END IF;
    
    -- Get parent category ID (Computer Science & Engineering or use 1)
    SELECT id INTO parent_cat_id FROM public.categories 
    WHERE name = 'Computer Science & Engineering' 
       OR id = 1 
    LIMIT 1;
    
    IF parent_cat_id IS NULL THEN
        parent_cat_id := 1;
    END IF;
    
    -- Create Hardware category
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('Hardware', 'Hardware design and electronics', parent_cat_id, true, NOW(), NOW())
    RETURNING id INTO hardware_cat_id;
    
    -- Create subcategories
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('Embedded Systems', 'Microcontrollers and embedded programming', hardware_cat_id, true, NOW(), NOW())
    RETURNING id INTO embedded_cat_id;
    
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('VHDL', 'VHSIC Hardware Description Language', hardware_cat_id, true, NOW(), NOW())
    RETURNING id INTO vhdl_cat_id;
    
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('Verilog', 'Hardware description and synthesis', hardware_cat_id, true, NOW(), NOW())
    RETURNING id INTO verilog_cat_id;
    
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('Basic Electronics', 'Fundamental electronic circuits and components', hardware_cat_id, true, NOW(), NOW())
    RETURNING id INTO basic_elec_cat_id;
    
    INSERT INTO public.categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
    VALUES ('Digital Electronics', 'Digital circuits, logic gates, and systems', hardware_cat_id, true, NOW(), NOW())
    RETURNING id INTO digital_elec_cat_id;
    
    -- Create Basic Electronics Quiz
    INSERT INTO public.quizzes (title, description, difficulty, "timeLimit", "categoryId", "createdById", "isActive", popularity, "createdAt", "updatedAt")
    VALUES ('Basic Electronics Fundamentals', 'Test your knowledge of electronic components', 'EASY', 30, basic_elec_cat_id, admin_id, true, 0, NOW(), NOW())
    RETURNING id INTO quiz_id;
    
    -- Add sample questions for Basic Electronics
    -- Question 1
    INSERT INTO public.question_bank_items ("questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt")
    VALUES ('What is Ohm''s Law?', basic_elec_cat_id, 'EASY', admin_id, true, NOW(), NOW())
    RETURNING id INTO question_id;
    
    INSERT INTO public.question_bank_options ("questionId", "optionText", "isCorrect", "createdAt", "updatedAt")
    VALUES 
        (question_id, 'V = I × R', true, NOW(), NOW()),
        (question_id, 'P = V × I', false, NOW(), NOW()),
        (question_id, 'Q = C × V', false, NOW(), NOW()),
        (question_id, 'F = m × a', false, NOW(), NOW());
    
    INSERT INTO public.quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
    VALUES (quiz_id, question_id, 1, NOW(), NOW());
    
    -- Question 2
    INSERT INTO public.question_bank_items ("questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt")
    VALUES ('What does a capacitor store?', basic_elec_cat_id, 'EASY', admin_id, true, NOW(), NOW())
    RETURNING id INTO question_id;
    
    INSERT INTO public.question_bank_options ("questionId", "optionText", "isCorrect", "createdAt", "updatedAt")
    VALUES 
        (question_id, 'Electric charge', true, NOW(), NOW()),
        (question_id, 'Current', false, NOW(), NOW()),
        (question_id, 'Voltage', false, NOW(), NOW()),
        (question_id, 'Resistance', false, NOW(), NOW());
    
    INSERT INTO public.quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
    VALUES (quiz_id, question_id, 2, NOW(), NOW());
    
    -- Question 3
    INSERT INTO public.question_bank_items ("questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt")
    VALUES ('What is the unit of resistance?', basic_elec_cat_id, 'EASY', admin_id, true, NOW(), NOW())
    RETURNING id INTO question_id;
    
    INSERT INTO public.question_bank_options ("questionId", "optionText", "isCorrect", "createdAt", "updatedAt")
    VALUES 
        (question_id, 'Ohm', true, NOW(), NOW()),
        (question_id, 'Ampere', false, NOW(), NOW()),
        (question_id, 'Volt', false, NOW(), NOW()),
        (question_id, 'Watt', false, NOW(), NOW());
    
    INSERT INTO public.quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
    VALUES (quiz_id, question_id, 3, NOW(), NOW());
    
    -- Create Digital Electronics Quiz
    INSERT INTO public.quizzes (title, description, difficulty, "timeLimit", "categoryId", "createdById", "isActive", popularity, "createdAt", "updatedAt")
    VALUES ('Digital Electronics Basics', 'Logic gates and digital circuits', 'MEDIUM', 30, digital_elec_cat_id, admin_id, true, 0, NOW(), NOW())
    RETURNING id INTO quiz_id;
    
    -- Add sample questions for Digital Electronics
    -- Question 1
    INSERT INTO public.question_bank_items ("questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt")
    VALUES ('What is the output of AND gate when both inputs are 1?', digital_elec_cat_id, 'EASY', admin_id, true, NOW(), NOW())
    RETURNING id INTO question_id;
    
    INSERT INTO public.question_bank_options ("questionId", "optionText", "isCorrect", "createdAt", "updatedAt")
    VALUES 
        (question_id, '1', true, NOW(), NOW()),
        (question_id, '0', false, NOW(), NOW()),
        (question_id, 'X', false, NOW(), NOW()),
        (question_id, 'Z', false, NOW(), NOW());
    
    INSERT INTO public.quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
    VALUES (quiz_id, question_id, 1, NOW(), NOW());
    
    -- Question 2
    INSERT INTO public.question_bank_items ("questionText", "categoryId", difficulty, "createdById", "isActive", "createdAt", "updatedAt")
    VALUES ('How many bits are in a byte?', digital_elec_cat_id, 'EASY', admin_id, true, NOW(), NOW())
    RETURNING id INTO question_id;
    
    INSERT INTO public.question_bank_options ("questionId", "optionText", "isCorrect", "createdAt", "updatedAt")
    VALUES 
        (question_id, '8', true, NOW(), NOW()),
        (question_id, '4', false, NOW(), NOW()),
        (question_id, '16', false, NOW(), NOW()),
        (question_id, '32', false, NOW(), NOW());
    
    INSERT INTO public.quiz_questions ("quizId", "questionId", "order", "createdAt", "updatedAt")
    VALUES (quiz_id, question_id, 2, NOW(), NOW());
    
    RAISE NOTICE 'Hardware categories and sample quizzes created successfully!';
    
END $$;

COMMIT;

-- Show summary
SELECT '========================================' as info;
SELECT 'Import completed successfully!' as status;
SELECT '========================================' as info;

-- Statistics
SELECT 'Categories:' as type, COUNT(*) as count FROM public.categories
UNION ALL
SELECT 'Quizzes:', COUNT(*) FROM public.quizzes  
UNION ALL
SELECT 'Questions:', COUNT(*) FROM public.question_bank_items
UNION ALL
SELECT 'Admin Users:', COUNT(*) FROM public.users WHERE role = 'ADMIN';

-- Show Hardware categories
SELECT '========================================' as info;
SELECT 'Hardware Categories:' as info;
SELECT name, description 
FROM public.categories 
WHERE "parentId" = (SELECT id FROM public.categories WHERE name = 'Hardware');

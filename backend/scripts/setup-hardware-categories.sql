-- =====================================================
-- Setup Hardware Categories for QuizUp Database
-- =====================================================

-- Step 1: Create main Hardware category
-- First check if Computer Science & Engineering exists and get its ID
DO $$
DECLARE
    parent_id INTEGER;
    hardware_id INTEGER;
BEGIN
    -- Get or create parent category
    SELECT id INTO parent_id FROM categories WHERE name = 'Computer Science & Engineering';
    
    IF parent_id IS NULL THEN
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES ('Computer Science & Engineering', 'Core CS and Engineering subjects', NULL, true, NOW(), NOW())
        RETURNING id INTO parent_id;
        
        RAISE NOTICE 'Created parent category with ID: %', parent_id;
    ELSE
        RAISE NOTICE 'Found existing parent category with ID: %', parent_id;
    END IF;
    
    -- Check if Hardware already exists
    SELECT id INTO hardware_id FROM categories WHERE name = 'Hardware';
    
    IF hardware_id IS NULL THEN
        -- Create Hardware main category
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES ('Hardware', 'Topics related to hardware, VLSI, and embedded systems', parent_id, true, NOW(), NOW())
        RETURNING id INTO hardware_id;
        
        RAISE NOTICE 'Created Hardware category with ID: %', hardware_id;
        
        -- Create Hardware subcategories
        INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
        VALUES
            ('Computer Hardware', 'CPUs, RAM, Motherboards', hardware_id, true, NOW(), NOW()),
            ('Digital Electronics (DE)', 'Logic gates, circuits, and digital design', hardware_id, true, NOW(), NOW()),
            ('Basic Electrical Engineering (BEE)', 'Ohm''s law, circuits, and electrical principles', hardware_id, true, NOW(), NOW()),
            ('Embedded Systems', 'Microcontrollers, RTOS, and firmware', hardware_id, true, NOW(), NOW()),
            ('VLSI', 'Very Large Scale Integration design', hardware_id, true, NOW(), NOW()),
            ('VHDL/VERILOG', 'Hardware Description Languages', hardware_id, true, NOW(), NOW()),
            ('ASIC', 'Application-Specific Integrated Circuits', hardware_id, true, NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created all Hardware subcategories';
    ELSE
        RAISE NOTICE 'Hardware category already exists with ID: %', hardware_id;
    END IF;
END $$;

-- Additional categories mentioned in requirements
-- Ensure Computer Vision is under Deep Learning
DO $$
DECLARE
    deep_learning_id INTEGER;
BEGIN
    SELECT id INTO deep_learning_id FROM categories WHERE name = 'Deep Learning';
    
    IF deep_learning_id IS NOT NULL THEN
        -- Check if Computer Vision already exists
        IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Computer Vision') THEN
            INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
            VALUES ('Computer Vision', 'Image processing and recognition', deep_learning_id, true, NOW(), NOW());
            
            RAISE NOTICE 'Created Computer Vision under Deep Learning';
        END IF;
    END IF;
END $$;

-- Create other standard categories if they don't exist
INSERT INTO categories (name, description, "parentId", "isActive", "createdAt", "updatedAt")
SELECT * FROM (VALUES
    ('Programming Languages', 'Various programming languages', NULL, true, NOW(), NOW()),
    ('Data Structures & Algorithms', 'DSA concepts and problems', NULL, true, NOW(), NOW()),
    ('Database Management', 'Database concepts and SQL', NULL, true, NOW(), NOW()),
    ('Web Development', 'Web technologies and frameworks', NULL, true, NOW(), NOW()),
    ('Machine Learning', 'ML algorithms and concepts', NULL, true, NOW(), NOW()),
    ('Deep Learning', 'Neural networks and deep learning', NULL, true, NOW(), NOW())
) AS v(name, description, parentId, isActive, createdAt, updatedAt)
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE categories.name = v.name);

-- Show final category structure
SELECT 
    c.id,
    c.name,
    c.description,
    p.name as parent_category
FROM categories c
LEFT JOIN categories p ON c."parentId" = p.id
WHERE c.name = 'Hardware' 
   OR p.name = 'Hardware'
   OR c.name = 'Computer Vision'
ORDER BY c."parentId" NULLS FIRST, c.id;

-- Seed 2000 test users for stress testing
-- Run: psql -d quizdb -f seed-2000-users.sql

DO $$
DECLARE
    i INTEGER;
BEGIN
    -- Create 2000 users for stress testing
    FOR i IN 1..2000 LOOP
        INSERT INTO users (
            username,
            email,
            "passwordHash",
            role,
            "firstName",
            "lastName",
            avatar,
            "eloRating",
            "totalMatches",
            wins,
            losses,
            "isActive",
            "lastLoginAt",
            "createdAt",
            "updatedAt"
        ) VALUES (
            'stresstest_user_' || i,
            'stresstest_' || i || '@test.com',
            '$2b$10$8K1p/a0dL3LUqFYB4rJ4x.YM5C5y8vK5J5vJ5vJ5vJ5vJ5vJ5vJ5vJ', -- bcrypt hash for 'password123'
            'PLAYER',
            'Stress',
            'User' || i,
            'https://api.dicebear.com/7.x/avataaars/svg?seed=' || i,
            1200 + (i % 400), -- Random ELO between 1200-1600
            0,
            0,
            0,
            true,
            NOW(),
            NOW(),
            NOW()
        )
        ON CONFLICT (username) DO NOTHING;
        
        -- Commit in batches of 100 for performance
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Created % users...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully created 2000 stress test users!';
    RAISE NOTICE 'Username pattern: stresstest_user_1 to stresstest_user_2000';
    RAISE NOTICE 'Email pattern: stresstest_1@test.com to stresstest_2000@test.com';
    RAISE NOTICE 'Password for all: password123';
END $$;

-- Verify user creation
SELECT COUNT(*) as total_stress_users 
FROM users 
WHERE username LIKE 'stresstest_user_%';

-- Show sample users
SELECT id, username, email, "firstName", "lastName", "eloRating"
FROM users 
WHERE username LIKE 'stresstest_user_%'
ORDER BY id
LIMIT 10;

-- Test script to verify the signup flow works with JSON-only approach
-- This will help us understand what's happening during user creation

-- First, let's check the current structure of the users_sync table
SELECT column_name, column_default, is_nullable, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'neon_auth' AND table_name = 'users_sync'
ORDER BY ordinal_position;

-- Check if there are any existing users to understand the data format
SELECT id, raw_json, created_at, updated_at 
FROM neon_auth.users_sync 
LIMIT 3;

-- Test inserting a user with only raw_json (simulating our new approach)
DO $$
DECLARE
    test_user_data JSONB;
    new_user_id TEXT;
BEGIN
    -- Prepare test user data
    test_user_data := jsonb_build_object(
        'email', 'test@example.com',
        'name', 'Test User',
        'password_hash', null,
        'created_at', NOW()
    );
    
    -- Try to insert with only raw_json and timestamps
    BEGIN
        INSERT INTO neon_auth.users_sync (raw_json, created_at, updated_at)
        VALUES (test_user_data, NOW(), NOW())
        RETURNING id INTO new_user_id;
        
        RAISE NOTICE 'SUCCESS: User created with ID: %', new_user_id;
        
        -- Clean up test data
        DELETE FROM neon_auth.users_sync WHERE id = new_user_id;
        RAISE NOTICE 'Test user cleaned up successfully';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR inserting with raw_json + timestamps: %', SQLERRM;
        
        -- Try with only raw_json
        BEGIN
            INSERT INTO neon_auth.users_sync (raw_json)
            VALUES (test_user_data)
            RETURNING id INTO new_user_id;
            
            RAISE NOTICE 'SUCCESS: User created with only raw_json, ID: %', new_user_id;
            
            -- Clean up test data
            DELETE FROM neon_auth.users_sync WHERE id = new_user_id;
            RAISE NOTICE 'Test user cleaned up successfully';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR inserting with only raw_json: %', SQLERRM;
        END;
    END;
END $$;

-- Test searching users by email in raw_json
SELECT id, raw_json->>'email' as email, raw_json->>'name' as name
FROM neon_auth.users_sync 
WHERE raw_json->>'email' = 'nonexistent@test.com';

RAISE NOTICE 'Database structure analysis and signup test completed!';

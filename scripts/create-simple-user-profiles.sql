-- Drop existing table if it exists
DROP TABLE IF EXISTS user_profiles;

-- Create user_profiles table without foreign key constraints initially
-- This avoids issues with the existing table structure
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    birth_place TEXT NOT NULL,
    current_location TEXT NOT NULL,
    age INTEGER NOT NULL,
    favorite_cuisines TEXT NOT NULL DEFAULT '[]',
    dietary_restrictions TEXT NOT NULL DEFAULT '[]',
    spice_level TEXT NOT NULL,
    cooking_time TEXT NOT NULL,
    family_size TEXT NOT NULL,
    allergies TEXT,
    additional_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to user_profiles table
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a test to verify the table works
-- (This will be rolled back, just for testing)
DO $$
BEGIN
    INSERT INTO user_profiles (
        user_id, name, birth_place, current_location, age,
        favorite_cuisines, dietary_restrictions, spice_level,
        cooking_time, family_size
    ) VALUES (
        'test-user-id', 'Test User', 'Test State', 'Test Current State', 25,
        '["North Indian"]', '["vegetarian"]', 'medium',
        'moderate', '2-3'
    );
    
    -- Clean up test data
    DELETE FROM user_profiles WHERE user_id = 'test-user-id';
    
    RAISE NOTICE 'User profiles table created and tested successfully!';
END $$;

-- First, let's check if the user_profiles table exists and drop it if needed
DROP TABLE IF EXISTS user_profiles;

-- Create user_profiles table that works with your existing neon_auth.users_sync table
-- Note: Using TEXT for user_id to match your existing table's id column type
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    birth_place TEXT NOT NULL,
    current_location TEXT NOT NULL,
    age INTEGER NOT NULL,
    favorite_cuisines TEXT NOT NULL DEFAULT '[]', -- JSON string
    dietary_restrictions TEXT NOT NULL DEFAULT '[]', -- JSON string
    spice_level TEXT NOT NULL,
    cooking_time TEXT NOT NULL,
    family_size TEXT NOT NULL,
    allergies TEXT,
    additional_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add foreign key constraint (this might fail if the referenced table doesn't exist)
-- We'll add it as a separate statement so it can be skipped if needed
DO $$
BEGIN
    BEGIN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT fk_user_profiles_user_id 
        FOREIGN KEY (user_id) REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Could not add foreign key constraint. This is okay if the referenced table structure is different.';
    END;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Create updated_at trigger function if it doesn't exist
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

-- Create user_profiles table to work with existing neon_auth.users_sync table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES neon_auth.users_sync(id) ON DELETE CASCADE,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to user_profiles table
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

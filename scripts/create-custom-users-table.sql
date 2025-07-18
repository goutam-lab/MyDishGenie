-- Create our own users table if the existing one has too many constraints
-- This gives us full control over the user data structure

-- Drop table if it exists (for testing)
DROP TABLE IF EXISTS mydishgenie_users;

-- Create our custom users table
CREATE TABLE mydishgenie_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mydishgenie_users_email ON mydishgenie_users(email);
CREATE INDEX IF NOT EXISTS idx_mydishgenie_users_created_at ON mydishgenie_users(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_mydishgenie_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS update_mydishgenie_users_updated_at ON mydishgenie_users;
CREATE TRIGGER update_mydishgenie_users_updated_at
    BEFORE UPDATE ON mydishgenie_users
    FOR EACH ROW
    EXECUTE FUNCTION update_mydishgenie_users_updated_at();

-- Test the table works
INSERT INTO mydishgenie_users (email, name, password_hash, raw_data)
VALUES ('test@example.com', 'Test User', 'test_hash', '{"test": true}');

-- Verify the insert worked
SELECT id, email, name, created_at FROM mydishgenie_users WHERE email = 'test@example.com';

-- Clean up test data
DELETE FROM mydishgenie_users WHERE email = 'test@example.com';

-- Success message
SELECT 'Custom users table created and tested successfully!' as result;

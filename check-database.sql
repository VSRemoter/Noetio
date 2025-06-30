-- Check current database state
-- Run this first to see what already exists

-- Check if user_profiles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- Check if the table has RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_profiles';

-- Check if there are any existing user profiles
SELECT COUNT(*) as total_profiles FROM user_profiles; 
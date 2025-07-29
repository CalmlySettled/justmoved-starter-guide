-- Reset database for official launch - delete all test data
-- Delete in correct order to respect foreign key constraints

-- 1. Delete all user recommendations first
DELETE FROM public.user_recommendations;

-- 2. Delete all user profiles  
DELETE FROM public.profiles;

-- 3. Delete all auth users (this will cascade to any remaining references)
DELETE FROM auth.users;
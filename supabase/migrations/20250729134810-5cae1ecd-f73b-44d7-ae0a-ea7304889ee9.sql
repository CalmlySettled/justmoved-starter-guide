-- Delete all user profiles first
DELETE FROM public.profiles;

-- Delete all user recommendations 
DELETE FROM public.user_recommendations;

-- Delete all users from auth.users (this will also clean up auth-related data)
DELETE FROM auth.users;
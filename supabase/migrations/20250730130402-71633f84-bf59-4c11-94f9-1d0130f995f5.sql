-- Fix the foreign key constraint issue that's preventing quiz completion
-- Remove the foreign key constraint since we can't reference auth.users directly
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- The user_id column should just be a UUID that matches auth.users.id
-- but without a formal foreign key constraint since auth.users is managed by Supabase
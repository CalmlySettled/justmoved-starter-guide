-- Fix the profiles table RLS INSERT policy to properly validate user_id
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure user_id column is NOT NULL for security
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;
-- Add avatar_url column to profiles table for profile picture storage
ALTER TABLE public.profiles 
ADD COLUMN avatar_url TEXT;
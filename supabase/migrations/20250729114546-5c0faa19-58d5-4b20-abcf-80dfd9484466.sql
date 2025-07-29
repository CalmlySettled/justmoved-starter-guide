-- Add priority_preferences column to profiles table to store sub-filtering preferences
ALTER TABLE public.profiles 
ADD COLUMN priority_preferences JSONB DEFAULT '{}'::jsonb;
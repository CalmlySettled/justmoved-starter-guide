-- Add distance sorting preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN distance_priority boolean DEFAULT true;
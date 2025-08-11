-- Add place_id column to user_recommendations table
ALTER TABLE public.user_recommendations 
ADD COLUMN place_id text;
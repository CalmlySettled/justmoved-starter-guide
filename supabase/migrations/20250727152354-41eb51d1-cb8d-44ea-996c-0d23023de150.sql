-- Add business_website column to user_recommendations table
ALTER TABLE public.user_recommendations 
ADD COLUMN business_website TEXT;
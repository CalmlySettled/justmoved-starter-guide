-- Add business_image column to user_recommendations table
ALTER TABLE public.user_recommendations 
ADD COLUMN business_image TEXT;
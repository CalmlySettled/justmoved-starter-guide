-- Add a favorites column to the user_recommendations table
ALTER TABLE public.user_recommendations 
ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Create an index for better performance when filtering favorites
CREATE INDEX idx_user_recommendations_favorites 
ON public.user_recommendations (user_id, is_favorite) 
WHERE is_favorite = true;
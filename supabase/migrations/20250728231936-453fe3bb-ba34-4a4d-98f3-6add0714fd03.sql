-- Add columns to support two-tier recommendation system
ALTER TABLE public.user_recommendations 
ADD COLUMN relevance_score REAL DEFAULT 0.0,
ADD COLUMN is_displayed BOOLEAN DEFAULT true,
ADD COLUMN filter_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance on filtering operations
CREATE INDEX idx_user_recommendations_relevance ON public.user_recommendations(user_id, category, relevance_score DESC);
CREATE INDEX idx_user_recommendations_displayed ON public.user_recommendations(user_id, is_displayed);
CREATE INDEX idx_user_recommendations_filter_metadata ON public.user_recommendations USING GIN(filter_metadata);
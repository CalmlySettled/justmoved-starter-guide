-- Add Smart Recommendation Engine fields to user_recommendations table
ALTER TABLE public.user_recommendations 
ADD COLUMN recommendation_engine TEXT DEFAULT 'standard',
ADD COLUMN ai_scores JSONB DEFAULT '{}',
ADD COLUMN interaction_count INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX idx_user_recommendations_engine ON public.user_recommendations(recommendation_engine);
CREATE INDEX idx_user_recommendations_interaction_count ON public.user_recommendations(interaction_count);

-- Update trigger for updated_at
CREATE TRIGGER update_user_recommendations_updated_at
BEFORE UPDATE ON public.user_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
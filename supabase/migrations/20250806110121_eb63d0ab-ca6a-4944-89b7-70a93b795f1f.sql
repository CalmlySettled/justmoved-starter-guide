-- Create function to increment interaction count for AI learning
CREATE OR REPLACE FUNCTION public.increment_interaction(
  p_user_id UUID,
  p_business_name TEXT,
  p_category TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the interaction count for the specific business recommendation
  UPDATE public.user_recommendations 
  SET 
    interaction_count = interaction_count + 1,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND business_name = p_business_name 
    AND category = p_category;
    
  -- If no existing record was updated, we don't create a new one
  -- since this function is meant to update existing recommendations only
END;
$$;
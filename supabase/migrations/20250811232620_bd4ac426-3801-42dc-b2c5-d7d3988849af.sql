-- Add micro-survey tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS micro_survey_responses jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS last_survey_shown_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_surveys_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS behavioral_triggers jsonb DEFAULT '{}'::jsonb;

-- Create micro-survey questions table
CREATE TABLE IF NOT EXISTS public.micro_survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_key text NOT NULL UNIQUE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'single_choice', -- single_choice, multiple_choice, text
  options jsonb DEFAULT '[]'::jsonb,
  trigger_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL,
  priority integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on micro_survey_questions
ALTER TABLE public.micro_survey_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for reading questions (authenticated users)
CREATE POLICY "Authenticated users can read survey questions" 
ON public.micro_survey_questions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Insert initial question bank
INSERT INTO public.micro_survey_questions (question_key, question_text, question_type, options, trigger_conditions, category, priority) VALUES
('favorite_cuisine', 'What''s your favorite cuisine?', 'single_choice', 
 '["Italian", "Mexican", "Chinese", "American", "Indian", "Thai", "Mediterranean", "Japanese", "Other"]'::jsonb,
 '{"min_restaurant_interactions": 2, "categories": ["restaurant", "food"]}'::jsonb,
 'food_preferences', 1),

('dietary_preferences', 'Any dietary preferences?', 'multiple_choice',
 '["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "Keto", "No restrictions"]'::jsonb,
 '{"min_grocery_interactions": 1, "categories": ["grocery", "food"]}'::jsonb,
 'food_preferences', 2),

('transportation_style', 'How do you usually get around?', 'single_choice',
 '["Walking", "Driving", "Public transit", "Biking", "Mix of all"]'::jsonb,
 '{"min_direction_clicks": 3}'::jsonb,
 'lifestyle', 1),

('shopping_priorities', 'What matters most when choosing local spots?', 'single_choice',
 '["Close to home", "Best prices", "High quality", "Unique/local businesses", "Quick & convenient"]'::jsonb,
 '{"min_total_interactions": 5}'::jsonb,
 'general_preferences', 1),

('discovery_style', 'Do you prefer trying new places or sticking to favorites?', 'single_choice',
 '["Love trying new places", "Mix of both", "Prefer familiar spots", "Depends on the category"]'::jsonb,
 '{"min_favorite_actions": 2}'::jsonb,
 'lifestyle', 2),

('budget_preference', 'What''s your usual spending style?', 'single_choice',
 '["Budget-conscious", "Mid-range", "Premium when worth it", "Price isn''t a factor"]'::jsonb,
 '{"min_total_interactions": 8}'::jsonb,
 'general_preferences', 2);

-- Create function to update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
-- Update RLS policy on micro_survey_questions to only allow admin access
DROP POLICY IF EXISTS "Authenticated users can read survey questions" ON public.micro_survey_questions;

-- Create new admin-only policy for reading survey questions
CREATE POLICY "Only admins can read survey questions" 
ON public.micro_survey_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for system/service role to read survey questions (needed for edge function)
CREATE POLICY "System can read survey questions" 
ON public.micro_survey_questions 
FOR SELECT 
USING (auth.role() = 'service_role'::text);
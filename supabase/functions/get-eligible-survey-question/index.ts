import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SurveyQuestion {
  id: string;
  question_key: string;
  question_text: string;
  question_type: string;
  options: any[];
  category: string;
  trigger_conditions: any;
  priority: number;
}

interface BehavioralTriggers {
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { behavioralTriggers, userId } = await req.json();

    console.log('Processing survey request for user:', userId);
    console.log('Behavioral triggers:', behavioralTriggers);

    // Fetch all active survey questions
    const { data: questions, error: questionsError } = await supabase
      .from('micro_survey_questions')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (questionsError) {
      console.error('Error fetching survey questions:', questionsError);
      throw questionsError;
    }

    console.log(`Found ${questions?.length || 0} active survey questions`);

    // Get user's profile to check survey history
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('micro_survey_responses, last_survey_shown_at, total_surveys_completed')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw profileError;
    }

    const userResponses = profile?.micro_survey_responses || {};
    console.log('User survey responses:', Object.keys(userResponses));

    // Filter questions based on eligibility
    const eligibleQuestions = questions?.filter((question: SurveyQuestion) => {
      // Skip if user already answered this question
      if (userResponses[question.question_key]) {
        console.log(`Question ${question.question_key} already answered`);
        return false;
      }

      // Check trigger conditions
      const triggers = question.trigger_conditions || {};
      
      // Check minimum interactions
      if (triggers.min_interactions && behavioralTriggers.total_interactions < triggers.min_interactions) {
        console.log(`Question ${question.question_key} requires ${triggers.min_interactions} interactions, user has ${behavioralTriggers.total_interactions}`);
        return false;
      }

      // Check category-specific triggers
      if (triggers.categories) {
        const hasRequiredCategory = triggers.categories.some((category: string) =>
          behavioralTriggers.categories_interacted?.includes(category)
        );
        if (!hasRequiredCategory) {
          console.log(`Question ${question.question_key} requires specific categories, user doesn't match`);
          return false;
        }
      }

      // Check minimum surveys completed
      if (triggers.min_surveys_completed && (profile?.total_surveys_completed || 0) < triggers.min_surveys_completed) {
        console.log(`Question ${question.question_key} requires ${triggers.min_surveys_completed} completed surveys`);
        return false;
      }

      // Check time-based cooldown (don't show surveys too frequently)
      const lastSurveyTime = profile?.last_survey_shown_at;
      if (lastSurveyTime) {
        const timeSinceLastSurvey = Date.now() - new Date(lastSurveyTime).getTime();
        const cooldownHours = triggers.cooldown_hours || 24; // Default 24 hour cooldown
        if (timeSinceLastSurvey < (cooldownHours * 60 * 60 * 1000)) {
          console.log(`Question ${question.question_key} in cooldown period`);
          return false;
        }
      }

      console.log(`Question ${question.question_key} is eligible`);
      return true;
    }) || [];

    console.log(`${eligibleQuestions.length} eligible questions found`);

    // Return the highest priority eligible question
    const selectedQuestion = eligibleQuestions.length > 0 ? eligibleQuestions[0] : null;

    if (selectedQuestion) {
      console.log(`Selected question: ${selectedQuestion.question_key}`);
      
      // Update user's last survey shown timestamp
      await supabase
        .from('profiles')
        .update({ last_survey_shown_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    return new Response(
      JSON.stringify({ 
        question: selectedQuestion,
        debug: {
          totalQuestions: questions?.length || 0,
          eligibleQuestions: eligibleQuestions.length,
          userResponsesCount: Object.keys(userResponses).length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in get-eligible-survey-question function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
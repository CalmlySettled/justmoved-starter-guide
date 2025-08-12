import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SurveyQuestion {
  id: string;
  question_key: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text';
  options: string[];
  trigger_conditions: Record<string, any>;
  category: string;
  priority: number;
}

interface BehavioralTriggers {
  restaurant_interactions?: number;
  grocery_interactions?: number;
  direction_clicks?: number;
  total_interactions?: number;
  favorite_actions?: number;
  category_interactions?: Record<string, number>;
  [key: string]: any; // For JSON compatibility
}

export const useMicroSurvey = () => {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<SurveyQuestion | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user should see a survey based on behavioral triggers
  const checkForSurveyTrigger = useCallback(async (eventType: string, eventData: Record<string, any>) => {
    if (!user || showSurvey) return;

    try {
      // Get user's current behavioral triggers and survey history
      const { data: profile } = await supabase
        .from('profiles')
        .select('behavioral_triggers, micro_survey_responses, last_survey_shown_at, total_surveys_completed')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Don't show surveys too frequently (minimum 24 hours between surveys)
      if (profile.last_survey_shown_at) {
        const lastSurvey = new Date(profile.last_survey_shown_at);
        const hoursSinceLastSurvey = (Date.now() - lastSurvey.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastSurvey < 24) return;
      }

      // Track interactions by category
      const behavioralTriggers: BehavioralTriggers = (profile.behavioral_triggers as BehavioralTriggers) || {};
      if (eventData.category) {
        behavioralTriggers.category_interactions = behavioralTriggers.category_interactions || {};
        behavioralTriggers.category_interactions[eventData.category] = (behavioralTriggers.category_interactions[eventData.category] || 0) + 1;
      }

      // Track specific event types
      switch (eventType) {
        case 'recommendation_click':
          behavioralTriggers.total_interactions = (behavioralTriggers.total_interactions || 0) + 1;
          if (eventData.category === 'restaurant' || eventData.category === 'food') {
            behavioralTriggers.restaurant_interactions = (behavioralTriggers.restaurant_interactions || 0) + 1;
          }
          if (eventData.category === 'grocery') {
            behavioralTriggers.grocery_interactions = (behavioralTriggers.grocery_interactions || 0) + 1;
          }
          break;
        case 'directions_clicked':
          behavioralTriggers.direction_clicks = (behavioralTriggers.direction_clicks || 0) + 1;
          behavioralTriggers.total_interactions = (behavioralTriggers.total_interactions || 0) + 1;
          break;
        case 'favorite_added':
        case 'favorite_removed':
          behavioralTriggers.favorite_actions = (behavioralTriggers.favorite_actions || 0) + 1;
          behavioralTriggers.total_interactions = (behavioralTriggers.total_interactions || 0) + 1;
          break;
      }

      // Update behavioral triggers in database
      await supabase
        .from('profiles')
        .update({ behavioral_triggers: behavioralTriggers as any })
        .eq('user_id', user.id);

      // Call secure edge function to get eligible survey question
      const { data, error } = await supabase.functions.invoke('get-eligible-survey-question', {
        body: {
          behavioralTriggers,
          userId: user.id
        }
      });

      if (error) {
        console.error('Error fetching eligible survey question:', error);
        return;
      }

      // Show the question if one was returned
      if (data?.question) {
        console.log('🎯 MICRO-SURVEY TRIGGERED:', {
          question: data.question.question_key,
          triggers: behavioralTriggers,
          debug: data.debug
        });
        
        const typedQuestion: SurveyQuestion = {
          id: data.question.id,
          question_key: data.question.question_key,
          question_text: data.question.question_text,
          question_type: data.question.question_type as 'single_choice' | 'multiple_choice' | 'text',
          options: data.question.options || [],
          trigger_conditions: data.question.trigger_conditions,
          category: data.question.category,
          priority: data.question.priority
        };
        
        setCurrentQuestion(typedQuestion);
        setShowSurvey(true);
      }
    } catch (error) {
      console.error('Error checking survey trigger:', error);
    }
  }, [user, showSurvey]);

  // Submit survey response
  const submitSurveyResponse = useCallback(async (answer: string | string[]) => {
    if (!user || !currentQuestion) return;

    setIsSubmitting(true);
    try {
      // Get current survey responses
      const { data: profile } = await supabase
        .from('profiles')
        .select('micro_survey_responses, total_surveys_completed')
        .eq('user_id', user.id)
        .single();

      const responses = profile?.micro_survey_responses || {};
      responses[currentQuestion.question_key] = {
        answer,
        answeredAt: new Date().toISOString(),
        questionText: currentQuestion.question_text
      };

      // Update profile with response
      await supabase
        .from('profiles')
        .update({
          micro_survey_responses: responses,
          total_surveys_completed: (profile?.total_surveys_completed || 0) + 1
        })
        .eq('user_id', user.id);

      console.log('📝 MICRO-SURVEY RESPONSE:', {
        question: currentQuestion.question_key,
        answer,
        totalCompleted: (profile?.total_surveys_completed || 0) + 1
      });

      // Close survey
      setShowSurvey(false);
      setCurrentQuestion(null);
    } catch (error) {
      console.error('Error submitting survey response:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, currentQuestion]);

  // Dismiss survey without answering
  const dismissSurvey = useCallback(() => {
    setShowSurvey(false);
    setCurrentQuestion(null);
  }, []);

  return {
    currentQuestion,
    showSurvey,
    isSubmitting,
    checkForSurveyTrigger,
    submitSurveyResponse,
    dismissSurvey
  };
};
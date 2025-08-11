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

      // Find eligible questions based on triggers
      const { data: questions } = await supabase
        .from('micro_survey_questions')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (!questions?.length) return;

      // Filter questions based on trigger conditions and survey history
      const surveyResponses = profile.micro_survey_responses || {};
      
      for (const question of questions) {
        // Skip if already answered
        if (surveyResponses[question.question_key]) continue;

        const conditions = question.trigger_conditions as any;
        let shouldTrigger = true;

        // Check if conditions are met
        if (conditions.min_restaurant_interactions && 
            (behavioralTriggers.restaurant_interactions || 0) < conditions.min_restaurant_interactions) {
          shouldTrigger = false;
        }
        if (conditions.min_grocery_interactions && 
            (behavioralTriggers.grocery_interactions || 0) < conditions.min_grocery_interactions) {
          shouldTrigger = false;
        }
        if (conditions.min_direction_clicks && 
            (behavioralTriggers.direction_clicks || 0) < conditions.min_direction_clicks) {
          shouldTrigger = false;
        }
        if (conditions.min_total_interactions && 
            (behavioralTriggers.total_interactions || 0) < conditions.min_total_interactions) {
          shouldTrigger = false;
        }
        if (conditions.min_favorite_actions && 
            (behavioralTriggers.favorite_actions || 0) < conditions.min_favorite_actions) {
          shouldTrigger = false;
        }

        // Check category-specific conditions
        if (conditions.categories?.length) {
          const hasRelevantCategory = conditions.categories.some((cat: string) => 
            (behavioralTriggers.category_interactions?.[cat] || 0) > 0
          );
          if (!hasRelevantCategory) shouldTrigger = false;
        }

        if (shouldTrigger) {
          console.log('🎯 MICRO-SURVEY TRIGGERED:', {
            question: question.question_key,
            triggers: behavioralTriggers,
            conditions
          });
          
          const typedQuestion: SurveyQuestion = {
            id: question.id,
            question_key: question.question_key,
            question_text: question.question_text,
            question_type: question.question_type as 'single_choice' | 'multiple_choice' | 'text',
            options: (question.options as string[]) || [],
            trigger_conditions: question.trigger_conditions as Record<string, any>,
            category: question.category,
            priority: question.priority
          };
          
          setCurrentQuestion(typedQuestion);
          setShowSurvey(true);
          
          // Update last survey shown timestamp
          await supabase
            .from('profiles')
            .update({ last_survey_shown_at: new Date().toISOString() })
            .eq('user_id', user.id);
          
          break;
        }
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
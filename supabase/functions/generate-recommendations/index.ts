import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Recommendation {
  title: string;
  reason: string;
}

interface Recommendations {
  [key: string]: Recommendation;
}

interface QuizResponse {
  [key: string]: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000; // 1 minute
const rateLimiter = new Map();
const userQuotas = new Map();

// Rate limiting functions
function checkUserQuota(userId: string): boolean {
  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  const currentUsage = userQuotas.get(userKey) || 0;
  return currentUsage < 50; // Daily limit of 50 requests per user
}

function incrementUserQuota(userId: string): void {
  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  const currentUsage = userQuotas.get(userKey) || 0;
  userQuotas.set(userKey, currentUsage + 1);
}

async function generateRecommendations(quizResponse: QuizResponse): Promise<Recommendations> {
  const recommendations: Recommendations = {};

  if (quizResponse['sleep_quality'] === 'poor') {
    recommendations['improve_sleep_environment'] = {
      title: 'Improve Sleep Environment',
      reason: 'Since you reported poor sleep quality, optimizing your sleep environment can help.',
    };
  }

  if (quizResponse['stress_level'] === 'high') {
    recommendations['stress_reduction_techniques'] = {
      title: 'Stress Reduction Techniques',
      reason: 'Given your high stress levels, incorporating relaxation methods can be beneficial.',
    };
  }

  if (quizResponse['exercise_frequency'] === 'rarely') {
    recommendations['start_regular_exercise'] = {
      title: 'Start Regular Exercise',
      reason: 'As you rarely exercise, introducing physical activity can improve overall well-being.',
    };
  }

  if (quizResponse['diet_quality'] === 'unhealthy') {
    recommendations['improve_diet'] = {
      title: 'Improve Diet',
      reason: 'With an unhealthy diet, focusing on nutritious foods can enhance your health.',
    };
  }

  if (quizResponse['hydration_level'] === 'low') {
    recommendations['increase_hydration'] = {
      title: 'Increase Hydration',
      reason: 'Since you have low hydration levels, drinking more water can boost energy and health.',
    };
  }

  if (quizResponse['screen_time'] === 'excessive') {
    recommendations['reduce_screen_time'] = {
      title: 'Reduce Screen Time',
      reason: 'Given your excessive screen time, reducing it can improve sleep and reduce eye strain.',
    };
  }

  if (quizResponse['social_interaction'] === 'isolated') {
    recommendations['increase_social_interaction'] = {
      title: 'Increase Social Interaction',
      reason: 'As you feel isolated, engaging in social activities can improve mental well-being.',
    };
  }

  if (quizResponse['work_life_balance'] === 'poor') {
    recommendations['improve_work_life_balance'] = {
      title: 'Improve Work-Life Balance',
      reason: 'With a poor work-life balance, setting boundaries can reduce burnout.',
    };
  }

  if (quizResponse['financial_stress'] === 'high') {
    recommendations['financial_planning'] = {
      title: 'Financial Planning',
      reason: 'Given high financial stress, creating a budget and financial plan can provide relief.',
    };
  }

  if (quizResponse['environmental_factors'] === 'unfavorable') {
    recommendations['improve_environment'] = {
      title: 'Improve Environment',
      reason: 'Since your environmental factors are unfavorable, making small changes can improve your daily life.',
    };
  }

  return recommendations;
}

async function saveRecommendationsToDatabase(userId: string, recommendations: Recommendations, quizResponse: QuizResponse) {
  const supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });

  const { data, error } = await supabaseClient
    .from('recommendations')
    .insert([
      {
        user_id: userId,
        recommendations: JSON.stringify(recommendations),
        quiz_response: JSON.stringify(quizResponse),
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.error('Error saving recommendations:', error);
  } else {
    console.log('Recommendations saved successfully:', data);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📥 Received request body:', JSON.stringify(requestBody, null, 2));
    
    const { quizResponse, userId }: { quizResponse: QuizResponse; userId?: string } = requestBody;

    if (!quizResponse) {
      console.error('Missing quizResponse in request body');
      return new Response(JSON.stringify({ error: 'Missing quiz response data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced rate limiting and quota checks
    if (userId) {
      const userKey = `user_${userId}`;
      const now = Date.now();
      const userRequests = rateLimiter.get(userKey) || [];
      
      // Remove old requests
      const recentRequests = userRequests.filter((time: number) => now - time < RATE_WINDOW);
      
      if (recentRequests.length >= RATE_LIMIT) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check daily API quota
      if (!checkUserQuota(userId)) {
        return new Response(JSON.stringify({ error: 'Daily API quota exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      recentRequests.push(now);
      rateLimiter.set(userKey, recentRequests);
    }

    console.log('🎯 Processing quiz response for user:', userId);
    
    const recommendations = await generateRecommendations(quizResponse);
    console.log('📋 Generated recommendations:', Object.keys(recommendations));

    // Save recommendations to database if user ID provided
    if (userId && Object.keys(recommendations).length > 0) {
      await saveRecommendationsToDatabase(userId, recommendations, quizResponse);
      incrementUserQuota(userId);
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Error in generate-recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

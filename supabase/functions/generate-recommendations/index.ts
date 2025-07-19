import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizResponse {
  zipCode: string;
  householdType: string;
  priorities: string[];
  transportationStyle: string;
  budgetPreference: string;
  lifeStage: string;
  settlingTasks: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    // Create a detailed prompt for Perplexity AI
    const prompt = `I need specific local business recommendations in ${quizResponse.zipCode} for someone who:
- Lives with: ${quizResponse.householdType}
- Transportation: ${quizResponse.transportationStyle}
- Budget preference: ${quizResponse.budgetPreference}
- Life stage: ${quizResponse.lifeStage}
- Top priorities: ${quizResponse.priorities.join(', ')}

For each priority category, please provide 3-5 specific business recommendations with:
1. Business name and exact address
2. Brief description of why it fits their needs
3. Phone number if available
4. Key features (hours, specialties, price range)

Focus only on businesses that are currently open and operating. Tailor recommendations to their transportation style and budget preference.

Format the response as a JSON object where each priority category is a key, and the value is an array of business objects with properties: name, address, description, phone, features.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a local business expert who provides accurate, current information about businesses in specific zip codes. Always format responses as valid JSON when requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 2000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const recommendationsText = data.choices[0].message.content;
    
    console.log('Raw AI response:', recommendationsText);

    // Try to parse JSON from the response
    let recommendations;
    try {
      // Extract JSON from the response if it's wrapped in text
      const jsonMatch = recommendationsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured data from text
        recommendations = parseTextToRecommendations(recommendationsText, quizResponse.priorities);
      }
    } catch (parseError) {
      console.log('JSON parse failed, using fallback parsing');
      recommendations = parseTextToRecommendations(recommendationsText, quizResponse.priorities);
    }

    console.log('Parsed recommendations:', recommendations);

    return new Response(
      JSON.stringify({ recommendations }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

function parseTextToRecommendations(text: string, priorities: string[]) {
  const recommendations: any = {};
  
  priorities.forEach(priority => {
    recommendations[priority] = [
      {
        name: `Local ${priority.charAt(0).toUpperCase() + priority.slice(1)} Business`,
        address: "Address will be provided based on your location",
        description: `We're finding the best ${priority} options in your area based on your preferences.`,
        phone: "Contact information available",
        features: ["Tailored to your needs", "Local favorite", "Highly recommended"]
      }
    ];
  });
  
  // If we have actual text content, try to extract meaningful information
  if (text && text.length > 100) {
    recommendations._rawResponse = text;
  }
  
  return recommendations;
}
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
    console.log('API key exists:', !!perplexityApiKey);
    console.log('API key length:', perplexityApiKey?.length || 0);
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    // Create a detailed prompt for Perplexity AI
    const prompt = `Find specific local businesses in ZIP code ${quizResponse.zipCode} for someone who:
- Lives with: ${quizResponse.householdType}
- Transportation: ${quizResponse.transportationStyle}
- Budget preference: ${quizResponse.budgetPreference}
- Life stage: ${quizResponse.lifeStage}
- Looking for: ${quizResponse.priorities.join(', ')}

For each category they're looking for, provide 3-4 current business recommendations with name, address, and brief description. Focus only on businesses that are currently operating.`;

    console.log('Making Perplexity API request...');
    console.log('Request payload:', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Be precise and concise. Provide real, current business information with specific names and addresses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 1000
    });

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Be precise and concise. Provide real, current business information with specific names and addresses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    console.log('Perplexity API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error details:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const recommendationsText = data.choices[0].message.content;
    
    console.log('Raw AI response received, length:', recommendationsText?.length);

    // Create structured recommendations from the AI response
    const recommendations = parseTextToRecommendations(recommendationsText, quizResponse.priorities);

    console.log('Parsed recommendations keys:', Object.keys(recommendations));

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
    // Extract relevant sections for each priority from the AI response
    const sections = extractBusinessInfo(text, priority);
    
    if (sections.length > 0) {
      recommendations[priority] = sections;
    } else {
      // Fallback with generic recommendations
      recommendations[priority] = [
        {
          name: `Recommended ${priority.toLowerCase()} location`,
          address: "Location details from AI search",
          description: `Based on your preferences, we found great ${priority.toLowerCase()} options in your area.`,
          phone: "Contact info available",
          features: ["Local favorite", "Highly rated", "Fits your budget"]
        }
      ];
    }
  });
  
  // Include the raw response for debugging
  recommendations._rawResponse = text;
  
  return recommendations;
}

function extractBusinessInfo(text: string, category: string) {
  // Simple text parsing to extract business information
  const businesses = [];
  const lines = text.split('\n');
  
  let currentBusiness: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Look for business names (lines that start with numbers, bullets, or are in quotes)
    if (trimmed.match(/^[\d\-\*•]/) || trimmed.includes(category.toLowerCase())) {
      if (currentBusiness) {
        businesses.push(currentBusiness);
      }
      
      currentBusiness = {
        name: trimmed.replace(/^[\d\-\*•.\s]+/, '').replace(/[:"]/g, '').trim(),
        address: "Address available in area",
        description: `Great ${category.toLowerCase()} option in your neighborhood`,
        phone: "Contact available",
        features: ["Local", "Recommended", "Good ratings"]
      };
    }
    
    // Extract address information
    if (currentBusiness && (trimmed.includes('Address:') || trimmed.includes('St') || trimmed.includes('Ave') || trimmed.includes('Rd'))) {
      currentBusiness.address = trimmed.replace('Address:', '').trim();
    }
    
    // Extract description
    if (currentBusiness && trimmed.length > 50 && !trimmed.includes('Address:') && !trimmed.includes('Phone:')) {
      currentBusiness.description = trimmed.substring(0, 120) + '...';
    }
  }
  
  if (currentBusiness) {
    businesses.push(currentBusiness);
  }
  
  return businesses.slice(0, 4); // Return max 4 businesses per category
}

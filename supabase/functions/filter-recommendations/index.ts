import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FilterRequest {
  userId: string;
  category: string;
  filters: string[];
  sortBy?: 'relevance' | 'distance' | 'rating';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: FilterRequest = await req.json();
    console.log('Filter request:', JSON.stringify(requestBody, null, 2));
    
    const { userId, category, filters, sortBy = 'relevance' } = requestBody;

    if (!userId || !category) {
      return new Response(JSON.stringify({ error: 'userId and category are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build filter conditions based on the applied filters
    let query = supabase
      .from('user_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category);

    // Apply metadata filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        switch (filter.toLowerCase()) {
          case 'organic':
          case 'organic options':
            query = query.eq('filter_metadata->>isOrganic', 'true');
            break;
          case '24/7':
          case '24 hours':
            query = query.eq('filter_metadata->>is24Hours', 'true');
            break;
          case 'pickup available':
          case 'pickup':
            query = query.eq('filter_metadata->>hasPickup', 'true');
            break;
          case 'budget-friendly':
          case 'budget':
            query = query.or('filter_metadata->>rating.gte.4,business_features.cs.{"Budget-Friendly"}');
            break;
          case 'high rated':
          case 'highly rated':
          case 'top rated':
            query = query.gte('filter_metadata->>rating', 4.0);
            break;
          case 'outdoor seating':
            query = query.eq('filter_metadata->>hasOutdoorSeating', 'true');
            break;
          case 'delivery':
            query = query.eq('filter_metadata->>hasDelivery', 'true');
            break;
          case 'vegetarian':
            query = query.eq('filter_metadata->>isVegetarian', 'true');
            break;
          case 'classes':
            query = query.eq('filter_metadata->>hasClasses', 'true');
            break;
          case 'pool':
            query = query.eq('filter_metadata->>hasPool', 'true');
            break;
          case 'personal training':
            query = query.eq('filter_metadata->>hasPersonalTraining', 'true');
            break;
          case 'nearby':
          case 'close':
            query = query.lte('distance_miles', 2);
            break;
          case 'local':
            query = query.contains('business_features', ['Local']);
            break;
          default:
            // Generic filter - search in business features
            query = query.or(`business_features.cs.{${filter}},business_name.ilike.%${filter}%`);
            break;
        }
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'distance':
        query = query.order('distance_miles', { ascending: true });
        break;
      case 'rating':
        query = query.order('filter_metadata->>rating', { ascending: false });
        break;
      case 'relevance':
      default:
        query = query.order('relevance_score', { ascending: false });
        break;
    }

    const { data: recommendations, error } = await query;

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Found ${recommendations?.length || 0} filtered recommendations`);

    // Calculate display logic
    let displayedRecommendations = recommendations || [];
    let additionalResults = 0;

    if (filters.length === 0) {
      // No filters - show only is_displayed recommendations
      displayedRecommendations = displayedRecommendations.filter(rec => rec.is_displayed);
    } else {
      // Filters applied - calculate additional results beyond the original 6
      const originalDisplayedCount = (recommendations || []).filter(rec => rec.is_displayed).length;
      additionalResults = Math.max(0, (recommendations?.length || 0) - originalDisplayedCount);
    }

    return new Response(
      JSON.stringify({
        recommendations: displayedRecommendations,
        totalCount: recommendations?.length || 0,
        additionalResults,
        appliedFilters: filters,
        sortBy
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in filter-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
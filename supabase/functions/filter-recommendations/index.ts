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
        const filterLower = filter.toLowerCase();
        
        // High rated filter - works for all categories
        if (filterLower.includes('high') && filterLower.includes('rated') || 
            filterLower.includes('top') && filterLower.includes('rated')) {
          query = query.gte('filter_metadata->>rating', 4.0);
        }
        // Distance-based filters
        else if (filterLower === 'nearby' || filterLower === 'close') {
          query = query.lte('distance_miles', 2);
        }
        // Local business filter
        else if (filterLower === 'local') {
          query = query.contains('business_features', ['Local']);
        }
        // Budget-friendly filter
        else if (filterLower.includes('budget')) {
          query = query.or('filter_metadata->>rating.gte.4,business_features.cs.{"Budget-Friendly"}');
        }
        // Grocery-specific filters
        else if (filterLower === 'organic' || filterLower === 'organic options') {
          query = query.eq('filter_metadata->>isOrganic', 'true');
        }
        else if (filterLower === '24/7' || filterLower === '24 hours') {
          query = query.eq('filter_metadata->>is24Hours', 'true');
        }
        else if (filterLower.includes('pickup')) {
          query = query.eq('filter_metadata->>hasPickup', 'true');
        }
        // Restaurant-specific filters
        else if (filterLower.includes('outdoor') && filterLower.includes('seating')) {
          query = query.eq('filter_metadata->>hasOutdoorSeating', 'true');
        }
        else if (filterLower === 'delivery') {
          query = query.eq('filter_metadata->>hasDelivery', 'true');
        }
        else if (filterLower === 'vegetarian') {
          query = query.eq('filter_metadata->>isVegetarian', 'true');
        }
        // Fitness-specific filters
        else if (filterLower === 'classes') {
          query = query.eq('filter_metadata->>hasClasses', 'true');
        }
        else if (filterLower === 'pool') {
          query = query.eq('filter_metadata->>hasPool', 'true');
        }
        else if (filterLower.includes('personal') && filterLower.includes('training')) {
          query = query.eq('filter_metadata->>hasPersonalTraining', 'true');
        }
        // Education filters
        else if (filterLower === 'public') {
          query = query.contains('business_features', ['Public']);
        }
        else if (filterLower === 'private') {
          query = query.contains('business_features', ['Private']);
        }
        // Recreation filters
        else if (filterLower === 'free') {
          query = query.contains('business_features', ['Free']);
        }
        else if (filterLower.includes('family') && filterLower.includes('friendly')) {
          query = query.contains('business_features', ['Family-Friendly']);
        }
        else if (filterLower.includes('dog') && filterLower.includes('friendly')) {
          query = query.contains('business_features', ['Dog-Friendly']);
        }
        // Medical filters
        else if (filterLower === 'specialist') {
          query = query.contains('business_features', ['Specialist']);
        }
        // Faith community denomination filters
        else if (filterLower === 'catholic') {
          query = query.or(`business_name.ilike.%Catholic%,business_description.ilike.%Catholic%,business_features.cs.{"Catholic"}`);
        }
        else if (filterLower === 'baptist') {
          query = query.or(`business_name.ilike.%Baptist%,business_description.ilike.%Baptist%,business_features.cs.{"Baptist"}`);
        }
        else if (filterLower === 'methodist') {
          query = query.or(`business_name.ilike.%Methodist%,business_description.ilike.%Methodist%,business_features.cs.{"Methodist"}`);
        }
        else if (filterLower === 'lutheran') {
          query = query.or(`business_name.ilike.%Lutheran%,business_description.ilike.%Lutheran%,business_features.cs.{"Lutheran"}`);
        }
        else if (filterLower === 'presbyterian') {
          query = query.or(`business_name.ilike.%Presbyterian%,business_description.ilike.%Presbyterian%,business_features.cs.{"Presbyterian"}`);
        }
        else if (filterLower === 'non-denominational') {
          query = query.or(`business_name.ilike.%Non-denominational%,business_description.ilike.%Community%,business_features.cs.{"Non-denominational"}`);
        }
        // Generic filter - search in business features and name/description
        else {
          query = query.or(`business_features.cs.{"${filter}"},business_name.ilike.%${filter}%,business_description.ilike.%${filter}%`);
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
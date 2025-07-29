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
          query = query.or('filter_metadata->>isOrganic.eq.true,business_features.cs.{"Organic"},business_name.ilike.%organic%');
        }
        else if (filterLower === '24/7' || filterLower === '24 hours') {
          query = query.or('filter_metadata->>is24Hours.eq.true,business_features.cs.{"24/7"},business_name.ilike.%24%');
        }
        else if (filterLower.includes('pickup')) {
          query = query.or('filter_metadata->>hasPickup.eq.true,business_features.cs.{"Pickup"},business_name.ilike.%pickup%');
        }
        // Restaurant-specific filters
        else if (filterLower.includes('outdoor') && filterLower.includes('seating')) {
          query = query.or('filter_metadata->>hasOutdoorSeating.eq.true,business_features.cs.{"Outdoor Seating"},business_name.ilike.%outdoor%');
        }
        else if (filterLower === 'delivery') {
          query = query.or('filter_metadata->>hasDelivery.eq.true,business_features.cs.{"Delivery"},business_name.ilike.%delivery%');
        }
        else if (filterLower === 'vegetarian') {
          query = query.or('filter_metadata->>isVegetarian.eq.true,business_features.cs.{"Vegetarian"},business_name.ilike.%vegetarian%');
        }
        // Fitness-specific filters
        else if (filterLower === 'classes') {
          query = query.or('filter_metadata->>hasClasses.eq.true,business_features.cs.{"Classes"},business_name.ilike.%classes%,business_description.ilike.%classes%');
        }
        else if (filterLower === 'pool') {
          query = query.or('filter_metadata->>hasPool.eq.true,business_features.cs.{"Pool"},business_name.ilike.%pool%');
        }
        else if (filterLower.includes('personal') && filterLower.includes('training')) {
          query = query.or('filter_metadata->>hasPersonalTraining.eq.true,business_features.cs.{"Personal Training"},business_name.ilike.%personal%');
        }
        // Education filters
        else if (filterLower === 'public') {
          query = query.or('business_features.cs.{"Public"},business_name.ilike.%public%');
        }
        else if (filterLower === 'private') {
          query = query.or('business_features.cs.{"Private"},business_name.ilike.%private%');
        }
        // Recreation filters
        else if (filterLower === 'free') {
          query = query.or('business_features.cs.{"Free"},business_name.ilike.%free%');
        }
        else if (filterLower.includes('family') && filterLower.includes('friendly')) {
          query = query.or('business_features.cs.{"Family-Friendly"},business_name.ilike.%family%');
        }
        else if (filterLower.includes('dog') && filterLower.includes('friendly')) {
          query = query.or('business_features.cs.{"Dog-Friendly"},business_name.ilike.%dog%');
        }
        // Medical filters
        else if (filterLower === 'specialist') {
          query = query.or('business_features.cs.{"Specialist"},business_name.ilike.%specialist%');
        }
        // Faith community denomination filters with smart matching
        else if (filterLower === 'catholic') {
          query = query.or('business_name.ilike.%Sacred Heart%,business_name.ilike.%St.%,business_name.ilike.%Saint%,business_name.ilike.%Catholic%,business_features.cs.{"Catholic"}');
        }
        else if (filterLower === 'baptist') {
          query = query.or('business_name.ilike.%Baptist%,business_features.cs.{"Baptist"}');
        }
        else if (filterLower === 'methodist') {
          query = query.or('business_name.ilike.%Methodist%,business_name.ilike.%Wesleyan%,business_features.cs.{"Methodist"}');
        }
        else if (filterLower === 'lutheran') {
          query = query.or('business_name.ilike.%Lutheran%,business_features.cs.{"Lutheran"}');
        }
        else if (filterLower === 'presbyterian') {
          query = query.or('business_name.ilike.%Presbyterian%,business_features.cs.{"Presbyterian"}');
        }
        else if (filterLower === 'non-denominational') {
          query = query.or('business_name.ilike.%Community%,business_name.ilike.%Fellowship%,business_name.ilike.%Gospel%,business_features.cs.{"Non-denominational"}');
        }
        // Generic filter - search broadly across name, description, and features
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
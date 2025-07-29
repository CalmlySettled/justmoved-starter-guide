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

    // Apply smart search-based filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        const filterLower = filter.toLowerCase();
        
        // High rated filter - works for all categories
        if (filterLower.includes('high') && filterLower.includes('rated')) {
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
          query = query.or('filter_metadata->>rating.gte.4,business_name.ilike.%budget%,business_name.ilike.%affordable%,business_name.ilike.%discount%');
        }
        
        // Smart search filters - search across name, description, and features for ALL categories
        else if (filterLower === 'organic') {
          query = query.or('business_name.ilike.%organic%,business_description.ilike.%organic%,business_features.cs.{"Organic"}');
        }
        else if (filterLower === '24/7' || filterLower === '24 hours') {
          query = query.or('business_name.ilike.%24%,business_description.ilike.%24 hour%,business_features.cs.{"24/7"}');
        }
        else if (filterLower.includes('pickup')) {
          query = query.or('business_name.ilike.%pickup%,business_description.ilike.%pickup%,business_features.cs.{"Pickup"}');
        }
        else if (filterLower.includes('outdoor') && filterLower.includes('seating')) {
          query = query.or('business_name.ilike.%outdoor%,business_description.ilike.%outdoor%,business_description.ilike.%patio%');
        }
        else if (filterLower === 'delivery') {
          query = query.or('business_name.ilike.%delivery%,business_description.ilike.%delivery%,business_features.cs.{"Delivery"}');
        }
        else if (filterLower === 'vegetarian') {
          query = query.or('business_name.ilike.%vegetarian%,business_description.ilike.%vegetarian%,business_description.ilike.%vegan%');
        }
        else if (filterLower === 'classes') {
          query = query.or('business_name.ilike.%classes%,business_description.ilike.%classes%,business_description.ilike.%group%,business_description.ilike.%training%');
        }
        else if (filterLower === 'pool') {
          query = query.or('business_name.ilike.%pool%,business_description.ilike.%pool%,business_description.ilike.%swimming%');
        }
        else if (filterLower.includes('personal') && filterLower.includes('training')) {
          query = query.or('business_name.ilike.%personal%,business_description.ilike.%personal%,business_description.ilike.%1-on-1%,business_description.ilike.%trainer%');
        }
        else if (filterLower === 'public') {
          query = query.or('business_name.ilike.%public%,business_description.ilike.%public%');
        }
        else if (filterLower === 'private') {
          query = query.or('business_name.ilike.%private%,business_description.ilike.%private%');
        }
        else if (filterLower === 'free') {
          query = query.or('business_name.ilike.%free%,business_description.ilike.%free%');
        }
        else if (filterLower.includes('family') && filterLower.includes('friendly')) {
          query = query.or('business_name.ilike.%family%,business_description.ilike.%family%,business_description.ilike.%kids%,business_description.ilike.%children%');
        }
        else if (filterLower.includes('dog') && filterLower.includes('friendly')) {
          query = query.or('business_name.ilike.%dog%,business_description.ilike.%dog%,business_description.ilike.%pet%');
        }
        else if (filterLower === 'specialist') {
          query = query.or('business_name.ilike.%specialist%,business_description.ilike.%specialist%,business_description.ilike.%specialty%');
        }
        
        // Faith community smart matching
        else if (filterLower === 'catholic') {
          query = query.or('business_name.ilike.%Sacred Heart%,business_name.ilike.%St.%,business_name.ilike.%Saint%,business_name.ilike.%Catholic%');
        }
        else if (filterLower === 'baptist') {
          query = query.or('business_name.ilike.%Baptist%');
        }
        else if (filterLower === 'methodist') {
          query = query.or('business_name.ilike.%Methodist%,business_name.ilike.%Wesleyan%');
        }
        else if (filterLower === 'lutheran') {
          query = query.or('business_name.ilike.%Lutheran%');
        }
        else if (filterLower === 'presbyterian') {
          query = query.or('business_name.ilike.%Presbyterian%');
        }
        else if (filterLower === 'non-denominational') {
          query = query.or('business_name.ilike.%Community%,business_name.ilike.%Fellowship%,business_name.ilike.%Gospel%');
        }
        
        // Generic filter - broad search across all text fields
        else {
          query = query.or(`business_name.ilike.%${filter}%,business_description.ilike.%${filter}%,business_features.cs.{"${filter}"}`);
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
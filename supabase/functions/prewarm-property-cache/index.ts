import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { propertyId, categories } = await req.json()

    if (!propertyId) {
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (propertyError || !property) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!property.latitude || !property.longitude) {
      return new Response(
        JSON.stringify({ error: 'Property coordinates not available' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const defaultCategories = [
      'restaurants', 'grocery_stores', 'pharmacies', 'gyms', 'banks', 
      'gas_stations', 'coffee_shops', 'beauty_salons', 'medical', 'shopping'
    ]

    const categoriesToCache = categories || defaultCategories
    const userLocation = `${property.latitude},${property.longitude}`

    // Generate recommendations for each category
    const results = await Promise.all(
      categoriesToCache.map(async (category: string) => {
        try {
          console.log(`Generating recommendations for category: ${category}`)
          
          const { data, error } = await supabase.functions.invoke('generate-recommendations', {
            body: {
              categories: [category],
              userLocation,
              preferences: {},
              propertyId: propertyId
            }
          })

          if (error) {
            console.error(`Error generating recommendations for ${category}:`, error)
            return { category, success: false, error: error.message }
          }

          console.log(`Successfully cached ${category} recommendations`)
          return { category, success: true, count: data?.recommendations?.[category]?.length || 0 }
        } catch (error) {
          console.error(`Exception generating recommendations for ${category}:`, error)
          return { category, success: false, error: error.message }
        }
      })
    )

    // Update property cache timestamp
    await supabase
      .from('properties')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId)

    const successfulCategories = results.filter(r => r.success)
    const failedCategories = results.filter(r => !r.success)

    return new Response(
      JSON.stringify({
        success: true,
        propertyId,
        totalCategories: categoriesToCache.length,
        successfulCategories: successfulCategories.length,
        failedCategories: failedCategories.length,
        results: results,
        message: `Pre-warmed cache for ${successfulCategories.length}/${categoriesToCache.length} categories`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in prewarm-property-cache function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
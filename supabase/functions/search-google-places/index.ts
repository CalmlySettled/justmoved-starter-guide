import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, limit = 5, location } = await req.json()
    
    console.log('[SEARCH-GOOGLE-PLACES] Request received:', { query, limit, location })
    
    if (!query) {
      console.error('[SEARCH-GOOGLE-PLACES] Missing query parameter')
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate limit to prevent abuse
    const maxResults = Math.min(Math.max(limit, 1), 20)
    console.log('[SEARCH-GOOGLE-PLACES] Using maxResults:', maxResults)

    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('[SEARCH-GOOGLE-PLACES] API key not configured')
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use Google Places Autocomplete API with optional location bias
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment&key=${GOOGLE_PLACES_API_KEY}`
    
    if (location) {
      url += `&location=${location}&radius=50000` // 50km radius
    }
    
    console.log('[SEARCH-GOOGLE-PLACES] Calling Google API:', url.replace(GOOGLE_PLACES_API_KEY, 'REDACTED'))
    
    const response = await fetch(url)
    console.log('[SEARCH-GOOGLE-PLACES] Google API response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SEARCH-GOOGLE-PLACES] Google API HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`Google Places API HTTP error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[SEARCH-GOOGLE-PLACES] Google API response data:', {
      status: data.status,
      predictions_count: data.predictions?.length || 0,
      error_message: data.error_message
    })

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[SEARCH-GOOGLE-PLACES] Google API returned error status:', {
        status: data.status,
        error_message: data.error_message,
        full_response: data
      })
      
      // Return more detailed error to frontend
      return new Response(
        JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          details: data.error_message || 'No additional details',
          google_status: data.status
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limit results to requested amount
    const limitedData = {
      ...data,
      predictions: data.predictions ? data.predictions.slice(0, maxResults) : []
    }

    console.log('[SEARCH-GOOGLE-PLACES] Returning success:', {
      predictions_count: limitedData.predictions.length
    })

    return new Response(
      JSON.stringify(limitedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[SEARCH-GOOGLE-PLACES] Caught error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        error: error.message,
        error_type: error.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
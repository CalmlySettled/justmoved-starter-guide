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
    const { place_id, place_ids } = await req.json()
    
    // Support both single and batch requests
    const isBatch = Array.isArray(place_ids)
    const ids = isBatch ? place_ids : (place_id ? [place_id] : [])
    
    if (ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Place ID(s) required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Limit batch requests to prevent abuse
    if (ids.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Maximum 20 place IDs per request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare fields for detailed info
    const fields = [
      'name',
      'formatted_address', 
      'rating',
      'formatted_phone_number',
      'website',
      'opening_hours',
      'types',
      'geometry'
    ].join(',')

    // Fetch details for all place IDs in parallel
    const fetchPromises = ids.map(async (id: string) => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`
        )

        if (!response.ok) {
          console.error(`Failed to fetch details for ${id}: ${response.status}`)
          return null
        }

        const data = await response.json()

        if (data.status !== 'OK') {
          console.error(`Google Places API error for ${id}: ${data.status}`)
          return null
        }

        return data.result
      } catch (error) {
        console.error(`Error fetching place ${id}:`, error)
        return null
      }
    })

    const results = await Promise.all(fetchPromises)

    // Return single result or batch results
    if (isBatch) {
      return new Response(
        JSON.stringify({ results }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify(results[0]),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in get-place-details function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ticketmasterApiKey = Deno.env.get('TICKETMASTER_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TicketmasterEvent {
  id: string;
  name: string;
  info?: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    end?: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      address?: {
        line1?: string;
        line2?: string;
      };
      city?: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      location?: {
        latitude: string;
        longitude: string;
      };
    }>;
  };
  url: string;
  images?: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  classifications?: Array<{
    segment?: {
      name: string;
    };
    genre?: {
      name: string;
    };
  }>;
  priceRanges?: Array<{
    min: number;
    max: number;
  }>;
}

interface ProcessedEvent {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  ticket_url: string;
  logo_url?: string;
  category: string;
  is_free: boolean;
  distance_miles: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateCacheKey(latitude: number, longitude: number): string {
  const roundedLat = Math.round(latitude * 100) / 100;
  const roundedLng = Math.round(longitude * 100) / 100;
  return `events_${roundedLat}_${roundedLng}`;
}

async function fetchEventsFromAPI(latitude: number, longitude: number): Promise<ProcessedEvent[]> {
  if (!ticketmasterApiKey) {
    console.warn('⚠️ TICKETMASTER_API_KEY not configured, using sample data');
    return getSampleEvents(latitude, longitude);
  }

  try {
    console.log(`🎟️ Fetching events from Ticketmaster for location: ${latitude}, ${longitude}`);
    
    // Build Ticketmaster API URL
    const apiUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    apiUrl.searchParams.set('apikey', ticketmasterApiKey);
    apiUrl.searchParams.set('geoPoint', `${latitude},${longitude}`);
    apiUrl.searchParams.set('radius', '25'); // 25 miles radius
    apiUrl.searchParams.set('unit', 'miles');
    apiUrl.searchParams.set('sort', 'date,asc');
    apiUrl.searchParams.set('size', '20'); // Max 20 events
    apiUrl.searchParams.set('includeTest', 'no');
    
    // Only include future events
    const now = new Date();
    const startDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    apiUrl.searchParams.set('startDateTime', `${startDate}T00:00:00Z`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data._embedded?.events) {
      console.log('📭 No events found from Ticketmaster');
      return [];
    }

    const events: ProcessedEvent[] = data._embedded.events.map((event: TicketmasterEvent) => {
      const venue = event._embedded?.venues?.[0];
      const venueLocation = venue?.location;
      const venueAddress = [
        venue?.address?.line1,
        venue?.city?.name,
        venue?.state?.stateCode
      ].filter(Boolean).join(', ') || 'Address not available';

      // Calculate distance if venue has coordinates
      let distance = 0;
      if (venueLocation?.latitude && venueLocation?.longitude) {
        distance = calculateDistance(
          latitude,
          longitude,
          parseFloat(venueLocation.latitude),
          parseFloat(venueLocation.longitude)
        );
      }

      // Format dates
      const startDate = event.dates.start.dateTime || 
        `${event.dates.start.localDate}T${event.dates.start.localTime || '19:00:00'}`;
      const endDate = event.dates.end?.dateTime || 
        event.dates.end?.localDate ? 
          `${event.dates.end.localDate}T${event.dates.end.localTime || '22:00:00'}` :
          new Date(new Date(startDate).getTime() + 3 * 60 * 60 * 1000).toISOString(); // +3 hours default

      // Get category from classifications
      const category = event.classifications?.[0]?.segment?.name?.toLowerCase() || 
        event.classifications?.[0]?.genre?.name?.toLowerCase() || 'entertainment';

      // Get event image
      const logoUrl = event.images?.find(img => img.width >= 300)?.url || 
        event.images?.[0]?.url;

      // Check if event is free (no price ranges typically means free or TBD)
      const isFree = !event.priceRanges || event.priceRanges.length === 0;

      return {
        id: event.id,
        name: event.name,
        description: event.info || `${category} event - check Ticketmaster for full details`,
        start_date: startDate,
        end_date: endDate,
        venue: {
          name: venue?.name || 'Venue TBD',
          address: venueAddress,
          latitude: venueLocation?.latitude ? parseFloat(venueLocation.latitude) : latitude,
          longitude: venueLocation?.longitude ? parseFloat(venueLocation.longitude) : longitude,
        },
        ticket_url: event.url,
        logo_url: logoUrl,
        category,
        is_free: isFree,
        distance_miles: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    });

    console.log(`🎟️ Found ${events.length} events from Ticketmaster`);
    return events;
    
  } catch (error) {
    console.error('❌ Error fetching from Ticketmaster:', error);
    console.log('🔄 Falling back to sample events');
    return getSampleEvents(latitude, longitude);
  }
}

function getSampleEvents(latitude: number, longitude: number): ProcessedEvent[] {
  console.log(`🎭 Generating sample events for location: ${latitude}, ${longitude}`);
  
  const today = new Date();
  const sampleEvents: ProcessedEvent[] = [
    {
      id: 'sample-1',
      name: 'Community Farmers Market',
      description: 'Fresh local produce, artisanal goods, and live music in the heart of downtown.',
      start_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      venue: {
        name: 'Downtown Square',
        address: 'Main St & Center Ave',
        latitude: latitude + 0.01,
        longitude: longitude + 0.01,
      },
      ticket_url: '#',
      category: 'community',
      is_free: true,
      distance_miles: 0.8,
    },
    {
      id: 'sample-2', 
      name: 'Local Art Gallery Opening',
      description: 'Featuring works by emerging local artists. Wine and light refreshments provided.',
      start_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      venue: {
        name: 'River Arts Gallery',
        address: '123 Gallery Row',
        latitude: latitude + 0.02,
        longitude: longitude - 0.01,
      },
      ticket_url: '#',
      category: 'arts',
      is_free: true,
      distance_miles: 1.2,
    },
    {
      id: 'sample-3',
      name: 'Live Jazz at the Rooftop',
      description: 'Smooth jazz under the stars with cocktails and city views.',
      start_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      venue: {
        name: 'Skyline Lounge',
        address: '456 High St',
        latitude: latitude - 0.01,
        longitude: longitude + 0.02,
      },
      ticket_url: '#',
      category: 'music',
      is_free: false,
      distance_miles: 2.1,
    },
  ];

  return sampleEvents;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: 'Latitude and longitude are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cache first
    const cacheKey = generateCacheKey(latitude, longitude);
    console.log(`🔍 Checking cache for key: ${cacheKey}`);

    const { data: cachedData } = await supabase
      .from('recommendations_cache')
      .select('recommendations, created_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData) {
      console.log('💰 CACHE HIT: Events found in cache, saved API costs!');
      return new Response(JSON.stringify({ 
        events: cachedData.recommendations,
        cached: true,
        cached_at: cachedData.created_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh events
    const events = await fetchEventsFromAPI(latitude, longitude);

    // Cache the results for 7 days (was 24 hours)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('recommendations_cache')
      .insert({
        cache_key: cacheKey,
        user_coordinates: `(${latitude},${longitude})`,
        recommendations: events,
        categories: ['events'],
        preferences: {},
        expires_at: expiresAt,
      });

    console.log(`💾 CACHED: Events for ${Math.round(7 * 24)} hours (7 days)`);

    return new Response(JSON.stringify({ 
      events,
      cached: false,
      total_found: events.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-events function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      events: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
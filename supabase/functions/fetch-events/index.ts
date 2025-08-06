import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const eventbriteApiKey = Deno.env.get('EVENTBRITE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text: string;
  };
  start: {
    utc: string;
    local: string;
  };
  end: {
    utc: string;
    local: string;
  };
  venue: {
    name: string;
    address: {
      address_1: string;
      city: string;
      region: string;
    };
    latitude: string;
    longitude: string;
  };
  url: string;
  logo: {
    original: {
      url: string;
    };
  } | null;
  category_id: string;
  is_free: boolean;
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
  // EventBrite discontinued public access to their Event Search API in 2020
  // For now, return sample events data to demonstrate the functionality
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

  console.log(`📅 Generated ${sampleEvents.length} sample events`);
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

    // Cache the results for 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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

    console.log(`💾 CACHED: Events for ${Math.round(24)} hours`);

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
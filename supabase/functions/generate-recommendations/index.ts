import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizResponse {
  address: string;
  householdType: string;
  priorities: string[];
  transportationStyle: string;
  budgetPreference: string;
  lifeStage: string;
  settlingTasks: string[];
}

interface Business {
  name: string;
  address: string;
  description: string;
  phone: string;
  features: string[];
  hours?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
}

// Helper function to get coordinates from address using OpenStreetMap Nominatim
async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`, {
      headers: {
        'User-Agent': 'CalmlySettled/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
  } catch (error) {
    console.error('Error getting coordinates from address:', error);
  }
  return null;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Mock data generator function with real business data including coordinates
function generateMockBusinesses(category: string, userCoordinates: { lat: number; lng: number }): Business[] {
  const mockBusinesses: { [key: string]: Business[] } = {
    "grocery stores": [
      {
        name: "Geissler's Supermarket",
        address: "40 Tunxis Ave, Bloomfield, CT 06002",
        description: "Family-owned market with great produce",
        phone: "(860) 242‑7084",
        features: ["Local", "Organic Options", "Budget-Friendly"],
        hours: "Mon–Sat 8am–9pm, Sun 8am–7pm",
        latitude: 41.8170,
        longitude: -72.7251
      },
      {
        name: "Stop & Shop",
        address: "313 Cottage Grove Rd, Bloomfield, CT 06002",
        description: "Large chain store with pharmacy and gas station",
        phone: "(860) 242‑2424",
        features: ["Chain", "High Ratings", "Accessible"],
        hours: "Open daily 6am–10pm",
        latitude: 41.8188,
        longitude: -72.7345
      },
      {
        name: "Fresh Farm Market",
        address: "1055 Blue Hills Ave, Bloomfield, CT 06002",
        description: "Local market known for vibrant produce",
        phone: "(860) 242‑1183",
        features: ["Local", "International Foods", "Walkable"],
        latitude: 41.8156,
        longitude: -72.7089
      },
      {
        name: "Sav-Mor Supermarket",
        address: "1055 Blue Hills Ave #1, Bloomfield, CT 06002",
        description: "Community staple for everyday groceries",
        phone: "(860) 242‑7759",
        features: ["Budget-Friendly", "Local"],
        latitude: 41.8156,
        longitude: -72.7089
      },
      {
        name: "Aldi",
        address: "44 Kane St, West Hartford, CT 06119",
        description: "Low-cost grocery chain with curbside and delivery",
        phone: "(855) 955‑2534",
        features: ["Chain", "Pickup Available", "Budget-Friendly"],
        latitude: 41.7658,
        longitude: -72.7425
      }
    ],
    "fitness gyms": [
      {
        name: "Total Health Club",
        address: "22 Mountain Ave, Bloomfield, CT 06002",
        description: "Full-service gym with group classes and personal training",
        phone: "(860) 242‑9400",
        features: ["Local", "Group Classes", "Personal Training"],
        latitude: 41.8149,
        longitude: -72.7267
      },
      {
        name: "Planet Fitness",
        address: "841 Albany Ave, Hartford, CT 06112",
        description: "Affordable 24/7 gym for all fitness levels",
        phone: "(860) 522‑4600",
        features: ["Chain", "24-Hour Access", "Budget Membership"],
        latitude: 41.7658,
        longitude: -72.6851
      },
      {
        name: "Club Fitness",
        address: "107 Old Windsor Rd, Bloomfield, CT 06002",
        description: "3-level cardio/strength gym with classes",
        phone: "(860) 242‑1234",
        features: ["Full Equipment", "Group Classes", "Personal Training"],
        latitude: 41.8234,
        longitude: -72.7156
      },
      {
        name: "Gold's Gym",
        address: "39 W Main St, Avon, CT 06001",
        description: "Classic gym experience with serious strength training",
        phone: "(860) 677‑4348",
        features: ["Strength-Focused", "Franchise"],
        latitude: 41.7976,
        longitude: -72.8309
      },
      {
        name: "Bloomfield Fit Body Boot Camp",
        address: "10 Mountain Ave, Bloomfield, CT 06002",
        description: "High-energy, group HIIT gym with coaching",
        phone: "(860) 952‑3324",
        features: ["HIIT", "Trainer-Led", "Community-Based"],
        latitude: 41.8149,
        longitude: -72.7267
      }
    ],
    "churches religious": [
      {
        name: "Wintonbury Church",
        address: "54 Maple Ave, Bloomfield, CT 06002",
        description: "Non-denominational church with contemporary worship",
        phone: "(860) 243‑8779",
        features: ["Contemporary", "Small Groups", "Childcare"],
        hours: "Sunday Worship: 10am",
        latitude: 41.8167,
        longitude: -72.7234
      },
      {
        name: "Sacred Heart Church",
        address: "26 Wintonbury Ave, Bloomfield, CT 06002",
        description: "Catholic parish offering mass and confession",
        phone: "(860) 242‑4142",
        features: ["Catholic", "Historic", "Traditional"],
        hours: "Mass Times: Sat 4pm, Sun 9:30am",
        latitude: 41.8123,
        longitude: -72.7198
      },
      {
        name: "The First Cathedral",
        address: "1151 Blue Hills Ave, Bloomfield, CT 06002",
        description: "Large Baptist church with extensive community programs",
        phone: "(860) 243‑6520",
        features: ["Baptist", "Youth Programs", "Community Outreach"],
        hours: "Sunday Worship: 10am",
        latitude: 41.8156,
        longitude: -72.7089
      },
      {
        name: "Old St. Andrew's Episcopal Church",
        address: "59 Tariffville Rd, Bloomfield, CT 06002",
        description: "Inclusive, historic Anglican church with modern services",
        phone: "(860) 242‑4660",
        features: ["Episcopal", "LGBTQ+ Friendly", "Historic"],
        hours: "Sunday Services: 9am & 10:30am",
        latitude: 41.8245,
        longitude: -72.7023
      },
      {
        name: "Bloomfield Congregational Church",
        address: "10 Wintonbury Ave, Bloomfield, CT 06002",
        description: "Open & affirming UCC congregation with family programs",
        phone: "(860) 242‑0776",
        features: ["UCC", "Family-Friendly", "Inclusive"],
        hours: "Sunday Worship: 10am",
        latitude: 41.8123,
        longitude: -72.7198
      }
    ]
  };

  const businesses = mockBusinesses[category] || [];
  
  // Calculate distances and add them to businesses
  const businessesWithDistance = businesses.map(business => {
    if (business.latitude && business.longitude) {
      const distance = calculateDistance(
        userCoordinates.lat, 
        userCoordinates.lng, 
        business.latitude, 
        business.longitude
      );
      return { ...business, distance_miles: distance };
    }
    return business;
  });

  // Sort by distance (closest first)
  businessesWithDistance.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));

  return businessesWithDistance;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    // Get coordinates from address
    const coordinates = await getCoordinatesFromAddress(quizResponse.address);
    if (!coordinates) {
      throw new Error('Could not get coordinates for the provided address');
    }

    // Generate recommendations based on user priorities
    const recommendations = await generateRecommendations(quizResponse, coordinates);

    console.log('Generated recommendations keys:', Object.keys(recommendations));

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

async function generateRecommendations(quizResponse: QuizResponse, coordinates: { lat: number; lng: number }) {
  const recommendations: { [key: string]: Business[] } = {};
  
  // Map user priorities to search terms
  const priorityMap: { [key: string]: string } = {
    "grocery stores": "grocery stores",
    "grocery": "grocery stores",
    "food": "grocery stores",
    "shopping": "grocery stores",
    "fitness options": "fitness gyms",
    "fitness": "fitness gyms",
    "gym": "fitness gyms",
    "exercise": "fitness gyms",
    "health": "fitness gyms",
    "faith communities": "churches religious",
    "church": "churches religious",
    "religious": "churches religious",
    "spiritual": "churches religious",
    "worship": "churches religious"
  };

  console.log('Priority map keys:', Object.keys(priorityMap));
  console.log('User priorities received:', quizResponse.priorities);

  // For each user priority, search for businesses
  for (const priority of quizResponse.priorities) {
    const priorityLower = priority.toLowerCase();
    console.log(`Processing priority: "${priority}" (lowercase: "${priorityLower}")`);
    
    // Check for direct matches or partial matches
    let foundMatch = false;
    for (const [key, searchTerm] of Object.entries(priorityMap)) {
      if (priorityLower.includes(key) || key.includes(priorityLower)) {
        console.log(`Found match for "${priority}" with key "${key}", generating mock data for "${searchTerm}"`);
        foundMatch = true;
        
        const businesses = generateMockBusinesses(searchTerm, coordinates);
        console.log(`Generated ${businesses.length} mock businesses for "${searchTerm}"`);
        
        if (businesses.length > 0) {
          recommendations[priority] = businesses;
          console.log(`Added ${businesses.length} businesses to recommendations for "${priority}"`);
        }
        break;
      }
    }
    
    if (!foundMatch) {
      console.log(`No match found for priority: "${priority}"`);
    }
  }

  // If no specific matches found, add some default categories
  if (Object.keys(recommendations).length === 0) {
    recommendations["Grocery stores"] = generateMockBusinesses("grocery stores", coordinates);
    recommendations["Fitness options"] = generateMockBusinesses("fitness gyms", coordinates);
    recommendations["Faith communities"] = generateMockBusinesses("churches religious", coordinates);
  }

  return recommendations;
}
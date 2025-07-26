import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizResponse {
  zipCode: string;
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
}

// Helper function to get coordinates from zip code
async function getCoordinatesFromZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (response.ok) {
      const data = await response.json();
      return {
        lat: parseFloat(data.places[0].latitude),
        lng: parseFloat(data.places[0].longitude)
      };
    }
  } catch (error) {
    console.error('Error getting coordinates from zip:', error);
  }
  return null;
}

// Mock data generator function
function generateMockBusinesses(category: string, coordinates: { lat: number; lng: number }): Business[] {
  const mockBusinesses: { [key: string]: Business[] } = {
    "grocery stores": [
      {
        name: "Fresh Market",
        address: "123 Main St, Your City, State 12345",
        description: "Full-service grocery store with organic options",
        phone: "(555) 123-4567",
        features: ["4.5 stars", "Organic produce", "Deli counter", "Pharmacy"],
        hours: "6:00 AM - 11:00 PM daily",
        website: "https://freshmarket.com"
      },
      {
        name: "Corner Grocery",
        address: "456 Oak Ave, Your City, State 12345",
        description: "Neighborhood grocery with local products",
        phone: "(555) 234-5678",
        features: ["4.2 stars", "Local products", "Fresh bread", "Wine selection"],
        hours: "7:00 AM - 10:00 PM daily"
      }
    ],
    "fitness gyms": [
      {
        name: "FitLife Gym",
        address: "789 Fitness Blvd, Your City, State 12345",
        description: "Full-service gym with modern equipment",
        phone: "(555) 345-6789",
        features: ["4.8 stars", "24/7 access", "Personal training", "Group classes"],
        hours: "24 hours",
        website: "https://fitlifegym.com"
      },
      {
        name: "Community Recreation Center",
        address: "321 Sports Dr, Your City, State 12345",
        description: "Public recreation facility with pool and courts",
        phone: "(555) 456-7890",
        features: ["4.3 stars", "Swimming pool", "Basketball courts", "Affordable rates"],
        hours: "5:00 AM - 10:00 PM"
      }
    ],
    "churches religious": [
      {
        name: "Community Fellowship Church",
        address: "654 Faith St, Your City, State 12345",
        description: "Welcoming community church with diverse congregation",
        phone: "(555) 567-8901",
        features: ["Active community", "Youth programs", "Food pantry", "Music ministry"],
        hours: "Sunday 9:00 AM & 11:00 AM services",
        website: "https://communityfellowship.org"
      },
      {
        name: "Sacred Heart Catholic Church",
        address: "987 Chapel Rd, Your City, State 12345",
        description: "Traditional Catholic parish serving the community",
        phone: "(555) 678-9012",
        features: ["Historic building", "Daily mass", "Religious education", "Community outreach"],
        hours: "Daily mass 8:00 AM, Sunday 8:00 AM & 10:30 AM"
      }
    ]
  };

  return mockBusinesses[category] || [];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    // Get coordinates from zip code
    const coordinates = await getCoordinatesFromZip(quizResponse.zipCode);
    if (!coordinates) {
      throw new Error('Could not get coordinates for the provided zip code');
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
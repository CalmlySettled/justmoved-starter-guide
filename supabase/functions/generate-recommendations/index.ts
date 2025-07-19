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

// Your specific business data
const localBusinesses: { [key: string]: Business[] } = {
  "grocery stores": [
    {
      name: "Geissler's Supermarket",
      address: "40 Tunxis Ave, Bloomfield, CT 06002",
      description: "Family-owned market with great produce",
      phone: "(860) 242-7084",
      hours: "Mon–Sat 8am–9pm, Sun 8am–7pm",
      features: ["Local", "Organic Options", "Budget-Friendly", "Family-owned", "Fresh produce"]
    },
    {
      name: "Stop & Shop",
      address: "313 Cottage Grove Rd, Bloomfield, CT 06002",
      description: "Large chain store with pharmacy and gas station",
      phone: "(860) 242-2424",
      hours: "Open daily 6am–10pm",
      features: ["Chain", "High Ratings", "Accessible", "Pharmacy", "Gas station", "Parking Available"]
    },
    {
      name: "Fresh Farm Market",
      address: "1055 Blue Hills Ave, Bloomfield, CT 06002",
      description: "Local market known for vibrant produce",
      phone: "(860) 242-1183",
      features: ["Local", "International Foods", "Walkable", "Fresh produce", "Vibrant selection"]
    },
    {
      name: "Sav-Mor Supermarket",
      address: "1055 Blue Hills Ave #1, Bloomfield, CT 06002",
      description: "Community staple for everyday groceries",
      phone: "(860) 242-7759",
      features: ["Budget-Friendly", "Local", "Community favorite", "Everyday needs"]
    },
    {
      name: "Aldi",
      address: "44 Kane St, West Hartford, CT 06119",
      description: "Low-cost grocery chain with curbside and delivery",
      phone: "(855) 955-2534",
      features: ["Chain", "Pickup Available", "Budget-Friendly", "Delivery Available", "Low prices"]
    }
  ],
  "fitness options": [
    {
      name: "Total Health Club",
      address: "22 Mountain Ave, Bloomfield, CT 06002",
      description: "Full-service gym with group classes and personal training",
      phone: "(860) 242-9400",
      features: ["Local", "Group Classes", "Personal Training", "Full-service", "Comprehensive equipment"]
    },
    {
      name: "Planet Fitness",
      address: "841 Albany Ave, Hartford, CT 06112",
      description: "Affordable 24/7 gym for all fitness levels",
      phone: "(860) 522-4600",
      features: ["Chain", "24-Hour Access", "Budget Membership", "All fitness levels", "Affordable"]
    },
    {
      name: "Club Fitness",
      address: "107 Old Windsor Rd, Bloomfield, CT 06002",
      description: "3-level cardio/strength gym with classes",
      phone: "(860) 242-1234",
      features: ["Full Equipment", "Group Classes", "Personal Training", "Cardio Machines", "Strength Training"]
    },
    {
      name: "Gold's Gym",
      address: "39 W Main St, Avon, CT 06001",
      description: "Classic gym experience with serious strength training",
      phone: "(860) 677-4348",
      features: ["Strength-Focused", "Franchise", "Serious training", "Classic experience"]
    },
    {
      name: "Bloomfield Fit Body Boot Camp",
      address: "10 Mountain Ave, Bloomfield, CT 06002",
      description: "High-energy, group HIIT gym with coaching",
      phone: "(860) 952-3324",
      features: ["HIIT", "Trainer-Led", "Community-Based", "High-energy", "Group Classes"]
    }
  ],
  "faith communities": [
    {
      name: "Wintonbury Church",
      address: "54 Maple Ave, Bloomfield, CT 06002",
      description: "Non-denominational church with contemporary worship",
      phone: "(860) 243-8779",
      hours: "Sunday Worship: 10am",
      features: ["Contemporary", "Small Groups", "Childcare", "Non-denominational", "Modern worship"]
    },
    {
      name: "Sacred Heart Church",
      address: "26 Wintonbury Ave, Bloomfield, CT 06002",
      description: "Catholic parish offering mass and confession",
      phone: "(860) 242-4142",
      hours: "Mass Times: Sat 4pm, Sun 9:30am",
      features: ["Catholic", "Historic", "Traditional", "Mass", "Confession"]
    },
    {
      name: "The First Cathedral",
      address: "1151 Blue Hills Ave, Bloomfield, CT 06002",
      description: "Large Baptist church with extensive community programs",
      phone: "(860) 243-6520",
      hours: "Sunday Worship: 10am",
      features: ["Baptist", "Youth Programs", "Community Outreach", "Large congregation", "Active programs"]
    },
    {
      name: "Old St. Andrew's Episcopal Church",
      address: "59 Tariffville Rd, Bloomfield, CT 06002",
      description: "Inclusive, historic Anglican church with modern services",
      phone: "(860) 242-4660",
      hours: "Sunday Services: 9am & 10:30am",
      features: ["Episcopal", "LGBTQ+ Friendly", "Historic", "Inclusive", "Anglican tradition"]
    },
    {
      name: "Bloomfield Congregational Church",
      address: "10 Wintonbury Ave, Bloomfield, CT 06002",
      description: "Open & affirming UCC congregation with family programs",
      phone: "(860) 242-0776",
      hours: "Sunday Worship: 10am",
      features: ["UCC", "Family-Friendly", "Inclusive", "Open and affirming", "Family programs"]
    }
  ]
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    // Generate recommendations based on user priorities
    const recommendations = generateRecommendations(quizResponse);

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

function generateRecommendations(quizResponse: QuizResponse) {
  const recommendations: { [key: string]: Business[] } = {};
  
  // Map user priorities to our business categories
  const priorityMap: { [key: string]: string } = {
    "grocery stores": "grocery stores",
    "grocery": "grocery stores", 
    "food": "grocery stores",
    "shopping": "grocery stores",
    "fitness options": "fitness options",
    "fitness": "fitness options",
    "gym": "fitness options",
    "exercise": "fitness options",
    "health": "fitness options",
    "faith communities": "faith communities",
    "church": "faith communities",
    "religious": "faith communities",
    "spiritual": "faith communities",
    "worship": "faith communities"
  };

  // For each user priority, find matching businesses
  quizResponse.priorities.forEach(priority => {
    const priorityLower = priority.toLowerCase();
    
    // Check for direct matches or partial matches
    for (const [key, category] of Object.entries(priorityMap)) {
      if (priorityLower.includes(key) || key.includes(priorityLower)) {
        if (localBusinesses[category]) {
          recommendations[priority] = [...localBusinesses[category]];
          break;
        }
      }
    }
  });

  // If no specific matches found, add some default categories
  if (Object.keys(recommendations).length === 0) {
    recommendations["grocery stores"] = localBusinesses["grocery stores"];
    recommendations["fitness options"] = localBusinesses["fitness options"];
    recommendations["faith communities"] = localBusinesses["faith communities"];
  }

  return recommendations;
}
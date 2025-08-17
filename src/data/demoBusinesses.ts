// Static demo data for Hartford, CT - Zero API calls guaranteed
export interface DemoBusiness {
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  image_url?: string;
  features: string[];
  latitude: number;
  longitude: number;
  distance_miles: number;
  rating?: number;
  is_favorite?: boolean;
}

// Hartford, CT businesses - static data, never changes
export const DEMO_BUSINESSES_BY_CATEGORY: Record<string, DemoBusiness[]> = {
  'coffee_tea': [
    {
      name: "Tisane Euro Asian Café",
      address: "537 Farmington Ave, Hartford, CT 06105",
      description: "Popular Asian fusion café with bubble tea and creative dishes",
      phone: "(860) 523-5586",
      features: ["Bubble Tea", "Asian Fusion", "Vegetarian Options", "WiFi"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 0.8,
      rating: 4.5
    },
    {
      name: "Starbucks",
      address: "100 Constitution Plaza, Hartford, CT 06103",
      description: "Famous coffee chain with specialty drinks and pastries",
      phone: "(860) 278-4000",
      features: ["Coffee", "Pastries", "WiFi", "Drive-thru"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 0.3,
      rating: 4.2
    }
  ],
  'restaurants': [
    {
      name: "Max Downtown",
      address: "185 Asylum St, Hartford, CT 06103",
      description: "Upscale steakhouse and raw bar in downtown Hartford",
      phone: "(860) 522-2530",
      features: ["Steakhouse", "Raw Bar", "Fine Dining", "Full Bar"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 0.2,
      rating: 4.6
    },
    {
      name: "Trumbull Kitchen",
      address: "150 Trumbull St, Hartford, CT 06103",
      description: "Contemporary American cuisine with creative cocktails",
      phone: "(860) 493-7412",
      features: ["American Cuisine", "Craft Cocktails", "Patio Dining"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 0.4,
      rating: 4.4
    }
  ],
  'shopping': [
    {
      name: "Westfarms Mall",
      address: "1500 New Britain Ave, Farmington, CT 06032",
      description: "Premier shopping destination with 160+ stores",
      phone: "(860) 561-3024",
      features: ["Shopping Mall", "Department Stores", "Food Court", "Parking"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 5.2,
      rating: 4.3
    }
  ],
  'entertainment': [
    {
      name: "Connecticut Science Center",
      address: "250 Columbus Blvd, Hartford, CT 06103",
      description: "Interactive science museum with hands-on exhibits",
      phone: "(860) 724-3623",
      features: ["Science Museum", "Interactive Exhibits", "Family Friendly"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 0.5,
      rating: 4.5
    }
  ],
  'fitness': [
    {
      name: "Planet Fitness",
      address: "952 Park St, Hartford, CT 06106",
      description: "Popular gym chain with affordable membership options",
      phone: "(860) 249-4653",
      features: ["Gym", "Cardio Equipment", "Weight Training", "24/7 Access"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 1.2,
      rating: 4.1
    }
  ],
  'beauty': [
    {
      name: "Salon Iris",
      address: "18 LaSalle Rd, West Hartford, CT 06107",
      description: "Full-service salon and spa with expert stylists",
      phone: "(860) 236-4747",
      features: ["Hair Salon", "Spa Services", "Manicures", "Facials"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 2.1,
      rating: 4.7
    }
  ],
  'grocery': [
    {
      name: "Whole Foods Market",
      address: "1489 Pleasant Valley Rd, Manchester, CT 06042",
      description: "Organic and natural grocery store with fresh produce",
      phone: "(860) 645-9670",
      features: ["Organic Groceries", "Fresh Produce", "Deli", "Bakery"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 8.5,
      rating: 4.4
    }
  ],
  'automotive': [
    {
      name: "AutoZone",
      address: "1350 Albany Ave, Hartford, CT 06112",
      description: "Auto parts store with tools and accessories",
      phone: "(860) 522-4298",
      features: ["Auto Parts", "Tools", "Battery Testing", "Oil Recycling"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 3.2,
      rating: 4.0
    }
  ],
  'pharmacy': [
    {
      name: "CVS Pharmacy",
      address: "760 Park St, Hartford, CT 06106",
      description: "Full-service pharmacy with health and wellness products",
      phone: "(860) 249-8816",
      features: ["Pharmacy", "Health Products", "Photo Services", "MinuteClinic"],
      latitude: 41.7658,
      longitude: -72.6734,
      distance_miles: 1.0,
      rating: 4.2
    }
  ]
};

// Get demo businesses for a specific category
export const getDemoBusinesses = (searchTerm: string): DemoBusiness[] => {
  // Map search terms to our demo categories
  const categoryMapping: Record<string, string> = {
    'coffee': 'coffee_tea',
    'tea': 'coffee_tea',
    'restaurants': 'restaurants',
    'food': 'restaurants',
    'dining': 'restaurants',
    'shopping': 'shopping',
    'mall': 'shopping',
    'entertainment': 'entertainment',
    'movies': 'entertainment',
    'fitness': 'fitness',
    'gym': 'fitness',
    'beauty': 'beauty',
    'salon': 'beauty',
    'grocery': 'grocery',
    'supermarket': 'grocery',
    'automotive': 'automotive',
    'pharmacy': 'pharmacy',
    'drugstore': 'pharmacy'
  };

  const categoryKey = categoryMapping[searchTerm.toLowerCase()] || 'restaurants';
  return DEMO_BUSINESSES_BY_CATEGORY[categoryKey] || DEMO_BUSINESSES_BY_CATEGORY['restaurants'];
};

// Get all demo categories for Popular page
export const getAllDemoCategories = (): Record<string, DemoBusiness[]> => {
  return DEMO_BUSINESSES_BY_CATEGORY;
};
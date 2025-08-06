// Type definitions for the recommendation system
export interface Business {
  name: string;
  address: string;
  description: string;
  phone?: string;
  features: string[];
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  website?: string;
  image_url?: string;
  rating: number;
  review_count: number;
}

export interface QuizResponse {
  priorities: string[];
  budgetPreference: string;
  householdType: string;
  transportationStyle: string;
  lifeStage: string;
  userId?: string;
  recommendationEngine?: string;
}

export interface APIUsageStats {
  yelpCalls: number;
  googleCalls: number;
  cacheHits: number;
  totalSearches: number;
  estimatedCost: number;
  costSavings: number;
}

export interface RequestBody {
  quizResponse?: QuizResponse;
  dynamicFilter?: any;
  exploreMode?: boolean;
  popularMode?: boolean;
  latitude?: number;
  longitude?: number;
  categories?: string[];
  userId?: string;
}
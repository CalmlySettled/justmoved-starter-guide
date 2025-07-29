import { supabase } from "@/integrations/supabase/client";

export interface FilterOptions {
  userId: string;
  category: string;
  filters: string[];
  sortBy?: 'relevance' | 'distance' | 'rating';
}

export interface FilterResult {
  recommendations: any[];
  totalCount: number;
  additionalResults: number;
  appliedFilters: string[];
  sortBy: string;
}

export async function filterRecommendations(options: FilterOptions): Promise<FilterResult> {
  const { data, error } = await supabase.functions.invoke('filter-recommendations', {
    body: options
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

export function getCategoryFilterOptions(category: string): string[] {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('grocery')) {
    return ['Organic', '24/7', 'Pickup Available', 'Budget-Friendly', 'Local', 'High Rated'];
  }
  
  if (categoryLower.includes('restaurant') || categoryLower.includes('food')) {
    return ['Outdoor Seating', 'Delivery', 'Vegetarian', 'Budget-Friendly', 'High Rated', 'Local'];
  }
  
  if (categoryLower.includes('fitness') || categoryLower.includes('gym')) {
    return ['Classes', 'Pool', 'Personal Training', 'Budget-Friendly', 'High Rated'];
  }
  
  if (categoryLower.includes('medical') || categoryLower.includes('health')) {
    return ['High Rated', 'Nearby', 'Specialist'];
  }
  
  if (categoryLower.includes('school') || categoryLower.includes('education')) {
    return ['High Rated', 'Nearby', 'Public', 'Private'];
  }
  
  if (categoryLower.includes('park') || categoryLower.includes('recreation')) {
    return ['Nearby', 'Free', 'Family-Friendly', 'Dog-Friendly'];
  }
  
  if (categoryLower.includes('faith') || categoryLower.includes('church') || categoryLower.includes('religious') || categoryLower.includes('worship')) {
    return ['Catholic', 'Baptist', 'Methodist', 'Lutheran', 'Presbyterian', 'Non-denominational', 'High Rated', 'Nearby'];
  }
  
  // Default filters for any category
  return ['High Rated', 'Nearby', 'Budget-Friendly', 'Local'];
}
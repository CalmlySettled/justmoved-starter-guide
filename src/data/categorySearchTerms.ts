/**
 * Maps user-friendly category names to Google Places API search terms
 * Google doesn't understand abstract categories like "Drink Time", so we map to concrete types
 */
export const CATEGORY_SEARCH_TERMS: Record<string, string[]> = {
  // Popular Categories
  'Food Time': ['restaurant', 'cafe', 'diner', 'fast food', 'food'],
  'Drink Time': ['bar', 'brewery', 'wine bar', 'pub', 'coffee shop', 'cafe', 'lounge'],
  'Outdoor Activities': ['park', 'hiking trail', 'outdoor recreation', 'sports facility', 'nature reserve'],
  'Personal Care': ['salon', 'spa', 'barber', 'nail salon', 'massage', 'beauty'],
  'Fitness & Wellness': ['gym', 'fitness center', 'yoga studio', 'pilates', 'health club'],
  'Entertainment': ['movie theater', 'bowling', 'arcade', 'entertainment venue', 'theater'],
  'Shopping': ['shopping mall', 'retail store', 'boutique', 'department store'],
  'Auto Services': ['auto repair', 'car wash', 'tire shop', 'mechanic', 'oil change'],
  'Home Services': ['plumber', 'electrician', 'hvac', 'handyman', 'contractor'],
  
  // Essentials
  'grocery stores': ['grocery store', 'supermarket', 'food market'],
  'pharmacies': ['pharmacy', 'drugstore', 'chemist'],
  'gas stations': ['gas station', 'fuel', 'petrol station'],
  'banks': ['bank', 'credit union', 'atm'],
  'post offices': ['post office', 'postal service', 'usps'],
  'hardware stores': ['hardware store', 'home improvement'],
  'dmv': ['dmv', 'department of motor vehicles', 'motor vehicle'],
  'doctors': ['doctor', 'physician', 'medical clinic', 'healthcare'],
  'dentists': ['dentist', 'dental clinic'],
  'veterinarians': ['veterinarian', 'vet clinic', 'animal hospital'],
  'urgent care': ['urgent care', 'walk-in clinic', 'emergency care'],
  'daycares': ['daycare', 'childcare', 'preschool'],
  'pet stores': ['pet store', 'pet supply', 'pet shop'],
  'laundromats': ['laundromat', 'laundry service', 'dry cleaning'],
  'internet providers': ['internet provider', 'internet service', 'isp'],
  'furniture stores': ['furniture store', 'home furnishing'],
  'cleaning services': ['cleaning service', 'maid service', 'house cleaning'],
  'junk removal': ['junk removal', 'waste removal', 'hauling service'],
};

/**
 * Get Google-friendly search terms for a category
 * Falls back to the category name if no mapping exists
 */
export function getSearchTermsForCategory(category: string): string[] {
  return CATEGORY_SEARCH_TERMS[category] || [category];
}

/**
 * Build a Google Places search query using the primary search term
 * @param category - The user-friendly category name
 * @param address - The property address to search near
 * @returns A Google-friendly search query
 */
export function buildSearchQuery(category: string, address: string): string {
  const terms = getSearchTermsForCategory(category);
  // Use the first/primary search term by default
  return `${terms[0]} near ${address}`;
}

// ACTUAL categories used throughout the app - these MUST match exactly
// Based on Explore.tsx essentials and Popular.tsx categories

// Categories from essentials (time-based recommendations)
export const ESSENTIALS_CATEGORIES = [
  'grocery stores',
  'pharmacies', 
  'gas stations',
  'doctors',
  'junk removal',
  'internet providers',
  'banks',
  'hardware stores',
  'furniture stores',
  'cleaning services',
  'DMV',
  'Fitness',
  'post offices',
  'veterinarians',
  'daycares'
];

// Categories from popular page (experience-based)
export const POPULAR_CATEGORIES = [
  'Drink Time',
  'Food Time', 
  'Personal Care & Wellness',
  'Outdoor Activities',
  'Faith Communities',
  'Nearby Events',
  'Shopping',
  'Art & Culture',
  'Games'
];

// Combined comprehensive list - these are ALL the categories users can actually access
export const COMPREHENSIVE_CATEGORIES = [
  ...ESSENTIALS_CATEGORIES,
  ...POPULAR_CATEGORIES
];

// These categories are stored exactly as shown - no mapping needed
// They match the exact strings used in Explore.tsx and Popular.tsx
export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  // Essentials categories - stored exactly as used
  'grocery stores': 'grocery stores',
  'pharmacies': 'pharmacies', 
  'gas stations': 'gas stations',
  'doctors': 'doctors',
  'junk removal': 'junk removal',
  'internet providers': 'internet providers',
  'banks': 'banks',
  'hardware stores': 'hardware stores',
  'furniture stores': 'furniture stores',
  'cleaning services': 'cleaning services',
  'DMV': 'DMV',
  'Fitness': 'Fitness',
  'post offices': 'post offices',
  'veterinarians': 'veterinarians',
  'daycares': 'daycares',
  
  // Popular categories - stored exactly as used
  'Drink Time': 'Drink Time',
  'Food Time': 'Food Time',
  'Personal Care & Wellness': 'Personal Care & Wellness',
  'Outdoor Activities': 'Outdoor Activities',
  'Faith Communities': 'Faith Communities',
  'Nearby Events': 'Nearby Events',
  'Shopping': 'Shopping',
  'Art & Culture': 'Art & Culture',
  'Games': 'Games'
};

// Reverse mapping for display purposes
export const CATEGORY_STORAGE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_DISPLAY_MAP).map(([display, storage]) => [storage, display])
);

// Get storage name from display name (they're the same now)
export const getStorageName = (displayName: string): string => {
  return CATEGORY_DISPLAY_MAP[displayName] || displayName;
};

// Get display name from storage name (they're the same now) 
export const getDisplayName = (storageName: string): string => {
  return CATEGORY_STORAGE_MAP[storageName] || storageName;
};

// Legacy categories that were used in the old system
// These are kept for backwards compatibility
export const LEGACY_CATEGORIES = [
  'restaurants',
  'grocery stores',
  'pharmacies',
  'gyms',
  'banks',
  'gas stations',
  'coffee shops',
  'beauty salons',
  'medical',
  'shopping'
];
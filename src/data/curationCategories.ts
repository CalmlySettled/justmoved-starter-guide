// Comprehensive category list for curation system
// This ensures consistency between all curation interfaces

export const COMPREHENSIVE_CATEGORIES = [
  'Grocery stores',
  'Medical care / Pharmacy', 
  'Fitness options',
  'DMV / Government services',
  'Faith communities',
  'Public transit / commute info',
  'Parks / Trails',
  'Restaurants / coffee shops',
  'Social events or community groups',
  'Auto services (repair, registration)',
  'Beauty / Hair salons',
  'Childcare / Daycare',
  'Banking / Financial services',
  'Pet services (vet, grooming)',
  'Home improvement / Hardware stores',
  'Libraries',
  'Entertainment / Movies'
];

// Mapping from display names to storage/internal names
// This handles legacy data and ensures compatibility
export const CATEGORY_DISPLAY_MAP: Record<string, string> = {
  'Grocery stores': 'grocery stores',
  'Medical care / Pharmacy': 'medical',
  'Fitness options': 'gyms',
  'DMV / Government services': 'government services',
  'Faith communities': 'faith communities',
  'Public transit / commute info': 'public transit',
  'Parks / Trails': 'parks',
  'Restaurants / coffee shops': 'restaurants',
  'Social events or community groups': 'social events',
  'Auto services (repair, registration)': 'auto services',
  'Beauty / Hair salons': 'beauty salons',
  'Childcare / Daycare': 'childcare',
  'Banking / Financial services': 'banks',
  'Pet services (vet, grooming)': 'pet services',
  'Home improvement / Hardware stores': 'hardware stores',
  'Libraries': 'libraries',
  'Entertainment / Movies': 'entertainment'
};

// Reverse mapping for display purposes
export const CATEGORY_STORAGE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_DISPLAY_MAP).map(([display, storage]) => [storage, display])
);

// Get storage name from display name
export const getStorageName = (displayName: string): string => {
  return CATEGORY_DISPLAY_MAP[displayName] || displayName.toLowerCase();
};

// Get display name from storage name
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
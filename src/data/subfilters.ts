export interface Subfilter {
  id: string;
  label: string;
  category: string;
}

export const SUBFILTERS_BY_CATEGORY: Record<string, Subfilter[]> = {
  'medical care': [
    { id: 'urgent-care', label: 'Urgent Care', category: 'medical care' },
    { id: 'family-doctors', label: 'Family Doctors', category: 'medical care' },
    { id: 'specialists', label: 'Specialists', category: 'medical care' },
    { id: 'dentists', label: 'Dentists', category: 'medical care' },
    { id: 'eye-care', label: 'Eye Care', category: 'medical care' },
    { id: 'mental-health', label: 'Mental Health', category: 'medical care' },
    { id: 'physical-therapy', label: 'Physical Therapy', category: 'medical care' },
    { id: 'pediatricians', label: 'Pediatricians', category: 'medical care' }
  ],
  'parks & recreation': [
    { id: 'playgrounds', label: 'Playgrounds', category: 'parks & recreation' },
    { id: 'hiking-trails', label: 'Hiking Trails', category: 'parks & recreation' },
    { id: 'sports-facilities', label: 'Sports Facilities', category: 'parks & recreation' },
    { id: 'dog-parks', label: 'Dog Parks', category: 'parks & recreation' },
    { id: 'swimming-pools', label: 'Swimming Pools', category: 'parks & recreation' },
    { id: 'basketball-courts', label: 'Basketball Courts', category: 'parks & recreation' },
    { id: 'tennis-courts', label: 'Tennis Courts', category: 'parks & recreation' },
    { id: 'community-centers', label: 'Community Centers', category: 'parks & recreation' }
  ],
  'grocery stores': [
    { id: 'organic-natural', label: 'Organic & Natural', category: 'grocery stores' },
    { id: 'budget-friendly', label: 'Budget-Friendly', category: 'grocery stores' },
    { id: 'international', label: 'International Foods', category: 'grocery stores' },
    { id: 'farmers-markets', label: 'Farmers Markets', category: 'grocery stores' },
    { id: 'bulk-wholesale', label: 'Bulk & Wholesale', category: 'grocery stores' },
    { id: 'specialty-gourmet', label: 'Specialty & Gourmet', category: 'grocery stores' }
  ],
  'restaurants': [
    { id: 'family-friendly', label: 'Family-Friendly', category: 'restaurants' },
    { id: 'romantic-date', label: 'Romantic Date Spots', category: 'restaurants' },
    { id: 'quick-casual', label: 'Quick & Casual', category: 'restaurants' },
    { id: 'fine-dining', label: 'Fine Dining', category: 'restaurants' },
    { id: 'vegan-vegetarian', label: 'Vegan & Vegetarian', category: 'restaurants' },
    { id: 'gluten-free', label: 'Gluten-Free Options', category: 'restaurants' },
    { id: 'brunch-spots', label: 'Brunch Spots', category: 'restaurants' },
    { id: 'late-night', label: 'Late Night Dining', category: 'restaurants' },
    { id: 'outdoor-seating', label: 'Outdoor Seating', category: 'restaurants' },
    { id: 'takeout-delivery', label: 'Takeout & Delivery', category: 'restaurants' },
    { id: 'local-favorites', label: 'Local Favorites', category: 'restaurants' },
    { id: 'ethnic-cuisine', label: 'International Cuisine', category: 'restaurants' },
    { id: 'bar-grill', label: 'Bar & Grill', category: 'restaurants' }
  ],
  'fitness': [
    { id: 'gyms-fitness-centers', label: 'Gyms & Fitness Centers', category: 'fitness' },
    { id: 'yoga-studios', label: 'Yoga Studios', category: 'fitness' },
    { id: 'martial-arts', label: 'Martial Arts', category: 'fitness' },
    { id: 'dance-studios', label: 'Dance Studios', category: 'fitness' },
    { id: 'rock-climbing', label: 'Rock Climbing', category: 'fitness' },
    { id: 'swimming', label: 'Swimming', category: 'fitness' },
    { id: 'personal-training', label: 'Personal Training', category: 'fitness' },
    { id: 'group-classes', label: 'Group Classes', category: 'fitness' }
  ],
  'personal care': [
    { id: 'hair-salons', label: 'Hair Salons', category: 'personal care' },
    { id: 'barbershops', label: 'Barbershops', category: 'personal care' },
    { id: 'nail-salons', label: 'Nail Salons', category: 'personal care' },
    { id: 'spas-massage', label: 'Spas & Massage', category: 'personal care' },
    { id: 'skincare', label: 'Skincare & Aesthetics', category: 'personal care' },
    { id: 'tattoo-piercing', label: 'Tattoo & Piercing', category: 'personal care' },
    { id: 'wellness-centers', label: 'Wellness Centers', category: 'personal care' }
  ],
  'shopping': [
    { id: 'department-stores', label: 'Department Stores', category: 'shopping' },
    { id: 'boutiques', label: 'Boutiques & Local Shops', category: 'shopping' },
    { id: 'thrift-consignment', label: 'Thrift & Consignment', category: 'shopping' },
    { id: 'electronics', label: 'Electronics', category: 'shopping' },
    { id: 'home-garden', label: 'Home & Garden', category: 'shopping' },
    { id: 'bookstores', label: 'Bookstores', category: 'shopping' },
    { id: 'sporting-goods', label: 'Sporting Goods', category: 'shopping' }
  ],
  'banking': [
    { id: 'local-credit-unions', label: 'Local Credit Unions', category: 'banking' },
    { id: 'national-banks', label: 'National Banks', category: 'banking' },
    { id: 'atm-locations', label: 'ATM Locations', category: 'banking' }
  ],
  'auto services': [
    { id: 'oil-change', label: 'Oil Change', category: 'auto services' },
    { id: 'car-repair', label: 'Car Repair', category: 'auto services' },
    { id: 'tire-services', label: 'Tire Services', category: 'auto services' },
    { id: 'car-wash', label: 'Car Wash', category: 'auto services' },
    { id: 'auto-parts', label: 'Auto Parts', category: 'auto services' }
  ],
  'entertainment': [
    { id: 'movie-theaters', label: 'Movie Theaters', category: 'entertainment' },
    { id: 'live-music', label: 'Live Music Venues', category: 'entertainment' },
    { id: 'museums-galleries', label: 'Museums & Galleries', category: 'entertainment' },
    { id: 'bowling-arcade', label: 'Bowling & Arcade', category: 'entertainment' },
    { id: 'nightlife', label: 'Nightlife & Bars', category: 'entertainment' },
    { id: 'comedy-shows', label: 'Comedy Shows', category: 'entertainment' }
  ]
};

export const getAllSubfilters = (): Subfilter[] => {
  return Object.values(SUBFILTERS_BY_CATEGORY).flat();
};

export const getSubfiltersForCategory = (category: string): Subfilter[] => {
  const normalizedCategory = category.toLowerCase();
  return SUBFILTERS_BY_CATEGORY[normalizedCategory] || [];
};
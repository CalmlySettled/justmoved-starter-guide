export interface Subfilter {
  id: string;
  label: string;
  category: string;
}

export const SUBFILTERS_BY_CATEGORY: Record<string, Subfilter[]> = {
  // POPULAR CATEGORIES (Experience-based)
  'Food Time': [
    { id: 'quick-bites', label: 'Quick Bites', category: 'Food Time' },
    { id: 'family-dining', label: 'Family Dining', category: 'Food Time' },
    { id: 'date-night', label: 'Date Night', category: 'Food Time' },
    { id: 'healthy-options', label: 'Healthy Options', category: 'Food Time' },
    { id: 'late-night', label: 'Late Night', category: 'Food Time' },
    { id: 'breakfast', label: 'Breakfast & Brunch', category: 'Food Time' },
    { id: 'pizza', label: 'Pizza', category: 'Food Time' },
    { id: 'asian', label: 'Asian Cuisine', category: 'Food Time' },
    { id: 'italian', label: 'Italian', category: 'Food Time' },
    { id: 'mexican', label: 'Mexican', category: 'Food Time' },
    { id: 'seafood', label: 'Seafood', category: 'Food Time' },
    { id: 'bbq', label: 'BBQ & Grill', category: 'Food Time' },
    { id: 'vegetarian', label: 'Vegetarian/Vegan', category: 'Food Time' }
  ],
  'Drink Time': [
    { id: 'coffee-shops', label: 'Coffee Shops', category: 'Drink Time' },
    { id: 'breweries', label: 'Breweries', category: 'Drink Time' },
    { id: 'wine-bars', label: 'Wine Bars', category: 'Drink Time' },
    { id: 'cocktail-lounges', label: 'Cocktail Lounges', category: 'Drink Time' },
    { id: 'sports-bars', label: 'Sports Bars', category: 'Drink Time' },
    { id: 'pubs', label: 'Pubs & Taverns', category: 'Drink Time' },
    { id: 'juice-bars', label: 'Juice & Smoothie Bars', category: 'Drink Time' },
    { id: 'tea-houses', label: 'Tea Houses', category: 'Drink Time' }
  ],
  'Personal Care & Wellness': [
    { id: 'hair-salon', label: 'Hair Salons', category: 'Personal Care & Wellness' },
    { id: 'barbershop', label: 'Barbershops', category: 'Personal Care & Wellness' },
    { id: 'nail-salon', label: 'Nail Salons', category: 'Personal Care & Wellness' },
    { id: 'spa', label: 'Spas', category: 'Personal Care & Wellness' },
    { id: 'massage', label: 'Massage Therapy', category: 'Personal Care & Wellness' },
    { id: 'skincare', label: 'Skincare', category: 'Personal Care & Wellness' },
    { id: 'eyebrow', label: 'Eyebrow Services', category: 'Personal Care & Wellness' },
    { id: 'waxing', label: 'Waxing', category: 'Personal Care & Wellness' }
  ],
  'Outdoor Activities': [
    { id: 'parks', label: 'Parks', category: 'Outdoor Activities' },
    { id: 'hiking', label: 'Hiking Trails', category: 'Outdoor Activities' },
    { id: 'biking', label: 'Biking Trails', category: 'Outdoor Activities' },
    { id: 'sports-facilities', label: 'Sports Facilities', category: 'Outdoor Activities' },
    { id: 'playgrounds', label: 'Playgrounds', category: 'Outdoor Activities' },
    { id: 'dog-parks', label: 'Dog Parks', category: 'Outdoor Activities' },
    { id: 'water-activities', label: 'Water Activities', category: 'Outdoor Activities' },
    { id: 'camping', label: 'Camping', category: 'Outdoor Activities' }
  ],
  'Shopping': [
    { id: 'clothing', label: 'Clothing & Fashion', category: 'Shopping' },
    { id: 'electronics', label: 'Electronics', category: 'Shopping' },
    { id: 'home-goods', label: 'Home Goods', category: 'Shopping' },
    { id: 'bookstores', label: 'Bookstores', category: 'Shopping' },
    { id: 'sporting-goods', label: 'Sporting Goods', category: 'Shopping' },
    { id: 'jewelry', label: 'Jewelry', category: 'Shopping' },
    { id: 'shoes', label: 'Shoes', category: 'Shopping' },
    { id: 'furniture', label: 'Furniture', category: 'Shopping' },
    { id: 'gifts', label: 'Gifts & Specialty', category: 'Shopping' }
  ],
  'Art & Culture': [
    { id: 'museums', label: 'Museums', category: 'Art & Culture' },
    { id: 'galleries', label: 'Art Galleries', category: 'Art & Culture' },
    { id: 'theaters', label: 'Theaters', category: 'Art & Culture' },
    { id: 'live-music', label: 'Live Music', category: 'Art & Culture' },
    { id: 'cultural-centers', label: 'Cultural Centers', category: 'Art & Culture' },
    { id: 'historic-sites', label: 'Historic Sites', category: 'Art & Culture' }
  ],
  'Games': [
    { id: 'arcade', label: 'Arcades', category: 'Games' },
    { id: 'bowling', label: 'Bowling', category: 'Games' },
    { id: 'mini-golf', label: 'Mini Golf', category: 'Games' },
    { id: 'escape-rooms', label: 'Escape Rooms', category: 'Games' },
    { id: 'board-game-cafes', label: 'Board Game Cafes', category: 'Games' },
    { id: 'pool-halls', label: 'Pool Halls', category: 'Games' }
  ],
  'Faith Communities': [
    { id: 'churches', label: 'Churches', category: 'Faith Communities' },
    { id: 'mosques', label: 'Mosques', category: 'Faith Communities' },
    { id: 'synagogues', label: 'Synagogues', category: 'Faith Communities' },
    { id: 'temples', label: 'Temples', category: 'Faith Communities' },
    { id: 'meditation', label: 'Meditation Centers', category: 'Faith Communities' }
  ],
  
  // ESSENTIALS CATEGORIES (Service-based)
  'grocery stores': [
    { id: 'organic', label: 'Organic', category: 'grocery stores' },
    { id: 'international', label: 'International', category: 'grocery stores' },
    { id: 'specialty', label: 'Specialty & Gourmet', category: 'grocery stores' },
    { id: 'bulk', label: 'Bulk & Warehouse', category: 'grocery stores' },
    { id: 'budget', label: 'Budget Friendly', category: 'grocery stores' },
    { id: 'convenience', label: 'Convenience', category: 'grocery stores' }
  ],
  'pharmacies': [
    { id: '24-hour', label: '24 Hour', category: 'pharmacies' },
    { id: 'drive-through', label: 'Drive-through', category: 'pharmacies' },
    { id: 'compounding', label: 'Compounding', category: 'pharmacies' },
    { id: 'vaccination', label: 'Vaccination Services', category: 'pharmacies' }
  ],
  'doctors': [
    { id: 'primary-care', label: 'Primary Care', category: 'doctors' },
    { id: 'urgent-care', label: 'Urgent Care', category: 'doctors' },
    { id: 'dental', label: 'Dental Care', category: 'doctors' },
    { id: 'vision', label: 'Vision Care', category: 'doctors' },
    { id: 'pediatric', label: 'Pediatric', category: 'doctors' },
    { id: 'specialty', label: 'Specialty Care', category: 'doctors' },
    { id: 'mental-health', label: 'Mental Health', category: 'doctors' }
  ],
  'banks': [
    { id: 'banks', label: 'Banks & Credit Unions', category: 'banks' },
    { id: 'atm', label: '24 Hour ATM', category: 'banks' },
    { id: 'drive-through', label: 'Drive-through', category: 'banks' },
    { id: 'investment', label: 'Investment Services', category: 'banks' },
    { id: 'small-business', label: 'Small Business Services', category: 'banks' }
  ],
  'Fitness': [
    { id: 'yoga', label: 'Yoga Studios', category: 'Fitness' },
    { id: 'pilates', label: 'Pilates', category: 'Fitness' },
    { id: 'crossfit', label: 'CrossFit', category: 'Fitness' },
    { id: 'traditional-gym', label: 'Gyms & Fitness Centers', category: 'Fitness' },
    { id: 'martial-arts', label: 'Martial Arts', category: 'Fitness' },
    { id: 'dance', label: 'Dance Studios', category: 'Fitness' },
    { id: 'rock-climbing', label: 'Rock Climbing', category: 'Fitness' },
    { id: 'swimming', label: 'Swimming', category: 'Fitness' }
  ],
  'gas stations': [
    { id: '24-hour', label: '24 Hour', category: 'gas stations' },
    { id: 'car-wash', label: 'Car Wash', category: 'gas stations' },
    { id: 'convenience-store', label: 'Convenience Store', category: 'gas stations' },
    { id: 'electric-charging', label: 'Electric Charging', category: 'gas stations' },
    { id: 'diesel', label: 'Diesel', category: 'gas stations' }
  ],
  'hardware stores': [
    { id: 'tools', label: 'Tools & Equipment', category: 'hardware stores' },
    { id: 'plumbing', label: 'Plumbing Supplies', category: 'hardware stores' },
    { id: 'electrical', label: 'Electrical Supplies', category: 'hardware stores' },
    { id: 'paint', label: 'Paint & Supplies', category: 'hardware stores' },
    { id: 'lumber', label: 'Lumber & Building Materials', category: 'hardware stores' }
  ],
  'furniture stores': [
    { id: 'bedroom', label: 'Bedroom Furniture', category: 'furniture stores' },
    { id: 'living-room', label: 'Living Room', category: 'furniture stores' },
    { id: 'office', label: 'Office Furniture', category: 'furniture stores' },
    { id: 'outdoor', label: 'Outdoor Furniture', category: 'furniture stores' },
    { id: 'budget', label: 'Budget Friendly', category: 'furniture stores' },
    { id: 'luxury', label: 'Luxury', category: 'furniture stores' }
  ],
  'cleaning services': [
    { id: 'residential', label: 'Residential Cleaning', category: 'cleaning services' },
    { id: 'deep-cleaning', label: 'Deep Cleaning', category: 'cleaning services' },
    { id: 'move-in-out', label: 'Move-in/Move-out', category: 'cleaning services' },
    { id: 'carpet', label: 'Carpet Cleaning', category: 'cleaning services' },
    { id: 'window', label: 'Window Cleaning', category: 'cleaning services' },
    { id: 'eco-friendly', label: 'Eco-Friendly', category: 'cleaning services' }
  ],
  'junk removal': [
    { id: 'full-service', label: 'Full-Service Removal', category: 'junk removal' },
    { id: 'furniture', label: 'Furniture Removal', category: 'junk removal' },
    { id: 'appliance', label: 'Appliance Removal', category: 'junk removal' },
    { id: 'construction', label: 'Construction Debris', category: 'junk removal' },
    { id: 'estate-cleanout', label: 'Estate Cleanout', category: 'junk removal' }
  ],
  'veterinarians': [
    { id: 'general-care', label: 'General Care', category: 'veterinarians' },
    { id: 'emergency', label: 'Emergency Care', category: 'veterinarians' },
    { id: 'specialty', label: 'Specialty Care', category: 'veterinarians' },
    { id: 'exotic-pets', label: 'Exotic Pets', category: 'veterinarians' },
    { id: 'mobile', label: 'Mobile Services', category: 'veterinarians' }
  ],
  'daycares': [
    { id: 'infant', label: 'Infant Care', category: 'daycares' },
    { id: 'toddler', label: 'Toddler Programs', category: 'daycares' },
    { id: 'preschool', label: 'Preschool', category: 'daycares' },
    { id: 'after-school', label: 'After School Care', category: 'daycares' },
    { id: 'full-time', label: 'Full-Time Care', category: 'daycares' },
    { id: 'part-time', label: 'Part-Time Care', category: 'daycares' }
  ],
  'internet providers': [
    { id: 'fiber', label: 'Fiber Internet', category: 'internet providers' },
    { id: 'cable', label: 'Cable Internet', category: 'internet providers' },
    { id: 'dsl', label: 'DSL', category: 'internet providers' },
    { id: 'satellite', label: 'Satellite', category: 'internet providers' },
    { id: 'business', label: 'Business Plans', category: 'internet providers' }
  ]
  
  // Note: Categories like 'DMV', 'post offices', 'Nearby Events' intentionally have no subfilters
  // as they don't benefit from subcategorization
};

export const getAllSubfilters = (): Subfilter[] => {
  return Object.values(SUBFILTERS_BY_CATEGORY).flat();
};

export const getSubfiltersForCategory = (category: string): Subfilter[] => {
  // Use the exact category name without normalization
  return SUBFILTERS_BY_CATEGORY[category] || [];
};
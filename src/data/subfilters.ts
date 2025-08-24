export interface Subfilter {
  id: string;
  label: string;
  category: string;
}

export const SUBFILTERS_BY_CATEGORY: Record<string, Subfilter[]> = {
  'Medical care': [
    { id: 'dental care', label: 'Dental Care', category: 'Medical care' },
    { id: 'vision care', label: 'Vision Care', category: 'Medical care' },
    { id: 'urgent care', label: 'Urgent Care', category: 'Medical care' },
    { id: 'specialty care', label: 'Specialty Care', category: 'Medical care' },
    { id: 'mental health', label: 'Mental Health', category: 'Medical care' },
    { id: 'pharmacy', label: 'Pharmacy', category: 'Medical care' },
    { id: 'primary care', label: 'Primary Care', category: 'Medical care' },
    { id: 'pediatric', label: 'Pediatric', category: 'Medical care' }
  ],
  'Parks and recreation': [
    { id: 'dog parks', label: 'Dog Parks', category: 'Parks and recreation' },
    { id: 'playgrounds', label: 'Playgrounds', category: 'Parks and recreation' },
    { id: 'hiking trails', label: 'Hiking Trails', category: 'Parks and recreation' },
    { id: 'sports facilities', label: 'Sports Facilities', category: 'Parks and recreation' },
    { id: 'community centers', label: 'Community Centers', category: 'Parks and recreation' },
    { id: 'swimming', label: 'Swimming', category: 'Parks and recreation' },
    { id: 'tennis', label: 'Tennis', category: 'Parks and recreation' },
    { id: 'basketball', label: 'Basketball', category: 'Parks and recreation' }
  ],
  'Grocery stores': [
    { id: 'organic', label: 'Organic', category: 'Grocery stores' },
    { id: 'international', label: 'International', category: 'Grocery stores' },
    { id: 'specialty', label: 'Specialty & Gourmet', category: 'Grocery stores' },
    { id: 'bulk', label: 'Bulk & Warehouse', category: 'Grocery stores' },
    { id: 'budget', label: 'Budget Friendly', category: 'Grocery stores' },
    { id: 'convenience', label: 'Convenience', category: 'Grocery stores' }
  ],
  'Restaurants': [
    { id: 'family-friendly', label: 'Family Friendly', category: 'Restaurants' },
    { id: 'fine dining', label: 'Fine Dining', category: 'Restaurants' },
    { id: 'fast casual', label: 'Fast Casual', category: 'Restaurants' },
    { id: 'takeout', label: 'Takeout & Delivery', category: 'Restaurants' },
    { id: 'vegan', label: 'Vegan', category: 'Restaurants' },
    { id: 'vegetarian', label: 'Vegetarian', category: 'Restaurants' },
    { id: 'gluten-free', label: 'Gluten Free', category: 'Restaurants' },
    { id: 'pizza', label: 'Pizza', category: 'Restaurants' },
    { id: 'chinese', label: 'Chinese', category: 'Restaurants' },
    { id: 'italian', label: 'Italian', category: 'Restaurants' },
    { id: 'mexican', label: 'Mexican', category: 'Restaurants' },
    { id: 'breakfast', label: 'Breakfast & Brunch', category: 'Restaurants' },
    { id: 'coffee', label: 'Coffee & Cafes', category: 'Restaurants' }
  ],
  'Fitness': [
    { id: 'yoga', label: 'Yoga Studios', category: 'Fitness' },
    { id: 'pilates', label: 'Pilates', category: 'Fitness' },
    { id: 'crossfit', label: 'CrossFit', category: 'Fitness' },
    { id: 'swimming', label: 'Swimming', category: 'Fitness' },
    { id: 'martial arts', label: 'Martial Arts', category: 'Fitness' },
    { id: 'dance', label: 'Dance Studios', category: 'Fitness' },
    { id: 'rock climbing', label: 'Rock Climbing', category: 'Fitness' },
    { id: 'traditional gym', label: 'Gyms & Fitness Centers', category: 'Fitness' }
  ],
  'Personal Care': [
    { id: 'hair salon', label: 'Hair Salons', category: 'Personal Care' },
    { id: 'barbershop', label: 'Barbershops', category: 'Personal Care' },
    { id: 'nail salon', label: 'Nail Salons', category: 'Personal Care' },
    { id: 'spa', label: 'Spas', category: 'Personal Care' },
    { id: 'skincare', label: 'Skincare', category: 'Personal Care' },
    { id: 'massage', label: 'Massage Therapy', category: 'Personal Care' },
    { id: 'eyebrow', label: 'Eyebrow Services', category: 'Personal Care' }
  ],
  'Shopping': [
    { id: 'clothing', label: 'Clothing & Fashion', category: 'Shopping' },
    { id: 'electronics', label: 'Electronics', category: 'Shopping' },
    { id: 'home goods', label: 'Home Goods', category: 'Shopping' },
    { id: 'books', label: 'Books', category: 'Shopping' },
    { id: 'sporting goods', label: 'Sporting Goods', category: 'Shopping' },
    { id: 'jewelry', label: 'Jewelry', category: 'Shopping' },
    { id: 'shoes', label: 'Shoes', category: 'Shopping' }
  ],
  'Banking': [
    { id: 'banks', label: 'Banks & Credit Unions', category: 'Banking' },
    { id: 'atm', label: 'ATMs', category: 'Banking' },
    { id: 'investment', label: 'Investment Services', category: 'Banking' }
  ],
  'Auto services': [
    { id: 'repair', label: 'Auto Repair', category: 'Auto services' },
    { id: 'oil change', label: 'Oil Change', category: 'Auto services' },
    { id: 'car wash', label: 'Car Wash', category: 'Auto services' },
    { id: 'gas station', label: 'Gas Stations', category: 'Auto services' },
    { id: 'tires', label: 'Tire Services', category: 'Auto services' }
  ],
  'Entertainment': [
    { id: 'movies', label: 'Movie Theaters', category: 'Entertainment' },
    { id: 'bowling', label: 'Bowling', category: 'Entertainment' },
    { id: 'arcade', label: 'Arcade & Games', category: 'Entertainment' },
    { id: 'mini golf', label: 'Mini Golf', category: 'Entertainment' },
    { id: 'bars', label: 'Bars & Nightlife', category: 'Entertainment' },
    { id: 'live music', label: 'Live Music', category: 'Entertainment' }
  ]
};

export const getAllSubfilters = (): Subfilter[] => {
  return Object.values(SUBFILTERS_BY_CATEGORY).flat();
};

export const getSubfiltersForCategory = (category: string): Subfilter[] => {
  // Use the exact category name without normalization
  return SUBFILTERS_BY_CATEGORY[category] || [];
};
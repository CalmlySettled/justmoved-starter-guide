import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface QuickSelectTagsProps {
  category: string;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  type?: 'subfilter' | 'feature';
}

const COMMON_SUBFILTERS_BY_CATEGORY: Record<string, string[]> = {
  restaurants: ['Fast Casual', 'Family Friendly', 'Takeout', 'Italian', 'Mexican', 'Pizza', 'Chinese', 'Breakfast', 'Vegetarian', 'Vegan'],
  'grocery stores': ['Organic', 'Budget Friendly', 'International', 'Convenience', 'Specialty', 'Bulk'],
  pharmacies: ['24 Hour', 'Drive-through', 'Compounding', 'Vaccination Services'],
  gyms: ['24 Hour', 'Personal Training', 'Group Classes', 'Swimming Pool', 'Sauna'],
  banks: ['Drive-through', '24 Hour ATM', 'Investment Services', 'Small Business'],
  'gas stations': ['24 Hour', 'Car Wash', 'Convenience Store', 'Electric Charging'],
  'coffee shops': ['Drive-through', 'WiFi', 'Study Space', 'Outdoor Seating', 'Local Roaster'],
  'beauty salons': ['Walk-ins Welcome', 'Unisex', 'Organic Products', 'Luxury'],
  medical: ['Walk-in', 'Appointments Required', 'Specialty Care', 'Urgent Care', 'Pediatric'],
  shopping: ['Department Store', 'Outlet', 'Luxury', 'Local Business', 'Chain Store']
};

const COMMON_BUSINESS_FEATURES = [
  'Free Parking',
  'Wheelchair Accessible', 
  'Outdoor Seating',
  'WiFi Available',
  'Drive-through',
  'Delivery Available',
  '24 Hour Service',
  'Accepts Credit Cards',
  'Pet Friendly',
  'Air Conditioning',
  'Online Ordering',
  'Curbside Pickup',
  'Loyalty Program',
  'Senior Discounts',
  'Student Discounts'
];

const QuickSelectTags: React.FC<QuickSelectTagsProps> = ({
  category,
  selectedTags,
  onTagToggle,
  type = 'subfilter'
}) => {
  const availableTags = type === 'subfilter' 
    ? (COMMON_SUBFILTERS_BY_CATEGORY[category] || [])
    : COMMON_BUSINESS_FEATURES;

  if (availableTags.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">
        Quick Select {type === 'subfilter' ? 'Tags' : 'Features'}:
      </div>
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Button
              key={tag}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => onTagToggle(tag)}
              className="h-8 text-xs"
            >
              {isSelected ? (
                <>
                  <X className="h-3 w-3 mr-1" />
                  {tag}
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  {tag}
                </>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickSelectTags;
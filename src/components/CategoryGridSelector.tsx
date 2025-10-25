import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Store, Pill, Fuel, Stethoscope, Trash2, Wifi, Building2, 
  Hammer, Sofa, Sparkles, Car, Dumbbell, Mail, PawPrint, 
  Baby, Coffee, UtensilsCrossed, Heart, Trees, Church, 
  Calendar, ShoppingBag, Palette, Gamepad2
} from 'lucide-react';

interface CategoryGridSelectorProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  businessCounts: Record<string, number>;
  groupByType?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<any>> = {
  'grocery stores': Store,
  'pharmacies': Pill,
  'gas stations': Fuel,
  'doctors': Stethoscope,
  'junk removal': Trash2,
  'internet providers': Wifi,
  'banks': Building2,
  'hardware stores': Hammer,
  'furniture stores': Sofa,
  'cleaning services': Sparkles,
  'DMV': Car,
  'Fitness': Dumbbell,
  'post offices': Mail,
  'veterinarians': PawPrint,
  'daycares': Baby,
  'Drink Time': Coffee,
  'Food Time': UtensilsCrossed,
  'Personal Care & Wellness': Heart,
  'Outdoor Activities': Trees,
  'Faith Communities': Church,
  'Nearby Events': Calendar,
  'Shopping': ShoppingBag,
  'Art & Culture': Palette,
  'Games': Gamepad2
};

const ESSENTIALS = [
  'grocery stores', 'pharmacies', 'gas stations', 'doctors', 'junk removal',
  'internet providers', 'banks', 'hardware stores', 'furniture stores',
  'cleaning services', 'DMV', 'Fitness', 'post offices', 'veterinarians', 'daycares'
];

const CategoryGridSelector: React.FC<CategoryGridSelectorProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  businessCounts,
  groupByType = true
}) => {
  const getCompletionPercentage = (category: string) => {
    const count = businessCounts[category] || 0;
    const target = 5; // Assume 5 businesses is "complete"
    return Math.min((count / target) * 100, 100);
  };

  const renderCategoryCard = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || Store;
    const count = businessCounts[category] || 0;
    const completion = getCompletionPercentage(category);
    const isActive = activeCategory === category;

    return (
      <button
        key={category}
        onClick={() => onCategoryChange(category)}
        className={`
          group relative p-4 rounded-xl border-2 transition-all duration-200
          hover:shadow-lg hover:-translate-y-1
          ${isActive 
            ? 'border-primary bg-primary/5 shadow-md' 
            : 'border-border bg-card hover:border-primary/50'
          }
        `}
      >
        {/* Completion Ring Background */}
        <div className="absolute top-3 right-3">
          <svg className="w-10 h-10 transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-muted/20"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 16}`}
              strokeDashoffset={`${2 * Math.PI * 16 * (1 - completion / 100)}`}
              className={completion === 100 ? 'text-green-500' : 'text-primary'}
              strokeLinecap="round"
            />
          </svg>
          <Badge 
            variant="secondary" 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold"
          >
            {count}
          </Badge>
        </div>

        {/* Icon and Label */}
        <div className="flex flex-col items-start gap-3 pr-12">
          <div className={`
            p-2 rounded-lg transition-colors
            ${isActive ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'}
          `}>
            <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-left">
            <h3 className={`font-semibold text-sm leading-tight ${isActive ? 'text-primary' : ''}`}>
              {category}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {count === 0 ? 'Empty' : `${count} business${count !== 1 ? 'es' : ''}`}
            </p>
          </div>
        </div>
      </button>
    );
  };

  if (!groupByType) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {categories.map(renderCategoryCard)}
      </div>
    );
  }

  const essentials = categories.filter(cat => ESSENTIALS.includes(cat));
  const popular = categories.filter(cat => !ESSENTIALS.includes(cat));

  return (
    <div className="space-y-6">
      {popular.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Popular Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {popular.map(renderCategoryCard)}
          </div>
        </div>
      )}

      {essentials.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Essentials
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {essentials.map(renderCategoryCard)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryGridSelector;

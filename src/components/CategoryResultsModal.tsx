import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BusinessCard } from '@/components/BusinessCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface Business {
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  image_url?: string;
  features: string[];
  latitude: number;
  longitude: number;
  distance_miles: number;
  place_id?: string;
}

interface CategoryResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  businesses: Business[];
  isLoading: boolean;
  favoriteBusinesses: Set<string>;
  favoritingBusinesses: Set<string>;
  onToggleFavorite: (business: Business, category: string) => void;
}

export const CategoryResultsModal: React.FC<CategoryResultsModalProps> = ({
  isOpen,
  onClose,
  categoryName,
  businesses,
  isLoading,
  favoriteBusinesses,
  favoritingBusinesses,
  onToggleFavorite,
}) => {
  const isMobile = useIsMobile();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-section">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <DialogTitle className="text-2xl sm:text-3xl font-bold">
              {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading recommendations...</p>
            </div>
          ) : (
            <div className={`grid gap-4 md:gap-6 ${
              isMobile 
                ? 'grid-cols-2' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {businesses.map((business, index) => (
                <BusinessCard
                  key={index}
                  business={{
                    name: business.name,
                    address: business.address,
                    website: business.website,
                    image_url: business.image_url,
                    features: business.features,
                    distance_miles: business.distance_miles,
                    place_id: business.place_id,
                    category: categoryName
                  }}
                  isFavorited={favoriteBusinesses.has(business.name)}
                  isToggling={favoritingBusinesses.has(business.name)}
                  onToggleFavorite={() => onToggleFavorite(business, categoryName)}
                  showImage={true}
                  variant="explore"
                  compact={isMobile}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
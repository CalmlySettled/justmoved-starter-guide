import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { BusinessCard } from '@/components/BusinessCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSubfiltersForCategory } from '@/data/subfilters';
import { useSubfilters } from '@/hooks/useSubfilters';

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
  userLocation?: string;
  userId?: string;
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
  userLocation,
  userId,
}) => {
  const isMobile = useIsMobile();
  const { fetchFilteredBusinesses, isLoading: isFilterLoading } = useSubfilters();
  
  const [selectedSubfilter, setSelectedSubfilter] = useState<string>('');
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [showFiltered, setShowFiltered] = useState(false);
  
  const subfilters = getSubfiltersForCategory(categoryName.toLowerCase());
  const displayBusinesses = showFiltered ? filteredBusinesses : businesses;
  const displayLoading = isLoading || (showFiltered && isFilterLoading);

  const handleSubfilterSelect = async (subfilterId: string) => {
    if (!subfilterId) {
      setSelectedSubfilter('');
      setShowFiltered(false);
      return;
    }

    setSelectedSubfilter(subfilterId);
    const results = await fetchFilteredBusinesses(categoryName.toLowerCase(), subfilterId, userLocation, userId);
    setFilteredBusinesses(results);
    setShowFiltered(true);
  };

  const clearFilter = () => {
    setSelectedSubfilter('');
    setShowFiltered(false);
    setFilteredBusinesses([]);
  };

  // Reset filter state when modal opens/closes or category changes
  useEffect(() => {
    if (!isOpen) {
      clearFilter();
    }
  }, [isOpen, categoryName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-section">
          <div className="flex items-center gap-4 mb-4">
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

          {/* Subfilter Controls */}
          {subfilters.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedSubfilter} onValueChange={handleSubfilterSelect}>
                  <SelectTrigger className="w-[200px] h-9 bg-background/50 border-border/50">
                    <SelectValue placeholder="Filter by type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50 shadow-elevation-3">
                    {subfilters.map((subfilter) => (
                      <SelectItem key={subfilter.id} value={subfilter.id}>
                        {subfilter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedSubfilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilter}
                    className="h-9 px-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {showFiltered ? (
                    <>
                      Showing {filteredBusinesses.length} filtered result{filteredBusinesses.length !== 1 ? 's' : ''}
                      {selectedSubfilter && (
                        <span className="ml-1 font-medium">
                          • {subfilters.find(s => s.id === selectedSubfilter)?.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <>Showing {businesses.length} result{businesses.length !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {displayLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">
                {showFiltered ? 'Filtering recommendations...' : 'Loading recommendations...'}
              </p>
            </div>
          ) : displayBusinesses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                {showFiltered 
                  ? `No ${subfilters.find(s => s.id === selectedSubfilter)?.label?.toLowerCase()} found in this area.`
                  : 'No recommendations available for this category.'
                }
              </p>
              {showFiltered && (
                <Button variant="outline" onClick={clearFilter}>
                  View all {categoryName}
                </Button>
              )}
            </div>
          ) : (
            <div className={`grid gap-4 md:gap-6 ${
              isMobile 
                ? 'grid-cols-2' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {displayBusinesses.map((business, index) => (
                <BusinessCard
                  key={`${showFiltered ? 'filtered' : 'all'}-${index}`}
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
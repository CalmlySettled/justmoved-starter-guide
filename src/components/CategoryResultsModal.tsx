import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, MapPin, Star, ExternalLink, Loader2 } from 'lucide-react';
import { useBusinessDetails } from '@/hooks/useBusinessDetails';

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
  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});

  // Helper function to create Google Maps search URL
  const getGoogleMapsDirectionsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleGetWebsite = async (business: Business) => {
    if (!business.place_id) return;
    
    const details = await getBusinessDetails(business.place_id, business.name);
    if (details?.website) {
      setBusinessWebsites(prev => ({ ...prev, [business.place_id!]: details.website! }));
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((business, index) => (
                <Card 
                  key={index} 
                  className="group hover:shadow-card-hover transition-all duration-300 border-0 shadow-card bg-gradient-card rounded-2xl overflow-hidden"
                >
                  {/* Business Image */}
                  <div className="aspect-video overflow-hidden bg-muted">
                    <ImageWithFallback
                      src={business.image_url || ''}
                      alt={business.name}
                      businessName={business.name}
                      category={categoryName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground">
                          {business.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {business.distance_miles && (
                            <>
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">
                                {business.distance_miles} miles away
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFavorite(business, categoryName)}
                        disabled={favoritingBusinesses.has(business.name)}
                        className="h-10 w-10 p-0 hover:bg-primary/10 min-h-[44px] min-w-[44px]"
                      >
                        <Star 
                          className="h-5 w-5" 
                          fill={favoriteBusinesses.has(business.name) ? "currentColor" : "none"}
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  
                   <CardContent className="space-y-4">
                     {business.address && (
                       <a 
                         href={getGoogleMapsDirectionsUrl(business.address, business.name)}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer"
                       >
                         <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                         <span className="underline-offset-2 hover:underline hover:text-blue-600 transition-colors">
                           {business.address}
                         </span>
                       </a>
                     )}
                     
                      <div className="flex gap-2">
                        <TooltipProvider>
                          {business.website || businessWebsites[business.place_id!] ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => window.open(business.website || businessWebsites[business.place_id!], '_blank')}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Website
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Opens in new tab</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : business.place_id ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleGetWebsite(business)}
                                  disabled={loadingStates[business.place_id]}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingStates[business.place_id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ExternalLink className="h-4 w-4" />
                                  )}
                                  {loadingStates[business.place_id] ? 'Loading...' : 'Get Website'}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Opens in new tab</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </TooltipProvider>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
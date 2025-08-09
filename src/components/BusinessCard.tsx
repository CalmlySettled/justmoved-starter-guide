import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Star, ExternalLink, Phone, Loader2 } from 'lucide-react';
import { useBusinessDetails } from '@/hooks/useBusinessDetails';

interface BusinessCardData {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  image_url?: string;
  features?: string[];
  distance_miles?: number;
  place_id?: string;
  category?: string;
}

interface BusinessCardProps {
  business: BusinessCardData;
  isFavorited: boolean;
  isToggling?: boolean;
  onToggleFavorite: () => void;
  onRemoveFavorite?: () => void;
  showImage?: boolean;
  variant?: 'explore' | 'favorites';
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  isFavorited,
  isToggling = false,
  onToggleFavorite,
  onRemoveFavorite,
  showImage = true,
  variant = 'explore'
}) => {
  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});

  // Helper function to create Google Maps search URL
  const getGoogleMapsDirectionsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleGetWebsite = async () => {
    if (!business.place_id) return;
    
    const details = await getBusinessDetails(business.place_id, business.name);
    if (details?.website) {
      setBusinessWebsites(prev => ({ ...prev, [business.place_id!]: details.website! }));
    }
  };

  const getBusinessTagline = () => {
    // Generate clean taglines based on category
    if (business.category?.toLowerCase().includes('grocery')) {
      if (business.name.toLowerCase().includes('geissler')) return "Family-owned grocery chain with great produce";
      if (business.features?.some(f => f.toLowerCase().includes('organic'))) return "Fresh organic produce and natural foods";
      if (business.features?.some(f => f.toLowerCase().includes('affordable'))) return "Affordable groceries for everyday needs";
      return "Your neighborhood grocery destination";
    }
    if (business.category?.toLowerCase().includes('fitness')) {
      return "Stay active and healthy in your community";
    }
    if (business.category?.toLowerCase().includes('restaurant')) {
      return "Local dining favorite";
    }
    if (business.category?.toLowerCase().includes('faith')) {
      return "Welcoming spiritual community";
    }
    if (business.category?.toLowerCase().includes('green space')) {
      return "Perfect for outdoor activities and relaxation";
    }
    return "Highly recommended local spot";
  };

  const getBusinessBadges = () => {
    const badges = [];
    
    // Local badge for non-franchise businesses
    const businessNameLower = business.name.toLowerCase();
    const franchiseIndicators = ['mcdonalds', 'subway', 'starbucks', 'walmart', 'target', 'cvs', 'walgreens', 'kroger', 'safeway', 'whole foods', 'trader joe', 'costco', 'planet fitness', 'la fitness'];
    const isLocalFavorite = !franchiseIndicators.some(franchise => businessNameLower.includes(franchise));
    
    if (isLocalFavorite) {
      badges.push({ 
        label: "Local", 
        icon: "🏪", 
        color: "bg-green-50 text-green-700 border border-green-200" 
      });
    }
    
    // Add a nearby badge if distance is available
    if (business.distance_miles && business.distance_miles <= 2) {
      badges.push({ 
        label: "Nearby", 
        icon: "📍", 
        color: "bg-blue-50 text-blue-700 border border-blue-200" 
      });
    }
    
    return badges.slice(0, 2); // Only show 2 most important badges
  };

  return (
    <Card 
      className="group hover:shadow-card-hover transition-all duration-300 border-0 shadow-card bg-gradient-card rounded-2xl overflow-hidden h-fit"
    >
      {/* Business Image */}
      {showImage && (
        <div className="aspect-video overflow-hidden bg-muted">
          <ImageWithFallback
            src={business.image_url || ''}
            alt={business.name}
            businessName={business.name}
            category={business.category || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <CardHeader className={`mobile-padding ${variant === 'explore' ? "pb-3 md:pb-4" : "pb-2 md:pb-3"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg md:text-xl mobile-text">
              {business.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {business.distance_miles && (
                <>
                  <MapPin className="h-3 w-3 md:h-3 md:w-3 text-muted-foreground" />
                  <span className="text-sm md:text-xs text-muted-foreground font-medium">
                    {business.distance_miles} miles away
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={variant === 'favorites' && onRemoveFavorite ? onRemoveFavorite : onToggleFavorite}
            disabled={isToggling}
            className="h-12 w-12 md:h-10 md:w-10 p-0 min-h-[44px] min-w-[44px] hover:bg-primary/10 mobile-touch"
          >
            <Star 
              className="h-6 w-6 md:h-5 md:w-5 text-yellow-500" 
              fill={isFavorited ? "currentColor" : "none"}
            />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={`mobile-padding space-y-3 md:space-y-4 ${variant === 'favorites' ? 'pt-0' : ''}`}>
        {/* Address */}
        {business.address && (
          <a 
            href={getGoogleMapsDirectionsUrl(business.address, business.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 text-sm md:text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer mobile-touch"
          >
            <MapPin className="h-4 w-4 md:h-4 md:w-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="underline-offset-2 hover:underline hover:text-blue-600 transition-colors">
              {business.address}
            </span>
          </a>
        )}

        
        {/* Action buttons */}
        <div className="flex gap-2">
          <TooltipProvider>
            {business.website || businessWebsites[business.place_id!] ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => window.open(business.website || businessWebsites[business.place_id!], '_blank')}
                    className="inline-flex items-center gap-2 px-4 py-3 md:px-4 md:py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30 mobile-touch"
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
                    onClick={handleGetWebsite}
                    disabled={loadingStates[business.place_id]}
                    className="inline-flex items-center gap-2 px-4 py-3 md:px-4 md:py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed mobile-touch"
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
  );
};
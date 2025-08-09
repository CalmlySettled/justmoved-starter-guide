import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/ui/image-with-fallback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Star, ExternalLink, Loader2, Navigation } from 'lucide-react';
import { useBusinessDetails } from '@/hooks/useBusinessDetails';
import { useAnalytics } from '@/hooks/useAnalytics';

interface BusinessCardData {
  name: string;
  address?: string;
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
  compact?: boolean;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  isFavorited,
  isToggling = false,
  onToggleFavorite,
  onRemoveFavorite,
  showImage = true,
  variant = 'explore',
  compact = false
}) => {
  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});
  const { trackDirectionsClick, trackWebsiteRequest, trackWebsiteVisit, trackFavoriteAction } = useAnalytics();

  // Helper function to create Google Maps search URL
  const getGoogleMapsDirectionsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleGetWebsite = async () => {
    if (!business.place_id) return;
    
    // Track website request event
    trackWebsiteRequest(business.name, business.category, undefined);
    
    const details = await getBusinessDetails(business.place_id, business.name);
    if (details?.website) {
      setBusinessWebsites(prev => ({ ...prev, [business.place_id!]: details.website! }));
      // Track successful website request
      trackWebsiteRequest(business.name, business.category, true);
    } else {
      // Track failed website request
      trackWebsiteRequest(business.name, business.category, false);
    }
  };

  // Handle business name click to open website
  const handleBusinessNameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const websiteUrl = business.website || businessWebsites[business.place_id!];
    if (websiteUrl) {
      handleWebsiteVisit(websiteUrl);
    } else if (business.place_id && !loadingStates[business.place_id]) {
      handleGetWebsite();
    }
  };

  // Get website URL for business name link
  const getWebsiteUrl = () => {
    return business.website || businessWebsites[business.place_id!];
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

  // Handle directions click with tracking
  const handleDirectionsClick = () => {
    if (business.address) {
      trackDirectionsClick(business.name, business.address, business.category);
    }
  };

  // Handle website visit with tracking
  const handleWebsiteVisit = (websiteUrl: string) => {
    trackWebsiteVisit(business.name, websiteUrl, business.category);
    window.open(websiteUrl, '_blank');
  };

  // Handle favorite action with enhanced tracking
  const handleFavoriteToggle = () => {
    const action = isFavorited ? 'removed' : 'added';
    trackFavoriteAction(business.name, business.category || 'general', action);
    
    if (variant === 'favorites' && onRemoveFavorite) {
      onRemoveFavorite();
    } else {
      onToggleFavorite();
    }
  };

  return (
    <Card 
      className={`group hover:shadow-card-hover transition-all duration-300 border-0 shadow-card bg-gradient-card rounded-2xl overflow-hidden ${compact ? 'flex flex-col' : 'h-fit'}`}
    >
      {/* Business Image */}
      {showImage && (
        <div className={`overflow-hidden bg-muted ${compact ? 'aspect-[4/3]' : 'aspect-video'}`}>
          <ImageWithFallback
            src={business.image_url || ''}
            alt={business.name}
            businessName={business.name}
            category={business.category || ''}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <CardHeader className={`${compact ? 'p-3' : 'mobile-padding'} ${variant === 'explore' ? "pb-3 md:pb-4" : "pb-2 md:pb-3"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
            <h3 
                className={`font-semibold text-foreground ${compact ? 'text-sm leading-tight' : 'text-lg md:text-xl mobile-text'} ${business.place_id ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                onClick={business.place_id ? handleBusinessNameClick : undefined}
              >
                {business.name}
              </h3>
              {business.place_id && (
                <>
                  {loadingStates[business.place_id] ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : getWebsiteUrl() ? (
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {business.distance_miles && business.address && (
                <a
                  href={getGoogleMapsDirectionsUrl(business.address, business.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDirectionsClick}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer group"
                >
                  <Navigation className={`${compact ? 'h-3 w-3' : 'h-3 w-3 md:h-3 md:w-3'} group-hover:scale-110 transition-transform`} />
                  <span className={`font-medium hover:underline ${compact ? 'text-xs' : 'text-sm md:text-xs'}`}>
                    {business.distance_miles} miles away
                  </span>
                </a>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavoriteToggle}
            disabled={isToggling}
            className={`p-0 hover:bg-primary/10 mobile-touch ${compact ? 'h-8 w-8 min-h-[32px] min-w-[32px]' : 'h-12 w-12 md:h-10 md:w-10 min-h-[44px] min-w-[44px]'}`}
          >
            <Star 
              className={`text-yellow-500 ${compact ? 'h-4 w-4' : 'h-6 w-6 md:h-5 md:w-5'}`}
              fill={isFavorited ? "currentColor" : "none"}
            />
          </Button>
        </div>
      </CardHeader>
      
      {!compact && (
        <CardContent className={`space-y-3 md:space-y-4 mobile-padding ${variant === 'favorites' ? 'pt-0' : ''}`}>
          {/* Address */}
          {business.address && (
            <a 
              href={getGoogleMapsDirectionsUrl(business.address, business.name)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDirectionsClick}
              className="flex items-start gap-2 text-sm md:text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer mobile-touch"
            >
              <MapPin className="h-4 w-4 md:h-4 md:w-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <span className="underline-offset-2 hover:underline hover:text-blue-600 transition-colors">
                {business.address}
              </span>
            </a>
          )}
        </CardContent>
      )}
    </Card>
  );
};
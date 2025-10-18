import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { MapPin, Search, Star, CheckCircle2, Loader2 } from 'lucide-react';

interface Property {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface BatchBusinessEntryProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  category: string;
  onComplete: () => void;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface BatchBusiness extends GooglePlaceResult {
  selected: boolean;
  editedName?: string;
  editedPhone?: string;
  features: string[];
}

const BatchBusinessEntry: React.FC<BatchBusinessEntryProps> = ({
  isOpen,
  onClose,
  property,
  category,
  onComplete
}) => {
  const [searchQuery, setSearchQuery] = useState(`${category} near ${property.address}`);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<BatchBusiness[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setBusinesses([]);

      console.log('[BATCH-SEARCH] Starting search:', {
        query: searchQuery,
        property: { id: property.id, lat: property.latitude, lng: property.longitude }
      });

      // Search for places using Google Places API
      const { data, error } = await supabase.functions.invoke('search-google-places', {
        body: { 
          query: searchQuery,
          limit: 10,
          location: property.latitude && property.longitude 
            ? `${property.latitude},${property.longitude}`
            : undefined
        }
      });

      console.log('[BATCH-SEARCH] Edge function response:', { 
        hasData: !!data, 
        hasError: !!error,
        data: data,
        error: error
      });

      if (error) {
        console.error('[BATCH-SEARCH] Edge function error:', error);
        throw error;
      }

      // Check for Google API errors in response
      if (data?.error || data?.google_status) {
        console.error('[BATCH-SEARCH] Google API error in response:', {
          error: data.error,
          details: data.details,
          google_status: data.google_status
        });
        toast.error(data.error || 'Failed to search businesses', {
          description: data.details || 'Check console for details'
        });
        return;
      }

      if (data?.results && data.results.length > 0) {
        console.log('[BATCH-SEARCH] Found results:', data.results.length);
        // Convert Text Search results to BatchBusiness format
        const results: BatchBusiness[] = data.results.map((result: any) => ({
          place_id: result.place_id,
          name: result.name || 'Unknown',
          formatted_address: result.formatted_address,
          rating: result.rating,
          geometry: result.geometry,
          selected: false,
          features: []
        }));

        setBusinesses(results);
        toast.success(`Found ${results.length} businesses with full details`);
      } else {
        console.warn('[BATCH-SEARCH] No results in response:', data);
        toast.error('No businesses found. Try a different search term.');
      }
    } catch (error: any) {
      console.error('[BATCH-SEARCH] Caught error:', {
        message: error?.message,
        details: error?.details,
        full_error: error
      });
      toast.error('Failed to search businesses', {
        description: error?.message || 'Check console for details'
      });
    } finally {
      setSearching(false);
    }
  };

  const toggleSelection = (placeId: string) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.place_id === placeId ? { ...b, selected: !b.selected } : b
      )
    );
  };

  const selectAll = () => {
    setBusinesses(prev => prev.map(b => ({ ...b, selected: true })));
  };

  const deselectAll = () => {
    setBusinesses(prev => prev.map(b => ({ ...b, selected: false })));
  };

  const updateBusinessField = (placeId: string, field: string, value: any) => {
    setBusinesses(prev =>
      prev.map(b =>
        b.place_id === placeId ? { ...b, [field]: value } : b
      )
    );
  };

  const geocodeAddress = async (address: string) => {
    try {
      const { data } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });
      
      if (data?.lat && data?.lng) {
        return { latitude: data.lat, longitude: data.lng };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleAddSelected = async () => {
    const selectedBusinesses = businesses.filter(b => b.selected);
    
    if (selectedBusinesses.length === 0) {
      toast.error('Please select at least one business');
      return;
    }

    try {
      setSaving(true);

      // Geocode all addresses in parallel
      const geocodePromises = selectedBusinesses.map(async (business) => {
        const address = business.formatted_address || '';
        let coordinates = null;
        
        // Use existing geometry if available
        if (business.geometry?.location) {
          coordinates = {
            latitude: business.geometry.location.lat,
            longitude: business.geometry.location.lng
          };
        } else if (address) {
          coordinates = await geocodeAddress(address);
        }

        return {
          property_id: property.id,
          category,
          business_name: business.editedName || business.name,
          business_address: address || null,
          business_phone: business.editedPhone || null,
          business_website: null,
          business_description: null,
          rating: business.rating || null,
          subfilter_tags: [],
          business_features: business.features,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          place_id: business.place_id,
          is_active: true,
          sort_order: 0
        };
      });

      const businessData = await Promise.all(geocodePromises);

      // Bulk insert all businesses
      const { error } = await supabase
        .from('curated_property_places')
        .insert(businessData);

      if (error) throw error;

      toast.success(`Successfully added ${selectedBusinesses.length} businesses to ${category}`);
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error adding businesses:', error);
      toast.error('Failed to add businesses');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = businesses.filter(b => b.selected).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Add Businesses - {category}</DialogTitle>
          <DialogDescription>
            Search for multiple businesses and add them all at once. This is 80% faster than adding individually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`e.g., "${category} near ${property.address.split(',')[0]}"`}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="flex items-center gap-2"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          {businesses.length > 0 && (
            <>
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="text-sm text-muted-foreground">
                  Found {businesses.length} businesses • {selectedCount} selected
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={selectAll} 
                    variant="outline" 
                    size="sm"
                    disabled={selectedCount === businesses.length}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={deselectAll} 
                    variant="outline" 
                    size="sm"
                    disabled={selectedCount === 0}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {businesses.map((business) => (
                  <div
                    key={business.place_id}
                    className={`border rounded-lg p-4 transition-all ${
                      business.selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={business.selected}
                        onCheckedChange={() => toggleSelection(business.place_id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {business.name}
                          </h4>
                          {business.rating && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {business.rating}
                            </Badge>
                          )}
                        </div>
                        {business.formatted_address && (
                          <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{business.formatted_address}</span>
                          </p>
                        )}
                        {business.selected && (
                          <div className="mt-3 space-y-2">
                            <Input
                              value={business.editedName || business.name}
                              onChange={(e) =>
                                updateBusinessField(business.place_id, 'editedName', e.target.value)
                              }
                              placeholder="Business name"
                              className="h-8 text-xs"
                            />
                            <Input
                              value={business.editedPhone || ''}
                              onChange={(e) =>
                                updateBusinessField(business.place_id, 'editedPhone', e.target.value)
                              }
                              placeholder="Phone (optional)"
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {businesses.length === 0 && !searching && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Search for businesses to get started</p>
              <p className="text-sm">Try searching for "{category}" near your property</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddSelected} 
            disabled={selectedCount === 0 || saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Add {selectedCount} Business{selectedCount !== 1 ? 'es' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchBusinessEntry;

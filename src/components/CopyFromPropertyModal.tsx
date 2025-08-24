import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building, Search, MapPin, Copy } from 'lucide-react';

interface Property {
  id: string;
  property_name: string;
  address: string;
  total_curated_places: number;
}

interface CuratedPlace {
  id: string;
  category: string;
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_website?: string;
  business_description?: string;
  subfilter_tags: string[];
  business_features: string[];
  rating?: number;
  latitude?: number;
  longitude?: number;
}

interface CopyFromPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPropertyId: string;
  onCopyComplete: () => void;
}

const CopyFromPropertyModal: React.FC<CopyFromPropertyModalProps> = ({
  isOpen,
  onClose,
  targetPropertyId,
  onCopyComplete
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [businesses, setBusinesses] = useState<CuratedPlace[]>([]);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen, targetPropertyId]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          property_name,
          address,
          total_curated_places
        `)
        .neq('id', targetPropertyId)
        .gt('total_curated_places', 0)
        .order('total_curated_places', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessesFromProperty = async (propertyId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('curated_property_places')
        .select('*')
        .eq('property_id', propertyId)
        .eq('is_active', true)
        .order('category')
        .order('business_name');

      if (error) throw error;
      setBusinesses(data || []);
      setSelectedBusinesses([]); // Reset selection
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    fetchBusinessesFromProperty(property.id);
  };

  const handleBusinessToggle = (businessId: string) => {
    setSelectedBusinesses(prev => 
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBusinesses.length === businesses.length) {
      setSelectedBusinesses([]);
    } else {
      setSelectedBusinesses(businesses.map(b => b.id));
    }
  };

  const handleCopyBusinesses = async () => {
    if (selectedBusinesses.length === 0) {
      toast.error('Please select at least one business to copy');
      return;
    }

    setCopying(true);
    try {
      const businessesToCopy = businesses.filter(b => selectedBusinesses.includes(b.id));
      
      const copyData = businessesToCopy.map(business => ({
        property_id: targetPropertyId,
        category: business.category,
        business_name: business.business_name,
        business_address: business.business_address,
        business_phone: business.business_phone,
        business_website: business.business_website,
        business_description: business.business_description,
        subfilter_tags: business.subfilter_tags,
        business_features: business.business_features,
        rating: business.rating,
        latitude: business.latitude,
        longitude: business.longitude,
        is_active: true,
        sort_order: 0
      }));

      const { error } = await supabase
        .from('curated_property_places')
        .insert(copyData);

      if (error) throw error;

      toast.success(`Successfully copied ${selectedBusinesses.length} businesses`);
      onCopyComplete();
      onClose();
    } catch (error) {
      console.error('Error copying businesses:', error);
      toast.error('Failed to copy businesses');
    } finally {
      setCopying(false);
    }
  };

  const filteredProperties = properties.filter(property =>
    property.property_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const businessesByCategory = businesses.reduce((acc, business) => {
    if (!acc[business.category]) {
      acc[business.category] = [];
    }
    acc[business.category].push(business);
    return acc;
  }, {} as Record<string, CuratedPlace[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copy Businesses from Another Property
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {!selectedProperty ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No properties with curated businesses found.</p>
                  </div>
                ) : (
                  filteredProperties.map(property => (
                    <Card
                      key={property.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handlePropertySelect(property)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{property.property_name}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {property.address}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {property.total_curated_places} businesses
                        </Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedProperty.property_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProperty.address}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedProperty(null)}>
                  Back to Properties
                </Button>
              </div>

              {businesses.length > 0 && (
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedBusinesses.length === businesses.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    {selectedBusinesses.length} of {businesses.length} selected
                  </div>
                </div>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : Object.keys(businessesByCategory).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No businesses found for this property.</p>
                  </div>
                ) : (
                  Object.entries(businessesByCategory).map(([category, categoryBusinesses]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </h4>
                      {categoryBusinesses.map(business => (
                        <div
                          key={business.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedBusinesses.includes(business.id)}
                            onCheckedChange={() => handleBusinessToggle(business.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{business.business_name}</div>
                            {business.business_address && (
                              <div className="text-sm text-muted-foreground">{business.business_address}</div>
                            )}
                            {business.subfilter_tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {business.subfilter_tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selectedProperty && (
            <Button
              onClick={handleCopyBusinesses}
              disabled={copying || selectedBusinesses.length === 0}
            >
              {copying ? 'Copying...' : `Copy ${selectedBusinesses.length} Businesses`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CopyFromPropertyModal;
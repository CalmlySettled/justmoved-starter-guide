import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Phone, Globe, Star, Plus, X, Search } from 'lucide-react';
import GooglePlacesAutocomplete from './GooglePlacesAutocomplete';
import QuickSelectTags from './QuickSelectTags';

interface Property {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface CuratedPlace {
  id: string;
  category: string;
  subfilter_tags: string[];
  business_name: string;
  business_address: string;
  business_phone?: string;
  business_website?: string;
  business_description?: string;
  business_features: string[];
  latitude?: number;
  longitude?: number;
  rating?: number;
  sort_order: number;
  is_active: boolean;
}

interface BusinessFormProps {
  property: Property;
  category: string;
  business?: CuratedPlace | null;
  onSave: () => void;
  onCancel: () => void;
}

const BusinessForm: React.FC<BusinessFormProps> = ({ 
  property, 
  category, 
  business, 
  onSave, 
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [useAutocomplete, setUseAutocomplete] = useState(true);
  const [formData, setFormData] = useState({
    business_name: business?.business_name || '',
    business_address: business?.business_address || '',
    business_phone: business?.business_phone || '',
    business_website: business?.business_website || '',
    business_description: business?.business_description || '',
    rating: business?.rating || 0,
    subfilter_tags: business?.subfilter_tags || [],
    business_features: business?.business_features || []
  });
  
  const [newTag, setNewTag] = useState('');
  const [newFeature, setNewFeature] = useState('');

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.subfilter_tags.includes(newTag.trim())) {
      handleInputChange('subfilter_tags', [...formData.subfilter_tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('subfilter_tags', formData.subfilter_tags.filter(tag => tag !== tagToRemove));
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.business_features.includes(newFeature.trim())) {
      handleInputChange('business_features', [...formData.business_features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (featureToRemove: string) => {
    handleInputChange('business_features', formData.business_features.filter(feature => feature !== featureToRemove));
  };

  const handlePlaceSelect = (place: any) => {
    setFormData(prev => ({
      ...prev,
      business_name: place.name || prev.business_name,
      business_address: place.formatted_address || prev.business_address,
      business_phone: place.formatted_phone_number || prev.business_phone,
      business_website: place.website || prev.business_website,
      rating: place.rating || prev.rating
    }));
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = formData.subfilter_tags;
    if (currentTags.includes(tag)) {
      handleInputChange('subfilter_tags', currentTags.filter(t => t !== tag));
    } else {
      handleInputChange('subfilter_tags', [...currentTags, tag]);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    const currentFeatures = formData.business_features;
    if (currentFeatures.includes(feature)) {
      handleInputChange('business_features', currentFeatures.filter(f => f !== feature));
    } else {
      handleInputChange('business_features', [...currentFeatures, feature]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name.trim()) {
      toast.error('Business name is required');
      return;
    }

    try {
      setLoading(true);

      // Geocode address if provided
      let coordinates = null;
      if (formData.business_address.trim()) {
        coordinates = await geocodeAddress(formData.business_address);
      }

      const businessData = {
        property_id: property.id,
        category,
        business_name: formData.business_name.trim(),
        business_address: formData.business_address.trim() || null,
        business_phone: formData.business_phone.trim() || null,
        business_website: formData.business_website.trim() || null,
        business_description: formData.business_description.trim() || null,
        rating: formData.rating > 0 ? formData.rating : null,
        subfilter_tags: formData.subfilter_tags,
        business_features: formData.business_features,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        is_active: true,
        sort_order: business?.sort_order || 0
      };

      if (business) {
        // Update existing business
        const { error } = await supabase
          .from('curated_property_places')
          .update(businessData)
          .eq('id', business.id);

        if (error) throw error;
        toast.success('Business updated successfully');
      } else {
        // Create new business
        const { error } = await supabase
          .from('curated_property_places')
          .insert(businessData);

        if (error) throw error;
        toast.success('Business added successfully');
      }

      onSave();
    } catch (error) {
      console.error('Error saving business:', error);
      toast.error('Failed to save business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {business ? 'Edit Business' : 'Add New Business'} - {category.charAt(0).toUpperCase() + category.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Google Places Autocomplete */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Search Business (Recommended)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUseAutocomplete(!useAutocomplete)}
              >
                {useAutocomplete ? 'Manual Entry' : 'Use Search'}
              </Button>
            </div>
            
            {useAutocomplete ? (
              <GooglePlacesAutocomplete 
                onPlaceSelect={handlePlaceSelect}
                placeholder="Search for the business..."
              />
            ) : (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                Manual entry mode - fill out the form below
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                placeholder="Enter business name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Input
                id="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.rating}
                onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                placeholder="4.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="business_address"
                value={formData.business_address}
                onChange={(e) => handleInputChange('business_address', e.target.value)}
                placeholder="123 Main St, City, State"
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="business_phone"
                  value={formData.business_phone}
                  onChange={(e) => handleInputChange('business_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="business_website"
                  value={formData.business_website}
                  onChange={(e) => handleInputChange('business_website', e.target.value)}
                  placeholder="https://example.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_description">Description</Label>
            <Textarea
              id="business_description"
              value={formData.business_description}
              onChange={(e) => handleInputChange('business_description', e.target.value)}
              placeholder="Brief description of the business..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Subfilter Tags</Label>
            
            {/* Quick Select Tags */}
            <QuickSelectTags
              category={category}
              selectedTags={formData.subfilter_tags}
              onTagToggle={handleTagToggle}
              type="subfilter"
            />
            
            {/* Manual Tag Entry */}
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add custom tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.subfilter_tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Business Features</Label>
            
            {/* Quick Select Features */}
            <QuickSelectTags
              category={category}
              selectedTags={formData.business_features}
              onTagToggle={handleFeatureToggle}
              type="feature"
            />
            
            {/* Manual Feature Entry */}
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add custom feature..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.business_features.map(feature => (
                <Badge key={feature} variant="outline" className="flex items-center gap-1">
                  {feature}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFeature(feature)} />
                </Badge>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Saving...' : (business ? 'Update Business' : 'Add Business')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessForm;
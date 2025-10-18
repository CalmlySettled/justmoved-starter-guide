import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, StarOff, Building, MapPin, Copy, Filter, TrendingUp, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import TemplatePreviewModal from './TemplatePreviewModal';

interface Property {
  id: string;
  property_name: string;
  address: string;
  curation_status: string;
  total_curated_places: number;
  is_master_template: boolean;
  template_category: string | null;
  template_description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance?: number;
}

interface MasterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUpdate: () => void;
  currentPropertyLocation?: { latitude: number; longitude: number };
}

const MasterTemplateModal: React.FC<MasterTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateUpdate,
  currentPropertyLocation
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Property | null>(null);
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Property | null>(null);
  const [previewCategoryCounts, setPreviewCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          property_name,
          address,
          latitude,
          longitude,
          curation_status,
          total_curated_places,
          is_master_template,
          template_category,
          template_description
        `)
        .eq('curation_status', 'completed')
        .gte('total_curated_places', 5)
        .order('is_master_template', { ascending: false }) as any;

      if (error) throw error;

      // Calculate distances if current location provided
      const propertiesWithDistance = (data || []).map((property: any) => {
        if (currentPropertyLocation && property.latitude && property.longitude) {
          const distance = calculateDistance(
            currentPropertyLocation.latitude,
            currentPropertyLocation.longitude,
            property.latitude,
            property.longitude
          );
          return { ...property, distance };
        }
        return property;
      });

      setProperties(propertiesWithDistance);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handlePreviewTemplate = async (property: Property) => {
    try {
      // Fetch category counts
      const { data, error } = await supabase
        .from('curated_property_places')
        .select('category')
        .eq('property_id', property.id)
        .eq('is_active', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((place: any) => {
        counts[place.category] = (counts[place.category] || 0) + 1;
      });

      setPreviewCategoryCounts(counts);
      setPreviewTemplate(property);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Failed to load template preview');
    }
  };

  const toggleMasterTemplate = async (property: Property) => {
    if (!property.is_master_template) {
      // Making it a master template - show form
      setEditingTemplate(property);
      setTemplateCategory(property.template_category || '');
      setTemplateDescription(property.template_description || '');
    } else {
      // Removing master template status
      try {
      const { error } = await supabase
        .from('properties')
        .update({
          is_master_template: false,
          template_category: null,
          template_description: null
        } as any) // Temporary type assertion
        .eq('id', property.id);

        if (error) throw error;
        
        toast.success('Removed master template status');
        fetchProperties();
        onTemplateUpdate();
      } catch (error) {
        console.error('Error updating template:', error);
        toast.error('Failed to update template');
      }
    }
  };

  const saveMasterTemplate = async () => {
    if (!editingTemplate || !templateCategory.trim()) {
      toast.error('Please provide a template category');
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          is_master_template: true,
          template_category: templateCategory.trim(),
          template_description: templateDescription.trim() || null
        } as any) // Temporary type assertion
        .eq('id', editingTemplate.id);

      if (error) throw error;
      
      toast.success('Master template created successfully');
      setEditingTemplate(null);
      setTemplateCategory('');
      setTemplateDescription('');
      fetchProperties();
      onTemplateUpdate();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.template_category && property.template_category.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDistance = maxDistance === null || 
      !property.distance || 
      property.distance <= maxDistance;
    
    return matchesSearch && matchesDistance;
  });

  const masterTemplates = filteredProperties.filter(p => p.is_master_template);
  const availableProperties = filteredProperties.filter(p => !p.is_master_template);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Master Template Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-3">
            <Label htmlFor="search">Search Properties</Label>
            <Input
              id="search"
              placeholder="Search by name, address, or template category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {currentPropertyLocation && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="distance-filter" className="text-sm">Distance Filter:</Label>
                <select
                  id="distance-filter"
                  value={maxDistance ?? 'all'}
                  onChange={(e) => setMaxDistance(e.target.value === 'all' ? null : parseInt(e.target.value))}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="all">All distances</option>
                  <option value="5">Within 5 miles</option>
                  <option value="10">Within 10 miles</option>
                  <option value="20">Within 20 miles</option>
                  <option value="50">Within 50 miles</option>
                </select>
              </div>
            )}
          </div>

          {/* Master Templates Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Master Templates ({masterTemplates.length})
            </h3>
            <div className="space-y-3">
              {masterTemplates.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No master templates created yet.</p>
                  <p className="text-sm">Create templates from well-curated properties below.</p>
                </Card>
              ) : (
                masterTemplates.map(property => (
                  <Card key={property.id} className="p-4 border-yellow-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{property.property_name}</h4>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {property.template_category}
                          </Badge>
                          {property.distance !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {property.distance.toFixed(1)} mi
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                        {property.template_description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {property.template_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span><TrendingUp className="h-3 w-3 inline mr-1" />{property.total_curated_places} businesses</span>
                          <span>{property.curation_status}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewTemplate(property)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMasterTemplate(property)}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <StarOff className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Available Properties Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Well-Curated Properties ({availableProperties.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : availableProperties.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No well-curated properties available.</p>
                  <p className="text-sm">Properties need to be completed with at least 5 businesses.</p>
                </Card>
              ) : (
                availableProperties.map(property => (
                  <Card key={property.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{property.property_name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{property.total_curated_places} businesses</span>
                          <span>{property.curation_status}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMasterTemplate(property)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Make Template
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Template Creation Form */}
          {editingTemplate && (
            <Card className="p-4 border-blue-200 bg-blue-50/50">
              <h4 className="font-medium mb-3">Create Master Template: {editingTemplate.property_name}</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="template-category">Template Category *</Label>
                  <Input
                    id="template-category"
                    placeholder="e.g., Urban Downtown, Suburban Family, College Town, etc."
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">Description (Optional)</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe what makes this a good template (area type, business mix, etc.)"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveMasterTemplate} size="sm">
                    <Star className="h-4 w-4 mr-1" />
                    Create Template
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateCategory('');
                      setTemplateDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Usage Instructions */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-2">How to Use Master Templates</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Create Templates:</strong> Mark well-curated properties as master templates</li>
              <li>• <strong>Preview First:</strong> Click "Preview" to see what's included before applying</li>
              <li>• <strong>Distance Matters:</strong> Closer templates require less adjustment after applying</li>
              <li>• <strong>Copy Efficiently:</strong> Use "Copy from Property" to duplicate template data</li>
              <li>• <strong>Customize:</strong> Adjust addresses and local businesses after copying</li>
            </ul>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          template={previewTemplate}
          categoryCounts={previewCategoryCounts}
          onApply={() => {
            setPreviewTemplate(null);
            toast.success('Use "Copy from Property" to apply this template');
            onClose();
          }}
          applying={false}
        />
      )}
    </Dialog>
  );
};

export default MasterTemplateModal;
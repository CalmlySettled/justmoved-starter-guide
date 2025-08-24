import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MapPin, Building, Plus, Save, Eye, FileUp, Copy, Trash2, Upload } from 'lucide-react';
import BusinessForm from './BusinessForm';
import CopyFromPropertyModal from './CopyFromPropertyModal';
import BulkImportModal from './BulkImportModal';

interface Property {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  curation_status?: string;
  total_curated_places?: number;
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
  distance_miles?: number;
  rating?: number;
  sort_order: number;
  is_active: boolean;
}

interface CuratePropertyProps {
  property: Property;
  onUpdate: () => void;
}

const CATEGORIES = [
  'restaurants',
  'grocery stores', 
  'pharmacies',
  'gyms',
  'banks',
  'gas stations',
  'coffee shops',
  'beauty salons',
  'medical',
  'shopping'
];

const CurateProperty: React.FC<CuratePropertyProps> = ({ property, onUpdate }) => {
  const [curatedPlaces, setCuratedPlaces] = useState<CuratedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('restaurants');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<CuratedPlace | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  useEffect(() => {
    fetchCuratedPlaces();
  }, [property.id]);

  const fetchCuratedPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('curated_property_places')
        .select('*')
        .eq('property_id', property.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCuratedPlaces(data || []);
    } catch (error) {
      console.error('Error fetching curated places:', error);
      toast.error('Failed to load curated places');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryPlaces = (category: string) => {
    return curatedPlaces.filter(place => place.category === category && place.is_active);
  };

  const getCurationProgress = () => {
    const categoriesWithPlaces = CATEGORIES.filter(cat => getCategoryPlaces(cat).length > 0);
    return Math.round((categoriesWithPlaces.length / CATEGORIES.length) * 100);
  };

  const getTotalPlaces = () => {
    return curatedPlaces.filter(place => place.is_active).length;
  };

  const handleAddBusiness = () => {
    setEditingBusiness(null);
    setShowBusinessForm(true);
  };

  const handleEditBusiness = (business: CuratedPlace) => {
    setEditingBusiness(business);
    setShowBusinessForm(true);
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      const { error } = await supabase
        .from('curated_property_places')
        .delete()
        .eq('id', businessId);

      if (error) throw error;
      
      toast.success('Business deleted successfully');
      fetchCuratedPlaces();
      onUpdate();
    } catch (error) {
      console.error('Error deleting business:', error);
      toast.error('Failed to delete business');
    }
  };

  const handleBusinessSaved = () => {
    setShowBusinessForm(false);
    setEditingBusiness(null);
    fetchCuratedPlaces();
    onUpdate();
  };

  const publishCuration = async () => {
    try {
      setLoading(true);
      
      // Call the function to populate cache from curation
      const { error } = await supabase.rpc('populate_cache_from_curation', {
        p_property_id: property.id
      });

      if (error) throw error;
      
      toast.success('Curation published successfully! Tenants will now see your curated recommendations.');
      onUpdate();
    } catch (error) {
      console.error('Error publishing curation:', error);
      toast.error('Failed to publish curation');
    } finally {
      setLoading(false);
    }
  };

  const previewTenantExperience = () => {
    const signupUrl = `${window.location.origin}/auth?property=${property.id}&focus=essentials`;
    window.open(signupUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and actions */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <Building className="h-6 w-6" />
              Curate {property.property_name}
            </h2>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.address}
            </p>
          </div>
          <div className="text-right">
            <Badge variant={property.curation_status === 'completed' ? 'default' : 'secondary'}>
              {property.curation_status === 'completed' ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{getCurationProgress()}%</div>
            <div className="text-sm text-muted-foreground">Categories Completed</div>
            <Progress value={getCurationProgress()} className="mt-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">{getTotalPlaces()}</div>
            <div className="text-sm text-muted-foreground">Total Businesses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{CATEGORIES.length}</div>
            <div className="text-sm text-muted-foreground">Categories Available</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={publishCuration} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Publish Curation
          </Button>
          <Button variant="outline" onClick={previewTenantExperience} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview Experience
          </Button>
          <Button variant="outline" onClick={() => setShowCopyModal(true)} className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Copy from Property
          </Button>
          <Button variant="outline" onClick={() => setShowBulkImportModal(true)} className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Category tabs for curation */}
      <Card>
        <CardHeader>
          <CardTitle>Business Categories</CardTitle>
          <CardDescription>
            Add and manage businesses for each category. Tenants will see these curated recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-5 mb-6">
              {CATEGORIES.slice(0, 5).map(category => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {getCategoryPlaces(category).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs">
                      {getCategoryPlaces(category).length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsList className="grid grid-cols-5 mb-6">
              {CATEGORIES.slice(5).map(category => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {getCategoryPlaces(category).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 text-xs">
                      {getCategoryPlaces(category).length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(category => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {category.charAt(0).toUpperCase() + category.slice(1)} Businesses
                  </h3>
                  <Button onClick={handleAddBusiness} size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Business
                  </Button>
                </div>

                <div className="space-y-3">
                  {getCategoryPlaces(category).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No businesses added for this category yet.</p>
                      <p className="text-sm">Click "Add Business" to get started.</p>
                    </div>
                  ) : (
                    getCategoryPlaces(category).map(business => (
                      <div key={business.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{business.business_name}</h4>
                            {business.business_address && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {business.business_address}
                              </p>
                            )}
                            {business.business_description && (
                              <p className="text-sm text-muted-foreground mt-2">{business.business_description}</p>
                            )}
                            {business.subfilter_tags && business.subfilter_tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {business.subfilter_tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {business.distance_miles && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {business.distance_miles.toFixed(1)} miles away
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditBusiness(business)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBusiness(business.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Business Form Modal */}
      {showBusinessForm && (
        <BusinessForm
          property={property}
          category={activeCategory}
          business={editingBusiness}
          onSave={handleBusinessSaved}
          onCancel={() => setShowBusinessForm(false)}
        />
      )}

      {/* Copy from Property Modal */}
      <CopyFromPropertyModal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        targetPropertyId={property.id}
        onCopyComplete={() => {
          fetchCuratedPlaces();
          onUpdate();
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        propertyId={property.id}
        onImportComplete={() => {
          fetchCuratedPlaces();
          onUpdate();
        }}
      />
    </div>
  );
};

export default CurateProperty;
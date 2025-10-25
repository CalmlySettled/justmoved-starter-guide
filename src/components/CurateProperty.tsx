import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Building, Plus, Save, Eye, Copy, Trash2, Upload, Star } from 'lucide-react';
import BusinessForm from './BusinessForm';
import CopyFromPropertyModal from './CopyFromPropertyModal';
import BulkImportModal from './BulkImportModal';
import BatchBusinessEntry from './BatchBusinessEntry';
import CategoryGridSelector from './CategoryGridSelector';
import CurationStatsCard from './CurationStatsCard';
import { COMPREHENSIVE_CATEGORIES } from '@/data/curationCategories';
import { useTabPersistence } from '@/hooks/useTabPersistence';

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

// Use the EXACT categories from the actual app
const CATEGORIES = COMPREHENSIVE_CATEGORIES;

const CurateProperty: React.FC<CuratePropertyProps> = ({ property, onUpdate }) => {
  const [curatedPlaces, setCuratedPlaces] = useState<CuratedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0] || 'grocery stores');
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<CuratedPlace | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showBatchEntry, setShowBatchEntry] = useState(false);

  // Persist active category across tab switches
  const { loadState, clearState } = useTabPersistence({
    key: `curation-state-${property.id}`,
    data: { activeCategory, editingBusiness, showBusinessForm },
    enabled: true
  });

  useEffect(() => {
    fetchCuratedPlaces();
    
    // Load persisted state
    const savedState = loadState();
    if (savedState?.activeCategory && CATEGORIES.includes(savedState.activeCategory)) {
      setActiveCategory(savedState.activeCategory);
      toast.success('Draft restored', { duration: 2000 });
    }
  }, [property.id, loadState]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = showBusinessForm || editingBusiness !== null;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showBusinessForm, editingBusiness]);

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

  const getBusinessCounts = () => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      counts[cat] = getCategoryPlaces(cat).length;
    });
    return counts;
  };

  const getCategoriesWithBusinesses = () => {
    return CATEGORIES.filter(cat => getCategoryPlaces(cat).length > 0).length;
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
      
      // Call the function to populate cache from curation (no geocoding needed)
      const { error } = await supabase.rpc('populate_cache_from_curation', {
        p_property_id: property.id
      });

      if (error) throw error;
      
      // Clear draft state after successful publish
      clearState();
      sessionStorage.removeItem('property-curation-selected-property');
      
      toast.success('Curation published successfully! Tenants will now see your curated recommendations.');
      onUpdate();
    } catch (error) {
      console.error('Error publishing curation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish curation');
    } finally {
      setLoading(false);
    }
  };

  const previewTenantExperience = () => {
    toast.info('To preview the tenant experience, create a tenant link first from the "Tenant Links" tab, then use its Preview button.');
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
      {/* Sticky Header with Actions */}
      <div className="sticky top-0 z-10 glass-card p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold">{property.property_name}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {property.address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={property.curation_status === 'completed' ? 'default' : 'secondary'}>
              {property.curation_status === 'completed' ? '✓ Published' : '✏️ Draft'}
            </Badge>
            <Button onClick={publishCuration} size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Publish
            </Button>
            <Button variant="outline" size="sm" onClick={previewTenantExperience} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCopyModal(true)} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkImportModal(true)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <CurationStatsCard
        totalCategories={CATEGORIES.length}
        categoriesWithBusinesses={getCategoriesWithBusinesses()}
        totalBusinesses={getTotalPlaces()}
        businessCounts={getBusinessCounts()}
      />

      {/* Category Grid Selector */}
      <Card>
        <CardContent className="p-6">
          <CategoryGridSelector
            categories={CATEGORIES}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            businessCounts={getBusinessCounts()}
            groupByType={true}
          />
        </CardContent>
      </Card>

      {/* Active Category Business List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {activeCategory}
              <Badge variant="secondary">{getCategoryPlaces(activeCategory).length} businesses</Badge>
            </h3>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowBatchEntry(true)} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Batch Add (Fast)
              </Button>
              <Button onClick={handleAddBusiness} size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Business
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {getCategoryPlaces(activeCategory).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
                <Building className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No businesses yet</p>
                <p className="text-sm mb-4">Start curating by adding businesses to this category</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowBatchEntry(true)} variant="outline" size="sm">
                    Quick Batch Add
                  </Button>
                  <Button onClick={handleAddBusiness} size="sm">
                    Add First Business
                  </Button>
                </div>
              </div>
            ) : (
              getCategoryPlaces(activeCategory).map(business => (
                <div key={business.id} className="group border-2 rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all bg-card">
                  <div className="flex gap-4">
                    {/* Placeholder for business image */}
                    <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-8 w-8 text-muted-foreground/50" />
                    </div>

                    {/* Business Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{business.business_name}</h4>
                          {business.business_address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{business.business_address}</span>
                            </p>
                          )}
                          {business.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{business.rating}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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

                      {business.business_description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {business.business_description}
                        </p>
                      )}

                      {/* Subfilter Tags */}
                      {business.subfilter_tags && business.subfilter_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {business.subfilter_tags.map(tag => (
                            <Badge 
                              key={tag} 
                              variant="secondary" 
                              className="text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {business.distance_miles && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📍 {business.distance_miles.toFixed(1)} miles from property
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

      {/* Batch Business Entry Modal */}
      {showBatchEntry && (
        <BatchBusinessEntry
          isOpen={showBatchEntry}
          onClose={() => setShowBatchEntry(false)}
          property={property}
          category={activeCategory}
          onComplete={() => {
            fetchCuratedPlaces();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default CurateProperty;
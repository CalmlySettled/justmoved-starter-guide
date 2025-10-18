import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Building, 
  MapPin, 
  Search, 
  Plus, 
  Eye, 
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  BarChart3
} from 'lucide-react';
import CurateProperty from './CurateProperty';
import MasterTemplateModal from './MasterTemplateModal';
import CurationAnalytics from './CurationAnalytics';

interface Property {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  curation_status: string;
  total_curated_places: number;
  curation_completed_at: string | null;
  manager_id: string;
  created_at: string;
}

interface PropertyCurationStats {
  totalProperties: number;
  completedProperties: number;
  draftProperties: number;
  totalBusinesses: number;
  avgBusinessesPerProperty: number;
}

const PropertyCurationDashboard: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<PropertyCurationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMasterTemplateModal, setShowMasterTemplateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('properties');

  useEffect(() => {
    fetchProperties();
    fetchStats();
  }, []);

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
          curation_completed_at,
          manager_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: properties } = await supabase
        .from('properties')
        .select('curation_status, total_curated_places');

      const { data: totalBusinesses } = await supabase
        .from('curated_property_places')
        .select('id')
        .eq('is_active', true);

      if (properties) {
        const completed = properties.filter(p => p.curation_status === 'completed').length;
        const draft = properties.filter(p => p.curation_status === 'not_started' || p.curation_status === 'in_progress').length;
        const totalBiz = totalBusinesses?.length || 0;
        const avgBiz = properties.length > 0 ? totalBiz / properties.length : 0;

        setStats({
          totalProperties: properties.length,
          completedProperties: completed,
          draftProperties: draft,
          totalBusinesses: totalBiz,
          avgBusinessesPerProperty: Math.round(avgBiz * 10) / 10
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getCurationProgress = (property: Property) => {
    const totalCategories = 10; // Standard categories
    if (property.total_curated_places === 0) return 0;
    // Estimate progress based on businesses added (rough calculation)
    const progress = Math.min((property.total_curated_places / (totalCategories * 3)) * 100, 100);
    return Math.round(progress);
  };

  const filteredProperties = properties.filter(property =>
    property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProperty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedProperty(null);
              fetchProperties();
              fetchStats();
            }}
          >
            ← Back to Properties
          </Button>
        </div>
        <CurateProperty 
          property={selectedProperty} 
          onUpdate={() => {
            fetchProperties();
            fetchStats();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6" />
            Property Curation Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manually curate business recommendations for all properties
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMasterTemplateModal(true)}
            className="flex items-center gap-2"
          >
            <Star className="h-4 w-4" />
            Manage Templates
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-6 mt-6 data-[state=inactive]:hidden">
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">Registered properties</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.completedProperties}</div>
                  <p className="text-xs text-muted-foreground">Published curations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.draftProperties}</div>
                  <p className="text-xs text-muted-foreground">Need curation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
                  <p className="text-xs text-muted-foreground">Curated businesses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg per Property</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgBusinessesPerProperty}</div>
                  <p className="text-xs text-muted-foreground">Businesses/property</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search properties by name or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No properties found.</p>
                    </div>
                  ) : (
                    filteredProperties.map(property => (
                      <div 
                        key={property.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{property.property_name}</h3>
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {property.address}
                                </p>
                              </div>
                              <Badge variant={getStatusColor(property.curation_status)} className="flex items-center gap-1">
                                {getStatusIcon(property.curation_status)}
                                {property.curation_status === 'completed' ? 'Published' : 
                                 property.curation_status === 'in_progress' ? 'In Progress' : 'Not Started'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Curation Progress</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-sm font-medium">{getCurationProgress(property)}%</div>
                                  <Progress value={getCurationProgress(property)} className="flex-1 h-2" />
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground">Total Businesses</div>
                                <div className="text-lg font-semibold">{property.total_curated_places || 0}</div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-muted-foreground">
                                  {property.curation_completed_at ? 'Published' : 'Created'}
                                </div>
                                <div className="text-sm">
                                  {property.curation_completed_at 
                                    ? new Date(property.curation_completed_at).toLocaleDateString()
                                    : new Date(property.created_at).toLocaleDateString()
                                  }
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProperty(property)}
                              className="flex items-center gap-2"
                            >
                              <Settings className="h-4 w-4" />
                              Curate
                            </Button>
                            {property.curation_status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const previewUrl = `${window.location.origin}/tenant/${property.id}`;
                                  window.open(previewUrl, '_blank');
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 data-[state=inactive]:hidden">
          <CurationAnalytics />
        </TabsContent>

        <TabsContent value="templates" className="mt-6 data-[state=inactive]:hidden">
          <Card className="p-6 text-center">
            <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Master Template Manager</h3>
            <p className="text-muted-foreground mb-4">
              Create and manage reusable templates from your best-curated properties
            </p>
            <Button onClick={() => setShowMasterTemplateModal(true)}>
              <Star className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Master Template Modal */}
      <MasterTemplateModal
        isOpen={showMasterTemplateModal}
        onClose={() => setShowMasterTemplateModal(false)}
        onTemplateUpdate={() => {
          fetchProperties();
          fetchStats();
        }}
      />
    </div>
  );
};

export default PropertyCurationDashboard;
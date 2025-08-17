import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Download, Plus, QrCode, Eye, MapPin, Users, TrendingUp, Home } from 'lucide-react';
import QRCodeGenerator from 'qrcode';
import PropertyManagerHeader from '@/components/PropertyManagerHeader';

interface Property {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contact_info: any;
  branding: any;
  property_token: string;
  created_at: string;
}

interface TenantLink {
  id: string;
  property_id: string;
  tenant_token: string;
  tenant_name: string;
  unit_number: string | null;
  move_in_date: string | null;
  contact_info: any;
  is_active: boolean;
  cache_warmed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
  properties: Property;
}

const PropertyManager: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenantLinks, setTenantLinks] = useState<TenantLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  // New property form state
  const [newProperty, setNewProperty] = useState({
    property_name: '',
    address: '',
    contact_info: { phone: '', email: '', office_hours: '' },
    branding: { logo_url: '', primary_color: '#3B82F6', welcome_message: '' }
  });

  // New tenant form state
  const [newTenant, setNewTenant] = useState({
    property_id: '',
    tenant_name: '',
    unit_number: '',
    move_in_date: '',
    contact_info: { phone: '', email: '' }
  });

  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProperties();
      fetchTenantLinks();
    } else if (!authLoading && !user) {
      // Auth is complete but no user - this shouldn't happen in a protected route
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('manager_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    }
  };

  const fetchTenantLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_links')
        .select(`
          *,
          properties (
            id,
            property_name,
            address,
            latitude,
            longitude,
            contact_info,
            branding,
            property_token,
            created_at
          )
        `)
        .eq('properties.manager_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenantLinks(data || []);
    } catch (error) {
      console.error('Error fetching tenant links:', error);
      toast.error('Failed to load tenant links');
    } finally {
      setLoading(false);
    }
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

  const prewarmPropertyCache = async (propertyId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('prewarm-property-cache', {
        body: { propertyId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Cache prewarming error:', error);
      return null;
    }
  };

  const createProperty = async () => {
    if (!newProperty.property_name.trim() || !newProperty.address.trim()) {
      toast.error('Property name and address are required');
      return;
    }

    try {
      setLoading(true);
      
      // Geocode the address
      const coordinates = await geocodeAddress(newProperty.address);
      
      // Note: property_token will be auto-generated by the database trigger
      const { data, error } = await supabase
        .from('properties')
        .insert({
          manager_id: user?.id,
          property_name: newProperty.property_name,
          address: newProperty.address,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
          contact_info: newProperty.contact_info,
          branding: newProperty.branding
        } as any) // Type assertion since property_token is auto-generated
        .select()
        .single();

      if (error) throw error;

      // Pre-warm cache if coordinates are available
      if (coordinates) {
        const cacheResult = await prewarmPropertyCache(data.id);
        if (cacheResult?.success) {
          toast.success(`Property created and QR code ready! Cache pre-warmed successfully.`);
        } else {
          toast.success('Property created and QR code ready! (Cache will be warmed on first tenant access)');
        }
      } else {
        toast.success('Property created and QR code ready! (Manual geocoding may be needed)');
      }

      setNewProperty({
        property_name: '',
        address: '',
        contact_info: { phone: '', email: '', office_hours: '' },
        branding: { logo_url: '', primary_color: '#3B82F6', welcome_message: '' }
      });
      setShowNewPropertyForm(false);
      fetchProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const createTenantLink = async () => {
    if (!newTenant.property_id || !newTenant.tenant_name.trim()) {
      toast.error('Property and tenant name are required');
      return;
    }

    try {
      setLoading(true);
      
      // Generate unique token
      const tenantToken = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase
        .from('tenant_links')
        .insert({
          property_id: newTenant.property_id,
          tenant_token: tenantToken,
          tenant_name: newTenant.tenant_name,
          unit_number: newTenant.unit_number || null,
          move_in_date: newTenant.move_in_date || null,
          contact_info: newTenant.contact_info,
          cache_warmed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Tenant link created successfully!');
      setNewTenant({
        property_id: '',
        tenant_name: '',
        unit_number: '',
        move_in_date: '',
        contact_info: { phone: '', email: '' }
      });
      setShowNewTenantForm(false);
      fetchTenantLinks();
    } catch (error) {
      console.error('Error creating tenant link:', error);
      toast.error('Failed to create tenant link');
    } finally {
      setLoading(false);
    }
  };

  const generatePropertyQRCode = async (property: Property) => {
    try {
      const signupUrl = `${window.location.origin}/auth?property=${property.property_token}&focus=essentials`;
      const qrCodeDataUrl = await QRCodeGenerator.toDataURL(signupUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Create download link
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `property-qr-${property.property_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Property QR Code downloaded successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const previewPropertySignup = (property: Property) => {
    const signupUrl = `${window.location.origin}/auth?property=${property.property_token}&focus=essentials`;
    window.open(signupUrl, '_blank');
  };

  // Show loading while auth is loading or while fetching initial data
  console.log('🔍 PM RENDER - Auth loading:', authLoading, 'Data loading:', loading, 'Properties:', properties.length);
  
  if (authLoading || loading) {
    console.log('🔄 PM RENDER - Showing loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Authenticating...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Handle case where auth completed but no user (shouldn't happen in protected route)
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Authentication required. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const getUserName = (): string => {
    const metadata = user?.user_metadata;
    if (metadata?.display_name) return metadata.display_name.split(' ')[0];
    if (metadata?.full_name) return metadata.full_name.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PropertyManagerHeader
        onSignOut={signOut}
        userName={getUserName()}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Property Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage your properties and create personalized welcome experiences for new tenants</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="tenants">Tenant Links</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{properties.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tenant Links</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantLinks.filter(link => link.is_active).length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Ready</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenantLinks.filter(link => link.cache_warmed_at).length}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Your property management workflow with CalmlySettled</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <h4 className="font-medium">Add Your Properties</h4>
                    <p className="text-sm text-muted-foreground">Register your properties with address and contact information. We automatically geocode locations and pre-warm local business cache.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <h4 className="font-medium">Generate Property QR Code</h4>
                    <p className="text-sm text-muted-foreground">Each property gets one QR code that tenants can scan to sign up automatically with your property's location pre-filled.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <h4 className="font-medium">Add to Welcome Packages</h4>
                    <p className="text-sm text-muted-foreground">Include the QR code in welcome packages, lease documents, or post in common areas for easy tenant access.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <h4 className="font-medium">Track Tenant Signups</h4>
                    <p className="text-sm text-muted-foreground">Monitor how many tenants sign up through your property QR code and track their local business discoveries.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Properties</h2>
              <Button onClick={() => setShowNewPropertyForm(!showNewPropertyForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            {showNewPropertyForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Property</CardTitle>
                  <CardDescription>Create a new property to manage tenant onboarding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="property-name">Property Name *</Label>
                      <Input
                        id="property-name"
                        placeholder="Sunset Apartments"
                        value={newProperty.property_name}
                        onChange={(e) => setNewProperty({ ...newProperty, property_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-address">Address *</Label>
                      <Input
                        id="property-address"
                        placeholder="123 Main St, City, State 12345"
                        value={newProperty.address}
                        onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Contact Phone</Label>
                      <Input
                        id="contact-phone"
                        placeholder="(555) 123-4567"
                        value={newProperty.contact_info.phone}
                        onChange={(e) => setNewProperty({
                          ...newProperty,
                          contact_info: { ...newProperty.contact_info, phone: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Contact Email</Label>
                      <Input
                        id="contact-email"
                        placeholder="leasing@property.com"
                        value={newProperty.contact_info.email}
                        onChange={(e) => setNewProperty({
                          ...newProperty,
                          contact_info: { ...newProperty.contact_info, email: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcome-message">Welcome Message</Label>
                    <Textarea
                      id="welcome-message"
                      placeholder="Welcome to your new home! We're excited to have you as part of our community."
                      value={newProperty.branding.welcome_message}
                      onChange={(e) => setNewProperty({
                        ...newProperty,
                        branding: { ...newProperty.branding, welcome_message: e.target.value }
                      })}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={createProperty} disabled={loading}>
                      Create Property
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewPropertyForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{property.property_name}</CardTitle>
                    <CardDescription>{property.address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2">
                       <div className="flex items-center text-sm text-muted-foreground">
                         <MapPin className="h-4 w-4 mr-1" />
                         {property.latitude && property.longitude ? (
                           <Badge variant="secondary">Geocoded</Badge>
                         ) : (
                           <Badge variant="outline">Needs Geocoding</Badge>
                         )}
                       </div>
                       <p className="text-sm text-muted-foreground">
                         Created: {new Date(property.created_at).toLocaleDateString()}
                       </p>
        <p className="text-sm text-muted-foreground">
          Property Token: <code className="text-xs bg-muted px-1 py-0.5 rounded">{property.property_token}</code>
        </p>
                       <div className="flex space-x-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => generatePropertyQRCode(property)}
                         >
                           <QrCode className="h-4 w-4 mr-1" />
                           QR Code
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => previewPropertySignup(property)}
                         >
                           <Eye className="h-4 w-4 mr-1" />
                           Preview
                         </Button>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tenants" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Tenant Links</h2>
              <Button 
                onClick={() => setShowNewTenantForm(!showNewTenantForm)}
                disabled={properties.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant Link
              </Button>
            </div>

            {properties.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You need to add at least one property before creating tenant links.</p>
                  <Button onClick={() => setActiveTab('properties')}>
                    Add Your First Property
                  </Button>
                </CardContent>
              </Card>
            )}

            {showNewTenantForm && properties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Tenant Link</CardTitle>
                  <CardDescription>Generate a personalized welcome experience for a new tenant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-property">Property *</Label>
                      <select
                        id="tenant-property"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        value={newTenant.property_id}
                        onChange={(e) => setNewTenant({ ...newTenant, property_id: e.target.value })}
                      >
                        <option value="">Select a property</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.property_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant-name">Tenant Name *</Label>
                      <Input
                        id="tenant-name"
                        placeholder="John & Jane Smith"
                        value={newTenant.tenant_name}
                        onChange={(e) => setNewTenant({ ...newTenant, tenant_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-unit">Unit Number</Label>
                      <Input
                        id="tenant-unit"
                        placeholder="Apt 101"
                        value={newTenant.unit_number}
                        onChange={(e) => setNewTenant({ ...newTenant, unit_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant-move-in">Move-in Date</Label>
                      <Input
                        id="tenant-move-in"
                        type="date"
                        value={newTenant.move_in_date}
                        onChange={(e) => setNewTenant({ ...newTenant, move_in_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={createTenantLink} disabled={loading}>
                      Create Tenant Link
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewTenantForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {tenantLinks.map((link) => (
                <Card key={link.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{link.tenant_name}</h3>
                          <p className="text-sm text-muted-foreground">{link.properties.property_name}</p>
                          {link.unit_number && (
                            <p className="text-sm text-muted-foreground">Unit: {link.unit_number}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={link.is_active ? 'default' : 'secondary'}>
                            {link.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {link.cache_warmed_at && (
                            <Badge variant="outline">Cache Ready</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(link.created_at).toLocaleDateString()}
                          {link.last_accessed_at && (
                            <> • Last accessed: {new Date(link.last_accessed_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                       <div className="flex space-x-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => generatePropertyQRCode(link.properties)}
                         >
                           <QrCode className="h-4 w-4 mr-1" />
                           Legacy QR
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => previewPropertySignup(link.properties)}
                         >
                           <Eye className="h-4 w-4 mr-1" />
                           Preview
                         </Button>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {tenantLinks.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No tenant links created yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Coming Soon</CardTitle>
                <CardDescription>Track tenant engagement and popular local discoveries</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics dashboard will show tenant engagement metrics, popular business categories, 
                  and usage patterns for your properties.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PropertyManager;
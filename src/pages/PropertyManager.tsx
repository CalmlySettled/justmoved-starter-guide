import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyManagerContract } from '@/hooks/usePropertyManagerContract';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from 'sonner';
import { Download, Plus, QrCode, MapPin, Home, Mail, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import QRCodeGenerator from 'qrcode';
import PropertyManagerHeader from '@/components/PropertyManagerHeader';

interface Property {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  property_token: string;
  curation_status?: string;
  curation_completed_at?: string;
  total_curated_places?: number;
  created_at: string;
}

const PropertyManager: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isPropertyManager, loading: contractLoading } = usePropertyManagerContract();
  const { subscription, checkSubscriptionStatus, startSubscription, manageSubscription, canCreateProperty, getSubscriptionMessage } = useSubscription();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Simple property form state - ONLY name and address
  const [newProperty, setNewProperty] = useState({
    property_name: '',
    address: ''
  });

  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !contractLoading && user && isPropertyManager) {
      fetchProperties();
    } else if (!authLoading && !contractLoading && (!user || !isPropertyManager)) {
      setLoading(false);
    }
  }, [user, authLoading, isPropertyManager, contractLoading]);

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

  const createProperty = async () => {
    if (!newProperty.property_name.trim() || !newProperty.address.trim()) {
      toast.error('Property name and address are required');
      return;
    }

    // Check subscription limits
    if (!canCreateProperty()) {
      if (subscription.status === 'trial' && subscription.is_trial_expired) {
        toast.error('Your free trial has expired. Please subscribe to add properties.');
        return;
      } else if (subscription.status === 'trial') {
        toast.error(`Free trial allows ${subscription.max_properties} property. Upgrade to add more.`);
        return;
      } else {
        toast.error('Please subscribe to add properties.');
        return;
      }
    }

    try {
      setLoading(true);
      
      // Geocode the address
      const coordinates = await geocodeAddress(newProperty.address);
      
      const { data, error } = await supabase
        .from('properties')
        .insert({
          manager_id: user?.id,
          property_name: newProperty.property_name,
          address: newProperty.address,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Property created! Waiting for admin to curate recommendations.');

      setNewProperty({
        property_name: '',
        address: ''
      });
      setShowNewPropertyForm(false);
      fetchProperties();
      checkSubscriptionStatus();
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  const generatePropertyQRCode = async (property: Property) => {
    try {
      const signupUrl = `${window.location.origin}/auth?property=${property.property_token}&mode=signup`;
      const qrCodeDataUrl = await QRCodeGenerator.toDataURL(signupUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `${property.property_name.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('QR Code downloaded successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  // Loading state
  if (authLoading || contractLoading || subscription.loading || (isPropertyManager && loading)) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mx-auto mb-6"></div>
          <p className="text-foreground font-medium mb-2">
            {authLoading ? 'Authenticating...' : contractLoading ? 'Checking access...' : subscription.loading ? 'Checking subscription...' : 'Loading your dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!authLoading && !contractLoading && (!user || !isPropertyManager)) {
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-2xl">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Property manager role required to access this dashboard.</p>
        </div>
      </div>
    );
  }

  const curatedCount = properties.filter(p => p.curation_status === 'completed').length;
  const notCuratedCount = properties.length - curatedCount;

  return (
    <div className="min-h-screen bg-gradient-page">
      <PropertyManagerHeader
        onSignOut={signOut}
        userName={user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Property Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your properties and generate QR codes for tenant onboarding
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-card border-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10">Overview</TabsTrigger>
            <TabsTrigger value="properties" className="data-[state=active]:bg-primary/10">Properties</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Subscription Status */}
            <Alert className={`notification-modern ${subscription.status === 'active' ? 'border-emerald-200' : subscription.status === 'trial' ? 'border-blue-200' : 'border-amber-200'}`}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                  subscription.status === 'active' ? 'bg-emerald-100' : subscription.status === 'trial' ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                  <CreditCard className={`h-5 w-5 ${
                    subscription.status === 'active' ? 'text-emerald-600' : subscription.status === 'trial' ? 'text-blue-600' : 'text-amber-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <p className="font-medium mb-1">
                        {subscription.status === 'active' ? 'Active Subscription' : subscription.status === 'trial' ? 'Free Trial Active' : 'Subscription Required'}
                      </p>
                      <p className="text-sm text-muted-foreground">{getSubscriptionMessage()}</p>
                    </div>
                    <div className="flex gap-2">
                      {subscription.status !== 'active' && (
                        <Button onClick={startSubscription} size="sm">
                          {subscription.status === 'trial' ? 'Upgrade Now' : 'Subscribe'}
                        </Button>
                      )}
                      {subscription.status === 'active' && (
                        <Button onClick={manageSubscription} size="sm" variant="outline">
                          Manage Billing
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Total Properties"
                value={properties.length}
                description={subscription.status === 'active' ? 'Unlimited allowed' : `${Math.max(0, subscription.max_properties - properties.length)} remaining in trial`}
                icon={MapPin}
              />
              <StatCard 
                title="Curated Properties"
                value={curatedCount}
                description="Ready for QR codes"
                icon={CheckCircle}
              />
              <StatCard 
                title="Awaiting Curation"
                value={notCuratedCount}
                description="Pending admin curation"
                icon={Clock}
              />
            </div>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Simple property management workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <h4 className="font-medium">Add Properties</h4>
                    <p className="text-sm text-muted-foreground">Enter property name and address. We'll automatically geocode the location.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <h4 className="font-medium">Wait for Curation</h4>
                    <p className="text-sm text-muted-foreground">The admin will curate local business recommendations for your property.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <h4 className="font-medium">Download QR Code</h4>
                    <p className="text-sm text-muted-foreground">Once curated, download the QR code and include it in tenant welcome packages.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <h4 className="font-medium">Tenants Sign Up</h4>
                    <p className="text-sm text-muted-foreground">New tenants scan the QR code, sign up, and view curated local recommendations.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Your Properties</h2>
              <Button 
                onClick={() => {
                  if (!canCreateProperty()) {
                    if (subscription.status === 'trial' && subscription.is_trial_expired) {
                      toast.error('Trial expired. Subscribe to continue.');
                    } else if (subscription.status === 'trial') {
                      toast.error('Property limit reached. Upgrade to add more.');
                    } else {
                      toast.error('Subscription required.');
                    }
                    return;
                  }
                  setShowNewPropertyForm(!showNewPropertyForm);
                }}
                disabled={!canCreateProperty()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>

            {!canCreateProperty() && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    {subscription.status === 'trial' && subscription.is_trial_expired 
                      ? 'Trial expired. Subscribe to add properties.'
                      : subscription.status === 'trial' 
                      ? `Trial allows ${subscription.max_properties} property. Upgrade for more.`
                      : 'Subscription required to add properties.'
                    }
                  </span>
                  <Button onClick={startSubscription} size="sm" variant="outline">
                    {subscription.status === 'trial' ? 'Upgrade' : 'Subscribe'}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {showNewPropertyForm && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Property</CardTitle>
                  <CardDescription>Create a new property to manage tenant onboarding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{property.property_name}</CardTitle>
                        <CardDescription className="mt-1">{property.address}</CardDescription>
                      </div>
                      {property.curation_status === 'completed' ? (
                        <Badge variant="default" className="bg-emerald-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Curated
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {property.latitude && property.longitude ? (
                          <Badge variant="secondary" className="text-xs">Geocoded</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Needs Geocoding</Badge>
                        )}
                      </div>
                      
                      {property.curation_status === 'completed' && property.total_curated_places && (
                        <p className="text-sm text-muted-foreground">
                          {property.total_curated_places} businesses curated
                        </p>
                      )}

                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(property.created_at).toLocaleDateString()}
                      </p>
                      
                      {property.curation_status === 'completed' ? (
                        <Button
                          size="sm"
                          onClick={() => generatePropertyQRCode(property)}
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download QR Code
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Awaiting Curation
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {properties.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first property to get started with CalmlySettled
                  </p>
                  {canCreateProperty() && (
                    <Button onClick={() => setShowNewPropertyForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Property
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PropertyManager;

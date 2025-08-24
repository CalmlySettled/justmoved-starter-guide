import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyManagerContract } from '@/hooks/usePropertyManagerContract';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/ui/stat-card';
import { ModernInput, ModernTextarea } from '@/components/ui/modern-form';
import { ProgressSteps } from '@/components/ui/progress-steps';
import { SkeletonCard, SkeletonStat } from '@/components/ui/skeleton-modern';
import { toast } from 'sonner';
import { Download, Plus, QrCode, Eye, MapPin, Users, TrendingUp, Home, Mail, CreditCard, AlertCircle, Play, Target, Award, Star, Building } from 'lucide-react';
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
  curation_status?: string;
  curation_completed_at?: string;
  total_curated_places?: number;
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
  const { isPropertyManager, contractStatus, loading: contractLoading } = usePropertyManagerContract();
  const { subscription, checkSubscriptionStatus, startSubscription, manageSubscription, canCreateProperty, getSubscriptionMessage } = useSubscription();
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
    if (!authLoading && !contractLoading && user && isPropertyManager) {
      if (contractStatus === 'active') {
        fetchProperties();
        fetchTenantLinks();
      } else {
        setLoading(false);
      }
    } else if (!authLoading && !contractLoading && (!user || !isPropertyManager)) {
      setLoading(false);
    }
  }, [user, authLoading, isPropertyManager, contractStatus, contractLoading]);

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

    // Check subscription limits before creating property
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
      // Refresh subscription status to update property count
      checkSubscriptionStatus();
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

  // Show loading while auth or contract is loading
  console.log('🔍 PM RENDER - Auth loading:', authLoading, 'Contract loading:', contractLoading, 'Data loading:', loading, 'Contract status:', contractStatus);
  
  if (authLoading || contractLoading || subscription.loading || (contractStatus === 'active' && loading)) {
    console.log('🔄 PM RENDER - Showing loading state');
    return (
      <div className="min-h-screen bg-gradient-page flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/30 border-t-primary mx-auto mb-6"></div>
          <p className="text-foreground font-medium mb-2">
            {authLoading ? 'Authenticating...' : contractLoading ? 'Checking access...' : subscription.loading ? 'Checking subscription...' : 'Loading your dashboard...'}
          </p>
          <p className="text-muted-foreground text-sm">
            Setting up your property management experience
          </p>
        </div>
      </div>
    );
  }

  // Handle case where auth completed but no user or not a property manager
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

  // Show enhanced onboarding experience for new property managers
  if (contractStatus === 'pending') {
    const onboardingSteps = [
      { id: 'welcome', title: 'Welcome', description: 'Get to know us' },
      { id: 'demo', title: 'Demo', description: 'See it in action' },
      { id: 'about', title: 'About', description: 'Our story' },
      { id: 'pricing', title: 'Pricing', description: 'Choose your plan' },
      { id: 'getting-started', title: 'Get Started', description: 'Launch your first property' }
    ];

    return (
      <div className="min-h-screen bg-gradient-page">
        <PropertyManagerHeader
          onSignOut={signOut}
          userName={user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        />
        
        <div className="container mx-auto px-4 pt-20">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-6">
                Welcome to CalmlySettled
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Your complete property management onboarding experience
              </p>
              
              <ProgressSteps 
                steps={onboardingSteps}
                currentStep="welcome"
                completedSteps={[]}
                className="mb-8"
              />
            </div>

            <Tabs defaultValue="welcome" className="w-full">
              <TabsList className="glass-card grid w-full grid-cols-5 mb-8 border-0">
                <TabsTrigger value="welcome" className="data-[state=active]:bg-primary/10">Welcome</TabsTrigger>
                <TabsTrigger value="demo" className="data-[state=active]:bg-primary/10">Demo Video</TabsTrigger>
                <TabsTrigger value="about" className="data-[state=active]:bg-primary/10">About Us</TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-primary/10">Pricing</TabsTrigger>
                <TabsTrigger value="getting-started" className="data-[state=active]:bg-primary/10">Get Started</TabsTrigger>
              </TabsList>

              <TabsContent value="welcome" className="space-y-8">
                <div className="bg-gradient-hero rounded-3xl p-12 text-white text-center relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                  <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto mb-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Home className="h-12 w-12" />
                    </div>
                    <h2 className="text-4xl font-bold mb-6">Transform Your Tenant Experience</h2>
                    <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
                      CalmlySettled helps property managers create personalized welcome experiences that guide new tenants to the best local businesses and services.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="modern-card p-8 text-center interactive">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">QR Code Magic</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Generate custom QR codes for each property that instantly connect tenants to local recommendations.
                    </p>
                  </div>

                  <div className="modern-card p-8 text-center interactive">
                    <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Users className="h-8 w-8 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Tenant Management</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Track tenant signups, manage individual links, and personalize experiences for each resident.
                    </p>
                  </div>

                  <div className="modern-card p-8 text-center interactive">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <TrendingUp className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold mb-4">Revenue Tracking</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Monitor engagement and revenue generated from tenant interactions with local businesses.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="demo" className="space-y-8">
                <div className="modern-card p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-4">See CalmlySettled in Action</h2>
                    <p className="text-muted-foreground text-lg">
                      Watch how easy it is to set up and manage your property welcome experiences
                    </p>
                  </div>
                  
                  <div className="aspect-video bg-gradient-section rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden">
                    <div className="text-center z-10">
                      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                        <Play className="h-10 w-10 text-primary ml-1" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-4">Interactive Demo Coming Soon</h3>
                      <p className="text-muted-foreground text-lg">
                        We're preparing an immersive demo to showcase all platform features
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-xl">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                          <QrCode className="h-5 w-5 text-primary" />
                        </div>
                        <h4 className="text-lg font-semibold">QR Code Generation</h4>
                      </div>
                      <p className="text-muted-foreground">
                        See how tenants scan QR codes to access personalized local recommendations instantly
                      </p>
                    </div>
                    <div className="glass-card p-6 rounded-xl">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center mr-3">
                          <Eye className="h-5 w-5 text-secondary" />
                        </div>
                        <h4 className="text-lg font-semibold">Tenant Experience</h4>
                      </div>
                      <p className="text-muted-foreground">
                        Experience the mobile-first interface your tenants will love using
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="about" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>About CalmlySettled</CardTitle>
                    <CardDescription>Built for property managers who care about tenant satisfaction</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Our Mission</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        We believe that settling into a new home should be exciting, not overwhelming. CalmlySettled bridges the gap between property managers and their tenants by providing personalized local recommendations that help new residents feel at home faster.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Why We Built This</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Property managers spend countless hours fielding questions about local services. Tenants struggle to find trusted businesses in their new neighborhood. We created CalmlySettled to solve both problems with one elegant solution.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">500+</div>
                        <p className="text-sm text-muted-foreground">Properties Served</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">98%</div>
                        <p className="text-sm text-muted-foreground">Tenant Satisfaction</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-6">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                      <CreditCard className="h-8 w-8" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
                    <p className="text-lg opacity-90">
                      Start with a 14-day free trial, then pay per property you manage.
                    </p>
                  </div>
                  
                  <div className="bg-card rounded-xl p-6 border mb-6">
                    <h3 className="text-xl font-semibold mb-4">Standard Plan</h3>
                    <div className="text-3xl font-bold mb-2">$49.99<span className="text-base font-normal text-muted-foreground">/month per property</span></div>
                    <div className="text-lg mb-4 text-primary font-medium">+ $0.75 per tenant signup</div>
                    <ul className="text-left space-y-2 mb-6">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>14-day free trial with 1 property</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Unlimited properties after trial</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>QR code generation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Tenant link management</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span>Revenue per signup tracking</span>
                      </li>
                    </ul>
                    <Button onClick={startSubscription} className="w-full" size="lg">
                      Start Free Trial
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    No commitment required. Cancel anytime during or after your trial period.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="getting-started" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Getting Started Guide</CardTitle>
                    <CardDescription>Follow these simple steps to launch your first property experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                        <div>
                          <h4 className="font-semibold mb-1">Start Your Free Trial</h4>
                          <p className="text-sm text-muted-foreground">Click "Start Free Trial" to activate your 14-day trial with no commitment required.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                        <div>
                          <h4 className="font-semibold mb-1">Add Your First Property</h4>
                          <p className="text-sm text-muted-foreground">Enter your property details, address, and contact information to create your first property profile.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                        <div>
                          <h4 className="font-semibold mb-1">Generate QR Codes</h4>
                          <p className="text-sm text-muted-foreground">Download QR codes for your property and display them in common areas for tenants to scan.</p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">4</div>
                        <div>
                          <h4 className="font-semibold mb-1">Create Tenant Links</h4>
                          <p className="text-sm text-muted-foreground">Set up personalized welcome links for specific tenants with move-in dates and contact info.</p>
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Need help?</strong> Contact our support team at <a href="mailto:support@calmlysettled.com" className="text-primary hover:underline">support@calmlysettled.com</a> or explore our FAQ section.
                      </AlertDescription>
                    </Alert>

                    <div className="pt-4">
                      <Button onClick={startSubscription} className="w-full" size="lg">
                        Start Your Free Trial Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    );
  }

  // Handle suspended contract status
  if (!authLoading && !contractLoading && contractStatus === 'suspended') {
    return (
      <div className="min-h-screen bg-background">
        <PropertyManagerHeader
          onSignOut={signOut}
          userName={user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        />
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Home className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Account Suspended</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your property manager account has been temporarily suspended. Please contact our support team 
              to resolve this issue and restore access to your dashboard.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => window.location.href = 'mailto:info@calmlysettled.com?subject=Account Suspension - Support Request'}
                variant="default"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button 
                onClick={signOut}
                variant="outline"
              >
                Sign Out
              </Button>
            </div>
          </div>
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
    <div className="min-h-screen bg-gradient-page">
      {/* Header */}
      <PropertyManagerHeader
        onSignOut={signOut}
        userName={getUserName()}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            Property Manager Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your properties and create personalized welcome experiences for new tenants
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass-card border-0">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10">Overview</TabsTrigger>
            <TabsTrigger value="properties" className="data-[state=active]:bg-primary/10">Properties</TabsTrigger>
            <TabsTrigger value="tenants" className="data-[state=active]:bg-primary/10">Tenant Links</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-primary/10">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Subscription Status Alert */}
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
                        <Button 
                          onClick={startSubscription}
                          size="sm"
                          className="btn-modern"
                        >
                          {subscription.status === 'trial' ? 'Upgrade Now' : 'Subscribe'}
                        </Button>
                      )}
                      {subscription.status === 'active' && (
                        <Button onClick={manageSubscription} size="sm" variant="outline" className="btn-modern">
                          Manage Billing
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Total Properties"
                value={properties.length}
                description={subscription.status === 'active' ? 'Unlimited allowed' : `${Math.max(0, subscription.max_properties - properties.length)} remaining in trial`}
                icon={MapPin}
                trend={{
                  value: properties.length > 0 ? 100 : 0,
                  isPositive: true
                }}
              />
              <StatCard 
                title="Active Links"
                value={tenantLinks.filter(link => link.is_active).length}
                description="Tenant connections"
                icon={Users}
                trend={{
                  value: tenantLinks.length > 0 ? 25 : 0,
                  isPositive: true
                }}
              />
              <StatCard 
                title="Signup Revenue"
                value={`$${(tenantLinks.length * 0.75).toFixed(2)}`}
                description={`${tenantLinks.length} signups × $0.75 each`}
                icon={TrendingUp}
                trend={{
                  value: tenantLinks.length * 12,
                  isPositive: true
                }}
              />
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
              <Button 
                onClick={() => {
                  if (!canCreateProperty()) {
                    if (subscription.status === 'trial' && subscription.is_trial_expired) {
                      toast.error('Trial expired. Subscribe to continue adding properties.');
                    } else if (subscription.status === 'trial') {
                      toast.error('Property limit reached. Upgrade to add more properties.');
                    } else {
                      toast.error('Subscription required to add properties.');
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
                      ? 'Your free trial has expired. Subscribe to add more properties.'
                      : subscription.status === 'trial' 
                      ? `Free trial allows ${subscription.max_properties} property. Upgrade to add more.`
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
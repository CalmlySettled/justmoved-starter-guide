import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyData {
  id: string;
  property_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contact_info: any;
  branding: any;
}

interface Business {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  business_features?: string[];
  business_image?: string;
  business_website?: string;
  business_phone?: string;
}

const TenantWelcome: React.FC = () => {
  const { propertyToken, token } = useParams<{ propertyToken?: string; token?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [recommendations, setRecommendations] = useState<{ [key: string]: Business[] }>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [categories, setCategories] = useState<Array<{key: string, label: string, icon: string}>>([]);

  const getCategoryIcon = (categoryKey: string): string => {
    const iconMap: { [key: string]: string } = {
      'restaurants': '🍽️',
      'grocery stores': '🛒',
      'pharmacies': '💊',
      'banks': '🏦',
      'gas stations': '⛽',
      'coffee shops': '☕',
      'gyms': '💪',
      'fitness': '💪',
      'beauty salons': '💄',
      'medical': '🏥',
      'shopping': '🛍️',
      'hardware stores': '🔨',
      'pet services': '🐾',
      'veterinarians': '🐾',
      'daycares': '👶',
      'cleaning services': '🧹',
      'junk removal': '🗑️',
      'internet providers': '🌐',
      'furniture stores': '🛋️',
      'post offices': '📮',
      'dmv': '🚗'
    };
    return iconMap[categoryKey.toLowerCase()] || '📍';
  };

  useEffect(() => {
    // Require authentication for property token route
    if (propertyToken && !user) {
      navigate(`/auth?property=${propertyToken}&mode=signup`);
      return;
    }

    if (propertyToken) {
      fetchPropertyData(propertyToken);
    } else if (token) {
      // Legacy tenant_token route
      fetchTenantData();
    }
  }, [propertyToken, token, user]);

  useEffect(() => {
    if (propertyData?.id) {
      loadCategoriesAndRecommendations();
    }
  }, [propertyData]);

  const fetchPropertyData = async (propToken: string) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('property_token', propToken)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Property not found');
        return;
      }

      setPropertyData(data);

      // Log analytics event
      await supabase.from('property_analytics').insert({
        property_id: data.id,
        event_type: 'welcome_page_view',
        event_data: {
          user_id: user?.id,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching property data:', error);
      toast.error('Failed to load property information');
    }
  };

  const loadCategoriesAndRecommendations = async () => {
    if (!propertyData?.id) return;

    try {
      const propertyId = propertyData.id;

      // First, load the unique categories from curated data
      const { data: curatedData } = await supabase
        .from('curated_property_places')
        .select('category')
        .eq('property_id', propertyId)
        .eq('is_active', true);

      if (curatedData && curatedData.length > 0) {
        // Get unique categories
        const uniqueCategories = [...new Set(curatedData.map(d => d.category))];
        
        // Format categories with labels and icons
        const formattedCategories = uniqueCategories.map(cat => ({
          key: cat,
          label: cat.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          icon: getCategoryIcon(cat)
        }));

        setCategories(formattedCategories);
        
        // Set first category as active
        if (formattedCategories.length > 0) {
          setActiveCategory(formattedCategories[0].key);
        }

        // Now load recommendations for these categories
        await loadRecommendations(formattedCategories);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setLoading(false);
    }
  };

  const fetchTenantData = async () => {
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
            branding
          )
        `)
        .eq('tenant_token', token)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (!data || !data.properties) {
        toast.error('Invalid or expired link');
        return;
      }

      // Set property data from tenant link
      setPropertyData(data.properties);

      // Update last accessed timestamp
      await supabase
        .from('tenant_links')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', data.id);

      // Log analytics event
      await supabase.from('property_analytics').insert({
        property_id: data.property_id,
        tenant_link_id: data.id,
        event_type: 'welcome_page_view',
        event_data: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error fetching tenant data:', error);
      toast.error('Failed to load welcome page');
    }
  };

  const loadRecommendations = async (categoriesToLoad: Array<{key: string, label: string, icon: string}>) => {
    if (!propertyData?.id) return;

    try {
      const propertyId = propertyData.id;

      // Load recommendations for each category from cache
      const categoryPromises = categoriesToLoad.map(async (category) => {
        try {
          // Look up curated content by property ID using exact category name
          const cacheKey = `property_${propertyId}_${category.key}`;
          
          const { data: cacheData } = await supabase
            .from('recommendations_cache')
            .select('recommendations')
            .eq('cache_key', cacheKey)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

          if (cacheData?.recommendations) {
            // Extract the businesses from the cached data structure
            const businesses = cacheData.recommendations[category.key] || [];
            return { category: category.key, businesses };
          }

          // If no curated content, return empty array
          return { category: category.key, businesses: [] };
        } catch (error) {
          console.error(`Error loading ${category.key}:`, error);
          return { category: category.key, businesses: [] };
        }
      });

      const results = await Promise.all(categoryPromises);
      const recommendationsMap: { [key: string]: Business[] } = {};
      
      results.forEach(result => {
        recommendationsMap[result.category] = result.businesses;
      });

      setRecommendations(recommendationsMap);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast.error('Failed to load local businesses');
    } finally {
      setLoading(false);
    }
  };

  const logBusinessClick = async (businessName: string, category: string) => {
    if (!propertyData) return;

    try {
      await supabase.from('property_analytics').insert({
        property_id: propertyData.id,
        event_type: 'business_click',
        event_data: {
          user_id: user?.id,
          business_name: businessName,
          category: category,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging business click:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your personalized guide...</p>
        </div>
      </div>
    );
  }

  if (!propertyData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Property Not Found</h2>
            <p className="text-muted-foreground">
              This property could not be found or is no longer available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const property = propertyData;
  const branding = property.branding || {};
  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'New Resident';

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome to {property.property_name}!
          </h1>
          <p className="text-xl mb-4">
            Hello {userName}
          </p>
          {branding.welcome_message && (
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              {branding.welcome_message}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Property Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Address</h3>
                <p className="text-muted-foreground">{property.address}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Property Contact</h3>
                <div className="space-y-1">
                  {property.contact_info?.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2" />
                      {property.contact_info.phone}
                    </div>
                  )}
                  {property.contact_info?.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2" />
                      {property.contact_info.email}
                    </div>
                  )}
                  {property.contact_info?.office_hours && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {property.contact_info.office_hours}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Local Discoveries */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Discover Your Neighborhood</h2>
          <p className="text-muted-foreground mb-6">
            We've curated local businesses and services near your new home to help you get settled quickly.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category) => (
              <Button
                key={category.key}
                variant={activeCategory === category.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category.key)}
                className="text-sm"
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </Button>
            ))}
          </div>

          {/* Business Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations[activeCategory]?.map((business, index) => (
              <Card key={business.place_id || index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{business.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{business.address}</p>
                    
                    {business.rating && (
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm ml-1">{business.rating}</span>
                      </div>
                    )}

                    {business.business_features && business.business_features.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {business.business_features.slice(0, 3).map((feature, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      {business.business_website && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            logBusinessClick(business.name, activeCategory);
                            window.open(business.business_website, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Website
                        </Button>
                      )}
                      {business.business_phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            logBusinessClick(business.name, activeCategory);
                            window.open(`tel:${business.business_phone}`, '_self');
                          }}
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">
                  Loading {categories.find(c => c.key === activeCategory)?.label.toLowerCase()} near you...
                </p>
              </div>
            )}
          </div>

          {recommendations[activeCategory]?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No {categories.find(c => c.key === activeCategory)?.label.toLowerCase()} found nearby. 
                Try a different category!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-sm text-muted-foreground">
              Welcome to your new neighborhood! This personalized guide was created by your property management 
              to help you discover everything you need nearby.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantWelcome;
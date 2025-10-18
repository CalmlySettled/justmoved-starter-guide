import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PropertyManagerHeader from "@/components/PropertyManagerHeader";
import { Building, Users, Star, Clock, LogIn, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyManagerContract } from '@/hooks/usePropertyManagerContract';
import heroImage from "@/assets/hero-moving.jpg";

const PropertyManagerLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPropertyManager, loading: pmLoading } = usePropertyManagerContract();

  // Auto-redirect active PMs to dashboard
  useEffect(() => {
    if (user && isPropertyManager && !pmLoading) {
      navigate('/property-manager/dashboard');
    }
  }, [user, isPropertyManager, pmLoading, navigate]);

  const handleSignIn = () => {
    navigate('/auth?mode=signin&redirect=/property-manager/dashboard');
  };

  const handleSignUpAsPropertyManager = () => {
    navigate('/auth?mode=signup');
  };

  // Show loading state
  if (pmLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Default: Show marketing landing page for unauthenticated users or non-PMs
  return (
    <div className="min-h-screen bg-background">
      {user && (
        <PropertyManagerHeader 
          onSignOut={() => navigate('/auth')} 
          userName={user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
        />
      )}
      
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Property Manager Portal
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Transform your tenant experience with AI-powered local recommendations. 
            Help your tenants discover their new neighborhood seamlessly.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Button 
              onClick={handleSignIn}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 min-w-[200px]"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Sign In to Dashboard
            </Button>
            
            <div className="text-white/70 text-sm">or</div>
            
            <Button 
              onClick={handleSignUpAsPropertyManager}
              variant="outline"
              size="lg"
              className="bg-white/20 border-white text-white hover:bg-white/30 backdrop-blur-sm min-w-[200px]"
            >
              <Users className="h-5 w-5 mr-2" />
              Sign Up as Property Manager
            </Button>
          </div>
          
          <p className="text-white/80 text-sm mt-6 max-w-2xl mx-auto">
            Already have access? Sign in to your dashboard. New to CalmlySettled? Sign up to create your property manager account.
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Property Managers Choose CalmlySettled
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Enhance Tenant Satisfaction</h3>
              <p className="text-muted-foreground">
                Help tenants quickly find essential services, restaurants, and entertainment in their new neighborhood.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Differentiate Your Properties</h3>
              <p className="text-muted-foreground">
                Offer a unique onboarding experience that sets your properties apart from competitors.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Reduce Support Requests</h3>
              <p className="text-muted-foreground">
                Fewer calls asking "where's the nearest grocery store?" when tenants can discover everything instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Options */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get Access to Your Portal</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose your path to transform your tenant experience with CalmlySettled.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Existing Users Card */}
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Existing Property Managers</CardTitle>
                <CardDescription>
                  Already have access to your property manager dashboard? Sign in here.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={handleSignIn}
                  className="w-full bg-gradient-hero text-white"
                  size="lg"
                >
                  Sign In to Dashboard
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Access your tenant management tools, analytics, and customization options.
                </p>
              </CardContent>
            </Card>

            {/* New Users Card */}
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>New Property Managers</CardTitle>
                <CardDescription>
                  Ready to get started? Create your property manager account instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={handleSignUpAsPropertyManager}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Sign Up as Property Manager
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Your account will be reviewed and activated within 1-2 business days.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyManagerLanding;

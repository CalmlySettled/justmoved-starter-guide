import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Building, Users, Star, Clock, LogIn, Mail } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyManagerAuth } from '@/hooks/usePropertyManagerAuth';
import heroImage from "@/assets/hero-moving.jpg";

const PropertyManagerLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPropertyManager, loading: pmLoading } = usePropertyManagerAuth();

  const handleSignIn = () => {
    navigate('/auth?mode=signin&redirect=/property-manager/dashboard');
  };

  const handleContactSales = () => {
    navigate('/property-manager-contact');
  };

  const handleDashboardAccess = () => {
    navigate('/property-manager/dashboard');
  };

  // Determine button text and action based on auth state
  const getSignInButtonConfig = () => {
    if (user && isPropertyManager && !pmLoading) {
      return {
        text: "Continue to Dashboard",
        action: handleDashboardAccess,
        icon: Building
      };
    }
    return {
      text: "Sign In to Dashboard", 
      action: handleSignIn,
      icon: LogIn
    };
  };

  const buttonConfig = getSignInButtonConfig();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
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
              onClick={buttonConfig.action}
              size="lg"
              className="bg-white text-primary hover:bg-white/90 min-w-[200px]"
            >
              <buttonConfig.icon className="h-5 w-5 mr-2" />
              {buttonConfig.text}
            </Button>
            
            <div className="text-white/70 text-sm">or</div>
            
            <Button 
              onClick={handleContactSales}
              variant="outline"
              size="lg"
              className="bg-white/20 border-white text-white hover:bg-white/30 backdrop-blur-sm min-w-[200px]"
            >
              <Mail className="h-5 w-5 mr-2" />
              Contact Sales
            </Button>
          </div>
          
          <p className="text-white/80 text-sm mt-6 max-w-2xl mx-auto">
            Already have access? Sign in to your dashboard. New to CalmlySettled? Contact our sales team to get started.
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
                  onClick={buttonConfig.action}
                  className="w-full bg-gradient-hero text-white"
                  size="lg"
                >
                  {buttonConfig.text}
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
                  <Building className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>New Property Managers</CardTitle>
                <CardDescription>
                  Interested in CalmlySettled for your properties? Let's get you started.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button 
                  onClick={handleContactSales}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Sales Team
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Our team will set up your account and provide personalized onboarding.
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

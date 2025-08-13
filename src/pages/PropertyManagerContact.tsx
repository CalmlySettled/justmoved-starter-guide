import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building, Users, Star, Clock, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-moving.jpg";

interface ContactForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  propertyCount: string;
  propertyType: string;
  currentSolution: string;
  message: string;
}

const PropertyManagerContact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ContactForm>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    propertyCount: '',
    propertyType: '',
    currentSolution: '',
    message: ''
  });

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store inquiry in database
      const { error } = await (supabase as any)
        .from('property_manager_inquiries')
        .insert([{
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          property_count: formData.propertyCount,
          property_type: formData.propertyType,
          current_solution: formData.currentSolution,
          message: formData.message,
          status: 'new'
        }]);

      if (error) throw error;

      // Send email notification (don't block form submission if this fails)
      try {
        const { error: emailError } = await supabase.functions.invoke('send-property-manager-notification', {
          body: {
            company_name: formData.companyName,
            contact_name: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            property_count: formData.propertyCount,
            property_type: formData.propertyType,
            current_solution: formData.currentSolution,
            message: formData.message,
          },
        });

        if (emailError) {
          console.error('Email notification failed:', emailError);
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      setSubmitted(true);
      toast({
        title: "Inquiry Submitted",
        description: "Thank you for your interest! Our team will contact you within 24 hours.",
      });
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast({
        title: "Error",
        description: "Failed to submit inquiry. Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-20 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <div className="bg-green-50 rounded-lg p-8 mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-800 mb-4">
                Thank You for Your Interest!
              </h1>
              <p className="text-lg text-green-700 mb-6">
                We've received your inquiry and our property management team will contact you within 24 hours.
              </p>
              <p className="text-green-600">
                In the meantime, feel free to explore our platform or contact us directly at{" "}
                <a href="mailto:sales@calmlysettled.com" className="underline font-medium">
                  sales@calmlysettled.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Transform Your Tenant Experience
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto opacity-90">
            Help your tenants discover and connect with local businesses seamlessly. 
            Powered by AI recommendations tailored to their lifestyle.
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

      {/* Contact Form */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us about your properties and we'll set up a customized solution for your tenants.
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                Property Manager Inquiry
              </CardTitle>
              <CardDescription>
                Fill out the form below and our team will contact you within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      required
                      placeholder="ABC Property Management"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      required
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      placeholder="john@abcproperties.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyCount">Number of Properties *</Label>
                    <Select value={formData.propertyCount} onValueChange={(value) => handleInputChange('propertyCount', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 properties</SelectItem>
                        <SelectItem value="6-20">6-20 properties</SelectItem>
                        <SelectItem value="21-50">21-50 properties</SelectItem>
                        <SelectItem value="51-100">51-100 properties</SelectItem>
                        <SelectItem value="100+">100+ properties</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="propertyType">Property Type *</Label>
                    <Select value={formData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apartments">Apartments</SelectItem>
                        <SelectItem value="condos">Condominiums</SelectItem>
                        <SelectItem value="single-family">Single Family Homes</SelectItem>
                        <SelectItem value="mixed">Mixed Portfolio</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentSolution">Current Tenant Onboarding Solution</Label>
                  <Input
                    id="currentSolution"
                    value={formData.currentSolution}
                    onChange={(e) => handleInputChange('currentSolution', e.target.value)}
                    placeholder="Manual welcome packet, email, none, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Information</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Tell us about your specific needs, timeline, or any questions you have..."
                    rows={4}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-hero text-white"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Inquiry'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PropertyManagerContact;
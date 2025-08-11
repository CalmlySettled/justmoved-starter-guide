import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, ExternalLink, Copy, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const PropertyManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generateCustomUrl = () => {
    if (!propertyName.trim() || !propertyAddress.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please fill in property name and address",
        variant: "destructive"
      });
      return;
    }

    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      property: propertyName.trim(),
      address: propertyAddress.trim(),
    });

    if (contactInfo.trim()) {
      params.append('contact', contactInfo.trim());
    }

    if (specialNotes.trim()) {
      params.append('notes', encodeURIComponent(specialNotes.trim()));
    }

    const url = `${baseUrl}/explore?${params.toString()}`;
    setGeneratedUrl(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast({
        title: "URL copied to clipboard!",
        description: "Ready to share with residents"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Failed to copy URL",
        variant: "destructive"
      });
    }
  };

  const previewUrl = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

  const recommendedCategories = [
    "Grocery Stores",
    "Pharmacies", 
    "Coffee Shops",
    "Fitness Centers",
    "Banks",
    "Post Offices",
    "Restaurants",
    "Shopping",
    "Parks",
    "Public Transit"
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Property Manager Portal</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create custom location guides for your residents. Show them what's nearby 
            and help them settle into their new neighborhood.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Property Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="propertyName">Property Name *</Label>
                <Input
                  id="propertyName"
                  placeholder="Liberty View Apartments"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="propertyAddress">Property Address *</Label>
                <Input
                  id="propertyAddress"
                  placeholder="123 Main St, Hartford, CT 06103"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="contactInfo">Contact Information (Optional)</Label>
                <Input
                  id="contactInfo"
                  placeholder="Leasing Office: (860) 555-0123"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="specialNotes">Special Notes (Optional)</Label>
                <Textarea
                  id="specialNotes"
                  placeholder="Welcome to your new home! Here are some nearby places our residents love..."
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={generateCustomUrl}
                className="w-full"
                size="lg"
              >
                Generate Custom URL
              </Button>
            </CardContent>
          </Card>

          {/* Preview/URL Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resident Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your residents will discover nearby:
              </p>
              
              <div className="flex flex-wrap gap-2">
                {recommendedCategories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>

              {generatedUrl && (
                <div className="space-y-3 pt-4 border-t">
                  <Label>Your Custom URL:</Label>
                  <div className="bg-muted p-3 rounded-md break-all text-sm">
                    {generatedUrl}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={copyToClipboard}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy URL
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={previewUrl}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Residents visit your custom URL</li>
                  <li>• They see local businesses near your property</li>
                  <li>• No signup required for basic browsing</li>
                  <li>• Helps residents discover their neighborhood</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="mt-8">
          <CardContent className="text-center py-8">
            <h3 className="text-xl font-semibold mb-4">
              Ready to enhance your resident experience?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Share your custom URL in welcome packets, lease agreements, or building newsletters. 
              Help new residents feel at home in their neighborhood from day one.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/explore')}
                variant="outline"
              >
                Explore Our Platform
              </Button>
              <Button onClick={() => window.location.href = 'mailto:hello@calmlysettled.com?subject=Property Manager Partnership'}>
                Contact Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PropertyManager;
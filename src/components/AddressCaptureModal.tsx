import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/utils/notificationRemover";
import { MapPin, ArrowRight, SkipForward } from "lucide-react";

interface AddressCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (redirectPath?: string) => void;
  sourceContext: string | null;
}

const getContextualContent = (source: string | null) => {
  switch (source) {
    case "explore":
      return {
        title: "Almost ready to explore!",
        description: "We need your location to personalize your recommendations and show you the best places nearby.",
        buttonText: "Start Exploring"
      };
    case "popular":
      return {
        title: "Discover popular spots in your area!",
        description: "Where should we find the most popular places for you?",
        buttonText: "Show Popular Places"
      };
    default:
      return {
        title: "Let's find great places for you!",
        description: "We need your address to show you personalized recommendations in your area.",
        buttonText: "Get Started"
      };
  }
};

export function AddressCaptureModal({ isOpen, onClose, onComplete, sourceContext }: AddressCaptureModalProps) {
  const [address, setAddress] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [loading, setLoading] = useState(false);

  const content = getContextualContent(sourceContext);

  const handleSubmit = async () => {
    if (!address || !isValidAddress) {
      toast({
        title: "Invalid address",
        description: "Please select a valid address from the suggestions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Geocode the address
      const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: { 'User-Agent': 'CalmlySettled/1.0' }
      });
      
      let coordinates = { lat: null, lng: null };
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        if (geocodeData && geocodeData.length > 0) {
          coordinates = {
            lat: parseFloat(geocodeData[0].lat),
            lng: parseFloat(geocodeData[0].lon)
          };
        }
      }

      // Update user profile with address
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          address: address,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Address saved!",
        description: "Now let's find great places near you.",
      });

      // Determine redirect path based on source
      let redirectPath = "/explore"; // default
      if (sourceContext === "popular") {
        redirectPath = "/popular";
      } else if (sourceContext === "explore") {
        redirectPath = "/explore";
      }

      onComplete(redirectPath);
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast({
      title: "Address skipped",
      description: "You can add your address later in settings for personalized recommendations.",
    });
    
    // Determine redirect path based on source
    let redirectPath = "/explore"; // default
    if (sourceContext === "popular") {
      redirectPath = "/popular";
    } else if (sourceContext === "explore") {
      redirectPath = "/explore";
    }

    onComplete(redirectPath);
  };

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Your browser doesn't support geolocation. Please enter an address manually.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          const reverseGeocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'User-Agent': 'CalmlySettled/1.0' } }
          );
          
          let addressFromCoords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          if (reverseGeocodeResponse.ok) {
            const data = await reverseGeocodeResponse.json();
            if (data && data.display_name) {
              addressFromCoords = data.display_name;
            }
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error("No authenticated user found");
          }

          // Update profile with location
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              address: addressFromCoords,
              latitude: latitude,
              longitude: longitude,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            });

          if (error) {
            throw error;
          }

          toast({
            title: "Location saved!",
            description: "Now let's find great places near you.",
          });

          // Determine redirect path based on source
          let redirectPath = "/explore"; // default
          if (sourceContext === "popular") {
            redirectPath = "/popular";
          } else if (sourceContext === "explore") {
            redirectPath = "/explore";
          }

          onComplete(redirectPath);
        } catch (error) {
          console.error('Error saving location:', error);
          toast({
            title: "Error",
            description: "Failed to save location. Please try entering an address manually.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          title: "Location access denied",
          description: "Please enter an address manually to continue.",
          variant: "destructive",
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            {content.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-muted-foreground">
            {content.description}
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Address</label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onValidAddressSelected={setIsValidAddress}
                placeholder="Enter your address..."
              />
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleSubmit}
                disabled={!address || !isValidAddress || loading}
                className="w-full"
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    {content.buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleUseLocation}
                disabled={loading}
                className="w-full"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Use My Current Location
              </Button>

              {sourceContext !== "oauth" && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full text-muted-foreground"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip for now
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
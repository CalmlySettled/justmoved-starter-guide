import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/utils/notificationRemover";
import { MapPin, ArrowRight, LogOut } from "lucide-react";
import { usePropertyManagerAuth } from "@/hooks/usePropertyManagerAuth";

interface AddressCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (redirectPath?: string) => void;
  sourceContext: string | null;
}

const getContextualContent = (source: string | null) => {
  // This modal should rarely appear - only as a fallback for edge cases
  return {
    title: "Location Setup Required",
    description: "We couldn't determine your location automatically. Please enter your address to continue.",
    buttonText: "Continue"
  };
};

export function AddressCaptureModal({ isOpen, onClose, onComplete, sourceContext }: AddressCaptureModalProps) {
  const [address, setAddress] = useState("");
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const navigate = useNavigate();
  const { isPropertyManager, loading: propertyManagerLoading } = usePropertyManagerAuth();

  const content = getContextualContent(sourceContext);

  // Skip modal for property managers - redirect them to their dashboard
  useEffect(() => {
    if (!propertyManagerLoading && isPropertyManager && isOpen) {
      console.log('Property manager detected, redirecting to dashboard instead of address modal');
      navigate("/property-manager");
      onClose();
    }
  }, [isPropertyManager, propertyManagerLoading, isOpen, navigate, onClose]);

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
      console.log('Attempting to save address:', { 
        userId: user.id, 
        address, 
        coordinates,
        sourceContext 
      });

      const { data: profileData, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          address: address,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })
        .select();

      console.log('Profile upsert result:', { profileData, error });

      if (error) {
        console.error('Profile upsert error:', error);
        throw error;
      }

      console.log('Address saved successfully to profile:', profileData);

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

  const handleSignOut = async () => {
    if (!showSignOutConfirm) {
      setShowSignOutConfirm(true);
      return;
    }

    try {
      setLoading(true);
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You can come back and sign up again anytime!",
      });
      navigate("/");
      onClose();
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowSignOutConfirm(false);
    }
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
          console.log('Attempting to save location:', { 
            userId: user.id, 
            address: addressFromCoords, 
            latitude, 
            longitude,
            sourceContext 
          });

          const { data: profileData, error } = await supabase
            .from('profiles')
            .upsert({
              user_id: user.id,
              address: addressFromCoords,
              latitude: latitude,
              longitude: longitude,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
            .select();

          console.log('Profile location upsert result:', { profileData, error });

          if (error) {
            console.error('Profile location upsert error:', error);
            throw error;
          }

          console.log('Location saved successfully to profile:', profileData);

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
    <Dialog open={isOpen} onOpenChange={handleSignOut}>
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

              <Button
                variant="ghost"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {showSignOutConfirm ? "Are you sure? You'll need to sign up again" : "Sign Out & Go Home"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
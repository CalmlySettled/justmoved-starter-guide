import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Users, Car, DollarSign, MapPin, Camera } from "lucide-react";
import { EditPreferencesModal } from "@/components/EditPreferencesModal";
import { sanitizeInput, displayNameSchema, logSecurityEvent } from "@/lib/security";

interface ProfileData {
  display_name: string;
  life_stage: string;
  household_type: string;
  transportation_style: string;
  budget_preference: string;
  address: string;
  priorities: string[];
  settling_tasks: string[];
  avatar_url: string;
}

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData>({
    display_name: "",
    life_stage: "",
    household_type: "",
    transportation_style: "",
    budget_preference: "",
    address: "",
    priorities: [],
    settling_tasks: [],
    avatar_url: ""
  });
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfileData({
          display_name: data.display_name || "",
          life_stage: data.life_stage || "",
          household_type: data.household_type || "",
          transportation_style: data.transportation_style || "",
          budget_preference: data.budget_preference || "",
          address: data.address || "",
          priorities: data.priorities || [],
          settling_tasks: data.settling_tasks || [],
          avatar_url: data.avatar_url || ""
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh the profile data when preferences are updated
    fetchProfile();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const updatedProfileData = { ...profileData, avatar_url: publicUrl };
      setProfileData(updatedProfileData);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...updatedProfileData,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Validate and sanitize inputs
      const sanitizedDisplayName = sanitizeInput(profileData.display_name || '');
      
      try {
        if (sanitizedDisplayName) {
          displayNameSchema.parse(sanitizedDisplayName);
        }
      } catch (validationError: any) {
        await logSecurityEvent('Invalid profile input', {
          userId: user.id,
          error: validationError.message
        });
        
        toast.error(validationError.errors?.[0]?.message || "Please check your display name");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...profileData,
          display_name: sanitizedDisplayName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      await logSecurityEvent('Profile updated', { userId: user.id });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      await logSecurityEvent('Profile save failed', { 
        userId: user.id, 
        error: String(error)
      });
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getUserInitials = () => {
    const name = profileData.display_name || user?.email || '';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-20 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profileData.avatar_url} alt="Profile picture" />
                    <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 rounded-full p-2"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, display_name: e.target.value }))}
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us a bit about yourself..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relocation Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Relocation Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Heart className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Life Stage</h3>
                      <p className="text-muted-foreground">{profileData.life_stage || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Household</h3>
                      <p className="text-muted-foreground">{profileData.household_type || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Car className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Transportation</h3>
                      <p className="text-muted-foreground">{profileData.transportation_style || "Not set"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Budget Style</h3>
                      <p className="text-muted-foreground">{profileData.budget_preference || "Not set"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-4 bg-teal-50 rounded-lg">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Location</h3>
                      <p className="text-muted-foreground text-sm">{profileData.address || "Not set"}</p>
                    </div>
                  </div>

                  <EditPreferencesModal 
                    userProfile={profileData}
                    onProfileUpdate={handleProfileUpdate}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settling Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Settling Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground">
                  Your settling tasks and progress will appear here
                </div>
                <Button variant="outline" className="w-full">
                  View Settling Tasks
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
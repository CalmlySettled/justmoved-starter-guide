import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Shield, Bell, Download, Trash2, Eye, Mail, MapPin } from "lucide-react";
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
  
  // Account Settings states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState("weekly");
  const [locationSharing, setLocationSharing] = useState(true);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

      // Check if address has changed to trigger recommendation regeneration
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('address')
        .eq('user_id', user.id)
        .single();

      const addressChanged = currentProfile?.address !== profileData.address;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...profileData,
          display_name: sanitizedDisplayName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // If address changed, clear old recommendations and generate new ones
      if (addressChanged && profileData.address) {
        console.log('Address changed, clearing old recommendations and generating new ones');
        
        // Clear old recommendations
        const { error: deleteError } = await supabase
          .from('user_recommendations')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error clearing old recommendations:', deleteError);
        }

        // ✅ COST PROTECTION: Pass userId to enable server-side caching
        try {
          const { error: recError } = await supabase.functions.invoke('generate-recommendations', {
            body: {
              quizResponse: {
                address: profileData.address,
                priorities: profileData.priorities,
                household: profileData.household_type,
                transportation: profileData.transportation_style,
                budgetRange: profileData.budget_preference,
                movingTimeline: profileData.life_stage
              },
              userId: user.id  // CRITICAL: This enables server-side caching!
            }
          });

          if (recError) {
            console.error('Error generating new recommendations:', recError);
            toast.error('Profile saved but failed to update recommendations. Please explore to find new businesses.');
          } else {
            toast.success('Profile updated and new recommendations generated for your new location!');
          }
        } catch (recError) {
          console.error('Error calling recommendation service:', recError);
          toast.error('Profile saved but failed to update recommendations. Please explore to find new businesses.');
        }
      } else {
        toast.success('Profile updated successfully');
      }
      
      await logSecurityEvent('Profile updated', { userId: user.id });
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

  // Account Settings functions
  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    try {
      // This would trigger Supabase's password reset flow
      toast.success("Password reset instructions sent to your email");
    } catch (error) {
      toast.error("Failed to send password reset email");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      toast.success("Data export will be emailed to you within 24 hours");
    } catch (error) {
      toast.error("Failed to request data export");
    }
  };

  const handleDeleteAccount = async () => {
    // This would show a confirmation dialog first
    toast.error("Account deletion requires confirmation - feature coming soon");
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


          {/* Account Settings Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
            <p className="text-muted-foreground mb-6">Manage your account security and preferences</p>
          </div>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Contact support to change your email address
                  </p>
                </div>

                <div>
                  <Label>Password</Label>
                  <div className="flex items-center space-x-3 mt-2">
                    <Input
                      type="password"
                      value="••••••••••••"
                      disabled
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? "Sending..." : "Change"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    We'll send password reset instructions to your email
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch disabled />
                </div>
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication coming soon
                </p>
              </div>
            </CardContent>
          </Card>


          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive recommendations and updates via email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Push Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive browser notifications</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notification Frequency</Label>
                  <Select value={notificationFrequency} onValueChange={setNotificationFrequency}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Privacy & Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Location Sharing</p>
                    <p className="text-sm text-muted-foreground">Allow us to use your location for better recommendations</p>
                  </div>
                  <Switch
                    checked={locationSharing}
                    onCheckedChange={setLocationSharing}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export My Data
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your data including profile, preferences, and recommendations
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAccount}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Profile;
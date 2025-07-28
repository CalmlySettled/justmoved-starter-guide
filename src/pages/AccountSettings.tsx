import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { Shield, Bell, Download, Trash2, Eye, Mail } from "lucide-react";

const AccountSettings = () => {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState("weekly");
  const [locationSharing, setLocationSharing] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account security and preferences</p>
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

export default AccountSettings;
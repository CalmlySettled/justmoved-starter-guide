import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, Clock, ShieldX, Activity } from "lucide-react";

interface PendingPropertyManager {
  user_id: string;
  email: string;
  display_name?: string;
  contract_status: string;
  created_at: string;
}

const AdminPropertyManagerActivation = () => {
  const [pendingManagers, setPendingManagers] = useState<PendingPropertyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      fetchPendingManagers();
    }
  }, [isAdmin]);

  const fetchPendingManagers = async () => {
    try {
      setLoading(true);
      
      // Get pending property managers from user_roles joined with profiles
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          contract_status,
          created_at
        `)
        .eq('role', 'property_manager')
        .eq('contract_status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get display names from profiles table separately
      const managersWithDetails = await Promise.all(
        (data || []).map(async (manager) => {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', manager.user_id)
            .single();
          
          return {
            user_id: manager.user_id,
            email: 'Available in user details', // Would need special query for auth.users
            display_name: profile?.display_name,
            contract_status: manager.contract_status,
            created_at: manager.created_at
          };
        })
      );
      
      setPendingManagers(managersWithDetails);
    } catch (error) {
      console.error('Error fetching pending managers:', error);
      toast({
        title: "Error",
        description: "Failed to load pending property managers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const activatePropertyManager = async (userId: string) => {
    try {
      setActivating(userId);
      
      // Call the database function to activate
      const { error } = await supabase.rpc('activate_property_manager', {
        p_user_id: userId
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Property manager activated successfully",
      });
      
      // Refresh the list
      await fetchPendingManagers();
    } catch (error) {
      console.error('Error activating property manager:', error);
      toast({
        title: "Error",
        description: "Failed to activate property manager",
        variant: "destructive"
      });
    } finally {
      setActivating(null);
    }
  };

  // Admin authentication check
  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                {adminLoading ? "Verifying admin privileges..." : "Loading pending property managers..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (adminError || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {adminError || "You don't have permission to access this admin page. Admin privileges are required."}
              </p>
              <p className="text-xs text-muted-foreground">
                If you believe this is an error, please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 px-6 max-w-7xl mx-auto pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Property Manager Activation</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Admin Only
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Review and activate pending property manager accounts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Property Managers ({pendingManagers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingManagers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending property manager activations</p>
                <p className="text-xs mt-2">All property managers have been processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingManagers.map((manager) => (
                  <div
                    key={manager.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">
                          {manager.display_name || 'Unnamed User'}
                        </h3>
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          {manager.contract_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        User ID: {manager.user_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Signed up: {new Date(manager.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => activatePropertyManager(manager.user_id)}
                        disabled={activating === manager.user_id}
                        size="sm"
                      >
                        {activating === manager.user_id ? (
                          <>
                            <Activity className="h-4 w-4 animate-spin mr-2" />
                            Activating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPropertyManagerActivation;
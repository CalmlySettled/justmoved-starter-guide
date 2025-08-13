import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Mail, Phone, Calendar, Building, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PropertyManagerInquiry {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  property_count?: string;
  property_type?: string;
  current_solution?: string;
  message?: string;
  status: string;
  admin_notes?: string;
  contacted_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export default function PropertyManagerInquiries() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [inquiries, setInquiries] = useState<PropertyManagerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const statusOptions = [
    { value: "all", label: "All Inquiries" },
    { value: "new", label: "New" },
    { value: "in_progress", label: "In Progress" },
    { value: "contacted", label: "Contacted" },
    { value: "closed", label: "Closed" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-red-100 text-red-800 border-red-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "contacted": return "bg-blue-100 text-blue-800 border-blue-200";
      case "closed": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from("property_manager_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      toast({
        title: "Error",
        description: "Failed to load inquiries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateInquiry = async (id: string, updates: Partial<PropertyManagerInquiry>) => {
    setUpdatingId(id);
    try {
      const updateData: any = { ...updates };
      
      // Set timestamp fields based on status changes
      if (updates.status === "contacted" && !inquiries.find(i => i.id === id)?.contacted_at) {
        updateData.contacted_at = new Date().toISOString();
      }
      if (updates.status === "closed" && !inquiries.find(i => i.id === id)?.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("property_manager_inquiries")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      await fetchInquiries();
      toast({
        title: "Success",
        description: "Inquiry updated successfully",
      });
    } catch (error) {
      console.error("Error updating inquiry:", error);
      toast({
        title: "Error",
        description: "Failed to update inquiry",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchInquiries();
    }
  }, [isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredInquiries = inquiries.filter(inquiry => 
    selectedStatus === "all" || inquiry.status === selectedStatus
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Property Manager Inquiries</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {filteredInquiries.length} inquir{filteredInquiries.length === 1 ? 'y' : 'ies'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredInquiries.map((inquiry) => (
          <Card key={inquiry.id} className="w-full">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">{inquiry.company_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {inquiry.contact_name} • {formatDistanceToNow(new Date(inquiry.created_at))} ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(inquiry.status)}>
                        {inquiry.status.replace('_', ' ')}
                      </Badge>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${inquiry.email}`} className="text-primary hover:underline">
                            {inquiry.email}
                          </a>
                        </div>
                        
                        {inquiry.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${inquiry.phone}`} className="text-primary hover:underline">
                              {inquiry.phone}
                            </a>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Submitted {new Date(inquiry.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {inquiry.property_count && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{inquiry.property_count} properties</span>
                          </div>
                        )}
                      </div>
                      
                      {inquiry.property_type && (
                        <div>
                          <span className="font-medium">Property Type: </span>
                          <span>{inquiry.property_type}</span>
                        </div>
                      )}
                      
                      {inquiry.current_solution && (
                        <div>
                          <span className="font-medium">Current Solution: </span>
                          <span>{inquiry.current_solution}</span>
                        </div>
                      )}
                    </div>

                    {/* Admin Controls */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">Admin Controls</h3>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select
                          value={inquiry.status}
                          onValueChange={(value) => updateInquiry(inquiry.id, { status: value })}
                          disabled={updatingId === inquiry.id}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                        <Textarea
                          placeholder="Add internal notes about this inquiry..."
                          value={inquiry.admin_notes || ""}
                          onChange={(e) => {
                            const updatedInquiries = inquiries.map(i => 
                              i.id === inquiry.id ? { ...i, admin_notes: e.target.value } : i
                            );
                            setInquiries(updatedInquiries);
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== (inquiry.admin_notes || "")) {
                              updateInquiry(inquiry.id, { admin_notes: e.target.value });
                            }
                          }}
                          disabled={updatingId === inquiry.id}
                        />
                      </div>
                      
                      {inquiry.contacted_at && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Contacted: </span>
                          {new Date(inquiry.contacted_at).toLocaleDateString()}
                        </div>
                      )}
                      
                      {inquiry.resolved_at && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Resolved: </span>
                          {new Date(inquiry.resolved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {inquiry.message && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Message</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md">
                        {inquiry.message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
        
        {filteredInquiries.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No inquiries found for the selected filter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
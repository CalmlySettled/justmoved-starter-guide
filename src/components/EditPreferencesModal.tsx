import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { sanitizeInput, addressSchema, logSecurityEvent } from "@/lib/security";

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  priority_preferences?: Record<string, string[]>;
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
  settling_tasks?: string[];
}

interface EditPreferencesModalProps {
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
}

export function EditPreferencesModal({ userProfile, onProfileUpdate }: EditPreferencesModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({
    address: "",
    household_type: "",
    priorities: [],
    priority_preferences: {},
    transportation_style: "",
    budget_preference: "",
    life_stage: "",
    settling_tasks: []
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (userProfile) {
      setFormData({
        address: userProfile.address || "",
        household_type: userProfile.household_type || "",
        priorities: userProfile.priorities || [],
        priority_preferences: userProfile.priority_preferences || {},
        transportation_style: userProfile.transportation_style || "",
        budget_preference: userProfile.budget_preference || "",
        life_stage: userProfile.life_stage || "",
        settling_tasks: userProfile.settling_tasks || []
      });
    }
  }, [userProfile]);

  const handlePrioritiesChange = (value: string, checked: boolean) => {
    if (checked && formData.priorities.length < 8) {
      setFormData({ ...formData, priorities: [...formData.priorities, value] });
    } else if (!checked) {
      setFormData({ ...formData, priorities: formData.priorities.filter(item => item !== value) });
    }
  };

  const handleTasksChange = (value: string, checked: boolean) => {
    if (checked && (formData.settling_tasks?.length || 0) < 3) {
      setFormData({ ...formData, settling_tasks: [...(formData.settling_tasks || []), value] });
    } else if (!checked) {
      setFormData({ ...formData, settling_tasks: (formData.settling_tasks || []).filter(item => item !== value) });
    }
  };

  const handleHouseholdChange = (value: string, checked: boolean) => {
    const currentHousehold = (formData.household_type || "").split(', ').filter(Boolean);
    if (checked) {
      setFormData({ ...formData, household_type: [...currentHousehold, value].join(', ') });
    } else {
      setFormData({ ...formData, household_type: currentHousehold.filter(item => item !== value).join(', ') });
    }
  };

  const getHouseholdArray = () => {
    return (formData.household_type || "").split(', ').filter(Boolean);
  };

  // Define sub-preferences for each main category (same as onboarding quiz)
  const subPreferenceOptions: Record<string, string[]> = {
    "Grocery stores": ["Organic options", "Budget-friendly", "International foods", "24/7 availability", "Local produce"],
    "Medical care": ["Pediatrician", "OBGYN", "Family physician", "Urgent care", "Dental care", "Mental health"],
    "Pharmacy": ["24/7 availability", "Insurance accepted", "Drive-thru", "Compounding", "Vaccinations", "Health screenings"],
    "Fitness options": ["Gym/weightlifting", "Yoga/pilates", "Swimming", "Group classes", "Outdoor activities"],
    "DMV / Government services": ["DMV office", "Post office", "Library", "City hall", "Voting locations"],
    "Faith communities": ["Non-denominational", "Catholic", "Jewish", "Muslim", "Buddhist", "Hindu"],
    "Public transit / commute info": ["Bus routes", "Train stations", "Bike lanes", "Park & ride", "Commuter lots"],
    "Parks / Trails": ["Playgrounds", "Dog parks", "Sports fields", "Walking trails", "Picnic areas", "Hiking trails", "Bike paths", "Nature preserves", "Scenic walks", "Bird watching"],
    "Restaurants / coffee shops": ["Family-friendly", "Date night spots", "Quick casual", "Coffee shops", "Food trucks"],
    "Social events or community groups": ["Family activities", "Young professionals", "Hobby groups", "Sports leagues", "Volunteer opportunities"]
  };

  const handleSubPreferenceChange = (category: string, preference: string, checked: boolean) => {
    const currentPrefs = (formData.priority_preferences || {})[category] || [];
    let newPrefs;
    
    if (checked) {
      newPrefs = [...currentPrefs, preference];
    } else {
      newPrefs = currentPrefs.filter(p => p !== preference);
    }
    
    setFormData({
      ...formData,
      priority_preferences: {
        ...formData.priority_preferences,
        [category]: newPrefs
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Validate and sanitize address input
      let sanitizedAddress = '';
      if (formData.address) {
        sanitizedAddress = sanitizeInput(formData.address);
        try {
          addressSchema.parse(sanitizedAddress);
        } catch (validationError: any) {
          await logSecurityEvent('Invalid address input', {
            userId: user.id,
            error: validationError.message
          });
          
          toast({
            title: "Invalid address",
            description: validationError.errors?.[0]?.message || "Please enter a valid address",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          address: sanitizedAddress,
          household_type: formData.household_type,
          priorities: formData.priorities,
          priority_preferences: formData.priority_preferences,
          transportation_style: formData.transportation_style,
          budget_preference: formData.budget_preference,
          life_stage: formData.life_stage,
          settling_tasks: formData.settling_tasks
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // ✅ COST PROTECTION: Pass userId to enable server-side caching
      console.log('🔄 Generating recommendations with new preferences...');
      try {
        const { data: regenData, error: recommendationError } = await supabase.functions.invoke('generate-recommendations', {
          body: {
            quizResponse: {
              address: sanitizedAddress,
              household_type: formData.household_type,
              priorities: formData.priorities,
              transportation_style: formData.transportation_style,
              budget_preference: formData.budget_preference,
              life_stage: formData.life_stage,
              settling_tasks: formData.settling_tasks,
              priority_preferences: formData.priority_preferences || {}
            },
            userId: user.id  // CRITICAL: This enables server-side caching!
          }
        });
        
        if (recommendationError) {
          console.error('❌ Error generating recommendations:', recommendationError);
          // Don't throw here - preferences were saved successfully
        } else {
          console.log('✅ Recommendations generated successfully:', regenData);
        }
      } catch (recommendationError) {
        console.error('❌ Failed to regenerate recommendations:', recommendationError);
        // Don't throw here - preferences were saved successfully
      }

      await logSecurityEvent('Preferences updated', { userId: user.id });

      toast({
        title: "Preferences Updated", 
        description: "Your preferences have been updated and new recommendations are being generated.",
      });

      setOpen(false);
      
      // Wait a moment for recommendations to be saved, then refresh Dashboard
      setTimeout(() => {
        console.log('🔄 Triggering Dashboard refresh...');
        onProfileUpdate();
      }, 2000);
    } catch (error) {
      console.error('Error updating preferences:', error);
      await logSecurityEvent('Preferences update failed', { 
        userId: user.id, 
        error: String(error)
      });
      
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          data-testid="edit-preferences-trigger"
        >
          <Settings className="h-4 w-4" />
          Edit My Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Your Preferences
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            
            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address</CardTitle>
              </CardHeader>
              <CardContent>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(value) => setFormData({ ...formData, address: value })}
                  placeholder="Enter your address"
                  label=""
                />
              </CardContent>
            </Card>

            {/* Household Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Household</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {["Just me", "Partner/spouse", "Kids", "Pets", "Other (multi-gen family, roommates, etc.)"].map((option) => {
                    const isChecked = getHouseholdArray().includes(option);
                    return (
                      <div key={option} className="flex items-center space-x-3">
                        <Checkbox
                          id={`household-${option}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleHouseholdChange(option, checked as boolean)}
                          className="min-h-[24px] min-w-[24px]"
                        />
                        <Label htmlFor={`household-${option}`} className="text-base cursor-pointer flex-1">{option}</Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Priorities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Priorities</CardTitle>
                <p className="text-sm text-muted-foreground">Choose up to 8 options (Selected: {formData.priorities.length}/8)</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  
                  {/* Food & Dining Group */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🍽️ Food & Dining</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {[
                        "Grocery stores", 
                        "Coffee shops", 
                        "Restaurants",
                        "Bakeries"
                      ].map((option) => (
                        <div key={option} className="flex items-center space-x-3">
                          <Checkbox
                            id={`priority-${option}`}
                            checked={formData.priorities.includes(option)}
                            onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                            disabled={!formData.priorities.includes(option) && formData.priorities.length >= 8}
                            className="min-h-[20px] min-w-[20px]"
                          />
                          <Label htmlFor={`priority-${option}`} className="text-sm cursor-pointer flex-1">{option}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Health & Wellness Group */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">⚕️ Health & Wellness</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {[
                        "Medical care", 
                        "Pharmacy",
                        "Fitness options", 
                        "Veterinary care", 
                        "Mental health services"
                      ].map((option) => (
                        <div key={option} className="flex items-center space-x-3">
                          <Checkbox
                            id={`priority-${option}`}
                            checked={formData.priorities.includes(option)}
                            onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                            disabled={!formData.priorities.includes(option) && formData.priorities.length >= 8}
                            className="min-h-[20px] min-w-[20px]"
                          />
                          <Label htmlFor={`priority-${option}`} className="text-sm cursor-pointer flex-1">{option}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services & Essentials Group */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🏛️ Services & Essentials</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {[
                        "DMV / Government services", 
                        "Public transit / commute info", 
                        "Hardware stores", 
                        "Banking / Financial"
                      ].map((option) => (
                        <div key={option} className="flex items-center space-x-3">
                          <Checkbox
                            id={`priority-${option}`}
                            checked={formData.priorities.includes(option)}
                            onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                            disabled={!formData.priorities.includes(option) && formData.priorities.length >= 8}
                            className="min-h-[20px] min-w-[20px]"
                          />
                          <Label htmlFor={`priority-${option}`} className="text-sm cursor-pointer flex-1">{option}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recreation & Community Group */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🎯 Recreation & Community</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {[
                        "Parks / Trails", 
                        "Faith communities", 
                        "Social events / community groups", 
                        "Libraries / Education"
                      ].map((option) => (
                        <div key={option} className="flex items-center space-x-3">
                          <Checkbox
                            id={`priority-${option}`}
                            checked={formData.priorities.includes(option)}
                            onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                            disabled={!formData.priorities.includes(option) && formData.priorities.length >= 8}
                            className="min-h-[20px] min-w-[20px]"
                          />
                          <Label htmlFor={`priority-${option}`} className="text-sm cursor-pointer flex-1">{option}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>

            {/* Sub-Preferences temporarily disabled - Coming soon */}
            {formData.priorities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
                    <div className="text-center space-y-2">
                      <p className="text-base font-medium text-muted-foreground">
                        🚀 Advanced preference customization coming soon!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Soon you'll be able to fine-tune your selected categories with specific preferences like "Family-friendly restaurants", "24/7 pharmacies", "Outdoor fitness options" and more.
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        For now, we'll use your main category selections to find the best recommendations in your area.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transportation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transportation</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={formData.transportation_style} 
                  onValueChange={(value) => setFormData({...formData, transportation_style: value})}
                  className="space-y-4"
                >
                  {["Car", "Public transit", "Bike / walk", "Rideshare only"].map((option) => (
                    <div key={option} className="flex items-center space-x-3">
                      <RadioGroupItem value={option} id={`transport-${option}`} className="min-h-[24px] min-w-[24px]" />
                      <Label htmlFor={`transport-${option}`} className="text-base cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Budget Preference */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lifestyle & Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={formData.budget_preference} 
                  onValueChange={(value) => setFormData({...formData, budget_preference: value})}
                  className="space-y-4"
                >
                  {["Budget-conscious", "A mix of both", "Quality over price"].map((option) => (
                    <div key={option} className="flex items-center space-x-3">
                      <RadioGroupItem value={option} id={`budget-${option}`} className="min-h-[24px] min-w-[24px]" />
                      <Label htmlFor={`budget-${option}`} className="text-base cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Life Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Life Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={formData.life_stage} 
                  onValueChange={(value) => setFormData({...formData, life_stage: value})}
                  className="space-y-4"
                >
                  {["Working professional", "Couple / newly married", "Family with young kids", "Family with teens", "Empty nester", "Retired", "Student"].map((option) => (
                    <div key={option} className="flex items-center space-x-3">
                      <RadioGroupItem value={option} id={`life-${option}`} className="min-h-[24px] min-w-[24px]" />
                      <Label htmlFor={`life-${option}`} className="text-base cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Settling Tasks - Hidden for now since it's different from quiz */}
            {false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Focus</CardTitle>
                <p className="text-sm text-muted-foreground">Choose up to 3 tasks (Selected: {(formData.settling_tasks?.length || 0)}/3)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Finding a doctor/dentist",
                    "Getting a driver's license",
                    "Finding schools for kids",
                    "Setting up utilities",
                    "Finding a gym/fitness routine",
                    "Making friends/social connections",
                    "Exploring local culture",
                    "Finding pet services"
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`task-${option}`}
                        checked={(formData.settling_tasks || []).includes(option)}
                        onCheckedChange={(checked) => handleTasksChange(option, checked as boolean)}
                        disabled={!(formData.settling_tasks || []).includes(option) && (formData.settling_tasks?.length || 0) >= 3}
                      />
                      <Label htmlFor={`task-${option}`} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
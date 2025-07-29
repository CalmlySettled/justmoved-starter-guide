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
    if (checked && formData.priorities.length < 5) {
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
    "Medical care / Pharmacy": ["Pediatrician", "OBGYN", "Family physician", "Urgent care", "Dental care", "Mental health"],
    "Fitness options": ["Gym/weightlifting", "Yoga/pilates", "Swimming", "Group classes", "Outdoor activities"],
    "DMV / Government services": ["DMV office", "Post office", "Library", "City hall", "Voting locations"],
    "Parks": ["Playgrounds", "Dog parks", "Sports fields", "Walking trails", "Picnic areas"],
    "Faith communities": ["Christian", "Jewish", "Muslim", "Buddhist", "Hindu", "Non-denominational"],
    "Public transit / commute info": ["Bus routes", "Train stations", "Bike lanes", "Park & ride", "Commuter lots"],
    "Green space / trails": ["Hiking trails", "Bike paths", "Nature preserves", "Scenic walks", "Bird watching"],
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
      const { error } = await supabase
        .from('profiles')
        .update({
          address: formData.address,
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

      // Trigger recommendation regeneration with updated preferences
      try {
        const { error: recommendationError } = await supabase.functions.invoke('generate-recommendations', {
          body: {
            quizResponse: {
              address: formData.address,
              household_type: formData.household_type,
              priorities: formData.priorities,
              transportation_style: formData.transportation_style,
              budget_preference: formData.budget_preference,
              life_stage: formData.life_stage,
              settling_tasks: formData.settling_tasks,
              priority_preferences: formData.priority_preferences || {}
            },
            userId: user.id
          }
        });
        
        if (recommendationError) {
          console.error('Error generating recommendations:', recommendationError);
          // Don't throw here - preferences were saved successfully
        }
      } catch (recommendationError) {
        console.error('Failed to regenerate recommendations:', recommendationError);
        // Don't throw here - preferences were saved successfully
      }

      toast({
        title: "Preferences Updated",
        description: "Your preferences have been updated and new recommendations are being generated.",
      });

      setOpen(false);
      onProfileUpdate();
    } catch (error) {
      console.error('Error updating preferences:', error);
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
        <Button variant="outline" className="flex items-center gap-2">
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
                <div className="grid grid-cols-2 gap-4">
                  {["Just me", "Partner/spouse", "Kids", "Pets", "Other (multi-gen family, roommates, etc.)"].map((option) => {
                    const isChecked = getHouseholdArray().includes(option);
                    return (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`household-${option}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleHouseholdChange(option, checked as boolean)}
                        />
                        <Label htmlFor={`household-${option}`} className="text-sm">{option}</Label>
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
                <p className="text-sm text-muted-foreground">Choose up to 5 options (Selected: {formData.priorities.length}/5)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "Grocery stores",
                    "Medical care / Pharmacy", 
                    "Fitness options",
                    "DMV / Government services",
                    "Parks",
                    "Faith communities",
                    "Public transit / commute info",
                    "Green space / trails",
                    "Restaurants / coffee shops",
                    "Social events or community groups"
                  ].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${option}`}
                        checked={formData.priorities.includes(option)}
                        onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                        disabled={!formData.priorities.includes(option) && formData.priorities.length >= 5}
                      />
                      <Label htmlFor={`priority-${option}`} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sub-Preferences - Only show if priorities are selected */}
            {formData.priorities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customize Your Preferences</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Fine-tune your selected categories for more personalized recommendations
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {formData.priorities.map((category) => (
                      <div key={category} className="p-4 border rounded-lg bg-background/50">
                        <h4 className="font-semibold text-primary mb-3">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {subPreferenceOptions[category]?.map((preference) => (
                            <div key={preference} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${category}-${preference}`}
                                checked={((formData.priority_preferences || {})[category] || []).includes(preference)}
                                onCheckedChange={(checked) => handleSubPreferenceChange(category, preference, checked as boolean)}
                              />
                              <Label 
                                htmlFor={`${category}-${preference}`} 
                                className="text-sm font-medium cursor-pointer"
                              >
                                {preference}
                              </Label>
                            </div>
                          )) || (
                            <p className="text-muted-foreground text-sm">No specific options available for this category.</p>
                          )}
                        </div>
                        {((formData.priority_preferences || {})[category]?.length || 0) > 0 && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            {(formData.priority_preferences || {})[category]?.length} preferences selected
                          </div>
                        )}
                      </div>
                    ))}
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
                >
                  {["Car", "Public transit", "Bike / walk", "Rideshare only"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`transport-${option}`} />
                      <Label htmlFor={`transport-${option}`} className="text-sm">{option}</Label>
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
                >
                  {["Budget-conscious", "Moderate spending", "Quality over price"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`budget-${option}`} />
                      <Label htmlFor={`budget-${option}`} className="text-sm">{option}</Label>
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
                >
                  {["Young professional", "Family with kids", "Empty nester", "Retired", "Student"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`life-${option}`} />
                      <Label htmlFor={`life-${option}`} className="text-sm">{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Settling Tasks */}
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
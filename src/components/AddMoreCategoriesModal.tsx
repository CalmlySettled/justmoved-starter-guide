import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
  settling_tasks?: string[];
}

interface AddMoreCategoriesModalProps {
  userProfile: UserProfile | null;
  onNewRecommendations: () => void;
}

export function AddMoreCategoriesModal({ userProfile, onNewRecommendations }: AddMoreCategoriesModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  const allCategories = [
    "Grocery stores",
    "Medical care / Pharmacy", 
    "Fitness options",
    "DMV / Government services",
    "Parks",
    "Faith communities",
    "Public transit / commute info",
    "Green space / trails",
    "Restaurants / coffee shops",
    "Social events or community groups",
    "Auto services (repair, registration)",
    "Beauty / Hair salons",
    "Childcare / Daycare",
    "Banking / Financial services",
    "Pet services (vet, grooming)",
    "Home improvement / Hardware stores",
    "Libraries",
    "Entertainment / Movies"
  ];

  const currentPriorities = userProfile?.priorities || [];
  const availableCategories = allCategories.filter(cat => !currentPriorities.includes(cat));

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    }
  };

  const handleAddCategories = async () => {
    if (!user || !userProfile || selectedCategories.length === 0) return;

    setLoading(true);
    try {
      // Generate recommendations for new categories only
      const { data: recommendations, error: recError } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          quizResponse: {
            address: userProfile.address,
            householdType: userProfile.household_type,
            priorities: selectedCategories, // Only generate for new categories
            transportationStyle: userProfile.transportation_style,
            budgetPreference: userProfile.budget_preference,
            lifeStage: userProfile.life_stage,
            settlingTasks: userProfile.settling_tasks
          }
        }
      });

      if (recError) {
        throw recError;
      }

      if (recommendations?.recommendations) {
        // Save new recommendations to user_recommendations table (append, don't replace)
        const recommendationsToSave: any[] = [];
        
        Object.entries(recommendations.recommendations).forEach(([category, businesses]: [string, any[]]) => {
          businesses.forEach((business: any) => {
            recommendationsToSave.push({
              user_id: user.id,
              category: category,
              business_name: business.name,
              business_address: business.address,
              business_description: business.description,
              business_phone: business.phone,
              business_image: business.image_url && business.image_url.trim() !== '' ? business.image_url : null,
              business_features: business.features || [],
              distance_miles: business.distance_miles,
              business_latitude: business.latitude,
              business_longitude: business.longitude
            });
          });
        });

        const { error: saveError } = await supabase
          .from('user_recommendations')
          .insert(recommendationsToSave);

        if (saveError) {
          throw saveError;
        }

        // Update user's priorities to include new categories
        const updatedPriorities = [...currentPriorities, ...selectedCategories];
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ priorities: updatedPriorities })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating priorities:', updateError);
          // Don't throw here - recommendations were saved successfully
        }

        toast({
          title: "New Recommendations Added!",
          description: `We've added recommendations for ${selectedCategories.length} new ${selectedCategories.length === 1 ? 'category' : 'categories'}.`,
        });

        setOpen(false);
        setSelectedCategories([]);
        onNewRecommendations();
      }
    } catch (error) {
      console.error('Error adding new categories:', error);
      toast({
        title: "Error",
        description: "Failed to generate new recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Explore More Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Explore More Categories
          </DialogTitle>
          <p className="text-muted-foreground">
            Add new categories to expand your recommendations without losing your current ones.
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentPriorities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Current Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {currentPriorities.map((priority) => (
                    <span 
                      key={priority} 
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                    >
                      {priority}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Categories</CardTitle>
              <p className="text-xs text-muted-foreground">
                Select categories you'd like to explore (Selected: {selectedCategories.length})
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {availableCategories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-${category}`}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    />
                    <Label htmlFor={`new-${category}`} className="text-sm">{category}</Label>
                  </div>
                ))}
              </div>
              
              {availableCategories.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  You've already explored all available categories! 🎉
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleAddCategories} 
            disabled={loading || selectedCategories.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : `Add ${selectedCategories.length} ${selectedCategories.length === 1 ? 'Category' : 'Categories'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Star, User, Car, DollarSign, Calendar, Home } from "lucide-react";

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
  settling_tasks?: string[];
}

interface ProfileCompletionCardProps {
  userProfile: UserProfile;
  onEnhanceProfile: () => void;
}

export function ProfileCompletionCard({ userProfile, onEnhanceProfile }: ProfileCompletionCardProps) {
  // Calculate completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 6;

    if (userProfile.address) completed++;
    if (userProfile.household_type && userProfile.household_type !== 'Not specified') completed++;
    if (userProfile.priorities && userProfile.priorities.length >= 3) completed++;
    if (userProfile.transportation_style && userProfile.transportation_style !== 'Flexible') completed++;
    if (userProfile.budget_preference && userProfile.budget_preference !== 'Moderate') completed++;
    if (userProfile.life_stage && userProfile.life_stage !== 'Getting settled') completed++;

    return Math.round((completed / total) * 100);
  };

  const completionPercentage = calculateCompletion();
  const isFullyComplete = completionPercentage === 100;

  // Check what's missing
  const getMissingItems = () => {
    const missing = [];
    if (!userProfile.household_type || userProfile.household_type === 'Not specified') {
      missing.push({ label: "Household type", icon: Home });
    }
    if (!userProfile.priorities || userProfile.priorities.length < 3) {
      missing.push({ label: "More priorities", icon: Star });
    }
    if (!userProfile.transportation_style || userProfile.transportation_style === 'Flexible') {
      missing.push({ label: "Transportation style", icon: Car });
    }
    if (!userProfile.budget_preference || userProfile.budget_preference === 'Moderate') {
      missing.push({ label: "Budget preference", icon: DollarSign });
    }
    if (!userProfile.life_stage || userProfile.life_stage === 'Getting settled') {
      missing.push({ label: "Life stage", icon: Calendar });
    }
    return missing;
  };

  const missingItems = getMissingItems();

  if (isFullyComplete) {
    return (
      <Card className="bg-gradient-subtle border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Profile Complete!</CardTitle>
              <CardDescription>
                Your profile is fully set up for the best recommendations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              100% Complete
            </Badge>
            <Button variant="outline" size="sm" onClick={onEnhanceProfile}>
              Update Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Enhance Your Profile</CardTitle>
              <CardDescription>
                Get better recommendations by completing your profile
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{completionPercentage}% Complete</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Profile completion</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {missingItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Add these for better recommendations:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {missingItems.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={onEnhanceProfile} className="w-full" size="sm">
          Complete Profile
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
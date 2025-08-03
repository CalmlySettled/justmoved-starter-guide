import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SignUpModal = ({ open, onOpenChange }: SignUpModalProps) => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate("/auth");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Save Your Favorites
          </DialogTitle>
          <DialogDescription>
            Sign up to save your favorite places and get personalized recommendations based on your preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm">Save unlimited favorites</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm">Get location-based recommendations</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm">Personalized suggestions</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm">Quick access across devices</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button onClick={handleSignUp} className="w-full">
              Sign Up Free
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Continue Browsing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
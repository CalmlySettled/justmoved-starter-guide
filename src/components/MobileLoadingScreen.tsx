import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Smartphone } from "lucide-react";

interface MobileLoadingScreenProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  canRetry?: boolean;
  showRetryButton?: boolean;
  type?: 'auth' | 'data' | 'general';
}

export function MobileLoadingScreen({ 
  title = "Loading...", 
  description = "Setting up your experience",
  onRetry,
  canRetry = true,
  showRetryButton = false,
  type = 'general'
}: MobileLoadingScreenProps) {
  
  const getContent = () => {
    switch (type) {
      case 'auth':
        return {
          title: "Connecting...",
          description: "Verifying your account on mobile",
          icon: <Smartphone className="w-8 h-8 text-primary" />
        };
      case 'data':
        return {
          title: "Loading Your Data",
          description: "Fetching your personalized recommendations",
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />
        };
      default:
        return {
          title,
          description,
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {content.icon}
          </div>
          <CardTitle className="text-xl">{content.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground text-sm">
            {content.description}
          </p>
          
          {/* Loading skeletons */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </div>
          
          {showRetryButton && canRetry && onRetry && (
            <div className="pt-4">
              <Button 
                onClick={onRetry} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          )}
          
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Mobile connections may take a moment longer
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
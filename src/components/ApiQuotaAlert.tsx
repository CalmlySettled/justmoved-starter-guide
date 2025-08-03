import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, DollarSign } from "lucide-react";
import { useApiQuotaMonitor } from "@/hooks/useApiQuotaMonitor";

export function ApiQuotaAlert() {
  const { usage, isNearLimit, isAtLimit, percentageUsed } = useApiQuotaMonitor();

  if (!isNearLimit && !isAtLimit) return null;

  return (
    <Alert className={isAtLimit ? "border-destructive" : "border-warning"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium">
            {isAtLimit ? "Daily API limit reached" : "Approaching daily API limit"}
          </p>
          <p className="text-sm text-muted-foreground">
            {usage.requests} of {usage.dailyLimit} requests used today
          </p>
        </div>
        
        <Progress value={percentageUsed} className="w-full" />
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span>Estimated cost: ${usage.costEstimate.toFixed(3)}</span>
        </div>
        
        {isAtLimit && (
          <p className="text-sm">
            Your quota will reset at midnight. Try using cached results or reduce search frequency.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
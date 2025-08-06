import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useRequestCache } from "@/hooks/useRequestCache";

interface APICostStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCost: number;
  savings: number;
}

export function APICostMonitor() {
  const { getCacheStats } = useRequestCache();
  const [stats, setStats] = useState<APICostStats>({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    estimatedCost: 0,
    savings: 0
  });

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('api_cost_stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (error) {
        console.error('Error loading API cost stats:', error);
      }
    }
  }, []);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const cacheStats = getCacheStats();
      const requestCount = parseInt(localStorage.getItem('api_request_count') || '0');
      const cacheHitCount = parseInt(localStorage.getItem('cache_hit_count') || '0');
      const estimatedCost = parseFloat(localStorage.getItem('estimated_api_cost') || '0');
      const estimatedSavings = parseFloat(localStorage.getItem('estimated_savings') || '0');

      const newStats = {
        totalRequests: requestCount,
        cacheHits: cacheHitCount,
        cacheMisses: requestCount - cacheHitCount,
        estimatedCost: estimatedCost,
        savings: estimatedSavings
      };

      setStats(newStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [getCacheStats]);

  const cacheEfficiency = stats.totalRequests > 0 
    ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(1)
    : '0.0';

  const costPerRequest = 0.02; // Average cost per API request

  const resetStats = () => {
    localStorage.removeItem('api_request_count');
    localStorage.removeItem('cache_hit_count');
    localStorage.removeItem('estimated_api_cost');
    localStorage.removeItem('estimated_savings');
    localStorage.removeItem('api_cost_stats');
    
    setStats({
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      estimatedCost: 0,
      savings: 0
    });
  };

  // Only show if there's any activity
  if (stats.totalRequests === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-background to-muted/50 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          API Cost Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalRequests}</div>
            <div className="text-xs text-muted-foreground">Total Requests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.cacheHits}</div>
            <div className="text-xs text-muted-foreground">Cache Hits</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Cache Efficiency:</span>
            <Badge variant={parseFloat(cacheEfficiency) > 70 ? "default" : "destructive"}>
              {cacheEfficiency}%
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Estimated Cost:</span>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">{stats.estimatedCost.toFixed(4)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Savings:</span>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingDown className="h-3 w-3" />
              <span className="font-medium">${stats.savings.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {stats.estimatedCost > 1.0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-yellow-800">
              High API usage detected. Consider reviewing your usage patterns.
            </span>
          </div>
        )}

        <button
          onClick={resetStats}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset Statistics
        </button>
      </CardContent>
    </Card>
  );
}

// Utility functions to track API costs
export const trackAPIRequest = (type: 'api' | 'cache', cost: number = 0.02) => {
  const currentCount = parseInt(localStorage.getItem('api_request_count') || '0');
  const currentCacheHits = parseInt(localStorage.getItem('cache_hit_count') || '0');
  const currentCost = parseFloat(localStorage.getItem('estimated_api_cost') || '0');
  const currentSavings = parseFloat(localStorage.getItem('estimated_savings') || '0');

  if (type === 'api') {
    localStorage.setItem('api_request_count', (currentCount + 1).toString());
    localStorage.setItem('estimated_api_cost', (currentCost + cost).toString());
  } else {
    localStorage.setItem('cache_hit_count', (currentCacheHits + 1).toString());
    localStorage.setItem('estimated_savings', (currentSavings + cost).toString());
  }
};
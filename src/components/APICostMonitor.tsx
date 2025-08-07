import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown, Database, Globe } from 'lucide-react';
import { useRequestCache } from "@/hooks/useRequestCache";
import { supabase } from "@/integrations/supabase/client";

interface APICostStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  estimatedCost: number;
  savings: number;
  businessCacheHits: number;
  businessCacheSavings: number;
  geographicSharing: number;
}

interface CacheStats {
  recommendations_cache: {
    active_entries: number;
    size_bytes: number;
    expired_entries: number;
  };
  business_cache: {
    active_entries: number;
    size_bytes: number;
    expired_entries: number;
  };
  total_size_bytes: number;
}

export function APICostMonitor() {
  const { getCacheStats } = useRequestCache();
  const [stats, setStats] = useState<APICostStats>({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    estimatedCost: 0,
    savings: 0,
    businessCacheHits: 0,
    businessCacheSavings: 0,
    geographicSharing: 0
  });
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

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
    const updateStats = async () => {
      const cacheStatsLocal = getCacheStats();
      const requestCount = parseInt(localStorage.getItem('api_request_count') || '0');
      const cacheHitCount = parseInt(localStorage.getItem('cache_hit_count') || '0');
      const businessCacheHits = parseInt(localStorage.getItem('business_cache_hits') || '0');
      const businessCacheSavings = parseFloat(localStorage.getItem('business_cache_savings') || '0');
      const estimatedCost = parseFloat(localStorage.getItem('estimated_api_cost') || '0');
      const estimatedSavings = parseFloat(localStorage.getItem('estimated_savings') || '0');

      // Fetch database cache stats
      try {
        const { data: dbStats } = await supabase.rpc('get_cache_stats');
        if (dbStats && typeof dbStats === 'object') {
          setCacheStats(dbStats as unknown as CacheStats);
        }
      } catch (error) {
        console.error('Failed to fetch cache stats:', error);
      }

      const newStats = {
        totalRequests: requestCount,
        cacheHits: cacheHitCount,
        cacheMisses: requestCount - cacheHitCount,
        estimatedCost: estimatedCost,
        savings: estimatedSavings + businessCacheSavings,
        businessCacheHits: businessCacheHits,
        businessCacheSavings: businessCacheSavings,
        geographicSharing: Math.max(0, businessCacheHits - cacheHitCount) // Users benefiting from others' cached data
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

  const businessCacheEfficiency = stats.businessCacheHits > 0 
    ? ((stats.businessCacheHits / (stats.businessCacheHits + stats.cacheMisses)) * 100).toFixed(1)
    : '0.0';

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const resetStats = () => {
    localStorage.removeItem('api_request_count');
    localStorage.removeItem('cache_hit_count');
    localStorage.removeItem('business_cache_hits');
    localStorage.removeItem('business_cache_savings');
    localStorage.removeItem('estimated_api_cost');
    localStorage.removeItem('estimated_savings');
    localStorage.removeItem('api_cost_stats');
    
    setStats({
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      estimatedCost: 0,
      savings: 0,
      businessCacheHits: 0,
      businessCacheSavings: 0,
      geographicSharing: 0
    });
  };

  // Only show if there's any activity
  if (stats.totalRequests === 0 && stats.businessCacheHits === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-lg bg-gradient-to-br from-background to-muted/50 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          API Cost Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{stats.totalRequests}</div>
            <div className="text-xs text-muted-foreground">API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{stats.cacheHits}</div>
            <div className="text-xs text-muted-foreground">App Cache</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{stats.businessCacheHits}</div>
            <div className="text-xs text-muted-foreground">DB Cache</div>
          </div>
        </div>

        {/* Cache Efficiency */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm flex items-center gap-1">
              <Globe className="h-3 w-3" />
              App Cache:
            </span>
            <Badge variant={parseFloat(cacheEfficiency) > 70 ? "default" : "destructive"}>
              {cacheEfficiency}%
            </Badge>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm flex items-center gap-1">
              <Database className="h-3 w-3" />
              Business Cache:
            </span>
            <Badge variant={parseFloat(businessCacheEfficiency) > 70 ? "default" : "secondary"}>
              {businessCacheEfficiency}%
            </Badge>
          </div>

          {stats.geographicSharing > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Geographic Sharing:</span>
              <span className="text-sm font-medium text-blue-600">
                +{stats.geographicSharing} saves
              </span>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm">API Cost:</span>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span className="font-medium">{stats.estimatedCost.toFixed(4)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Total Savings:</span>
            <div className="flex items-center gap-1 text-green-600">
              <TrendingDown className="h-3 w-3" />
              <span className="font-medium">${stats.savings.toFixed(4)}</span>
            </div>
          </div>

          {stats.businessCacheSavings > 0 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Business cache saves:</span>
              <span>${stats.businessCacheSavings.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Database Cache Stats */}
        {cacheStats && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground">Database Cache</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium">{cacheStats.recommendations_cache.active_entries}</div>
                <div className="text-muted-foreground">Recommendations</div>
              </div>
              <div>
                <div className="font-medium">{cacheStats.business_cache.active_entries}</div>
                <div className="text-muted-foreground">Businesses</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Total size: {formatBytes(cacheStats.total_size_bytes)}
            </div>
          </div>
        )}

        {stats.estimatedCost > 1.0 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs text-yellow-800 dark:text-yellow-200">
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
export const trackAPIRequest = (type: 'api' | 'cache' | 'business_cache', cost: number = 0.02) => {
  const currentCount = parseInt(localStorage.getItem('api_request_count') || '0');
  const currentCacheHits = parseInt(localStorage.getItem('cache_hit_count') || '0');
  const currentBusinessCacheHits = parseInt(localStorage.getItem('business_cache_hits') || '0');
  const currentCost = parseFloat(localStorage.getItem('estimated_api_cost') || '0');
  const currentSavings = parseFloat(localStorage.getItem('estimated_savings') || '0');
  const currentBusinessSavings = parseFloat(localStorage.getItem('business_cache_savings') || '0');

  if (type === 'api') {
    localStorage.setItem('api_request_count', (currentCount + 1).toString());
    localStorage.setItem('estimated_api_cost', (currentCost + cost).toString());
  } else if (type === 'cache') {
    localStorage.setItem('cache_hit_count', (currentCacheHits + 1).toString());
    localStorage.setItem('estimated_savings', (currentSavings + cost).toString());
  } else if (type === 'business_cache') {
    localStorage.setItem('business_cache_hits', (currentBusinessCacheHits + 1).toString());
    localStorage.setItem('business_cache_savings', (currentBusinessSavings + cost).toString());
  }
};
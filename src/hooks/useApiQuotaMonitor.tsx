import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface ApiUsage {
  requests: number;
  dailyLimit: number;
  resetTime: string;
  costEstimate: number;
}

export function useApiQuotaMonitor() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<ApiUsage>({
    requests: 0,
    dailyLimit: 100,
    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    costEstimate: 0
  });

  useEffect(() => {
    if (!user) return;

    // Load usage from localStorage
    const savedUsage = localStorage.getItem(`api_usage_${user.id}`);
    if (savedUsage) {
      try {
        const parsed = JSON.parse(savedUsage);
        const resetTime = new Date(parsed.resetTime);
        
        // Reset if past reset time
        if (Date.now() > resetTime.getTime()) {
          const newResetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          setUsage({
            ...parsed,
            requests: 0,
            resetTime: newResetTime.toISOString(),
            costEstimate: 0
          });
        } else {
          setUsage(parsed);
        }
      } catch (error) {
        console.error('Error parsing saved API usage:', error);
      }
    }
  }, [user]);

  const trackApiCall = (callType: 'search' | 'photo' | 'details' = 'search') => {
    if (!user) return;

    const costs = {
      search: 0.017, // Nearby Search with fields
      photo: 0.007,  // Photo request
      details: 0.017 // Place Details
    };

    setUsage(prev => {
      const newUsage = {
        ...prev,
        requests: prev.requests + 1,
        costEstimate: prev.costEstimate + costs[callType]
      };

      // Save to localStorage
      localStorage.setItem(`api_usage_${user.id}`, JSON.stringify(newUsage));
      
      return newUsage;
    });
  };

  const isNearLimit = usage.requests / usage.dailyLimit > 0.8;
  const isAtLimit = usage.requests >= usage.dailyLimit;

  return {
    usage,
    trackApiCall,
    isNearLimit,
    isAtLimit,
    percentageUsed: Math.min((usage.requests / usage.dailyLimit) * 100, 100)
  };
}
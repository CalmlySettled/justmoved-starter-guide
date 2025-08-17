import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionStatus {
  status: 'trial' | 'active' | 'canceled' | 'loading';
  trial_end_date?: string;
  current_period_end?: string;
  properties_count: number;
  max_properties: number; // -1 means unlimited
  can_create_properties: boolean;
  is_trial_expired: boolean;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    status: 'loading',
    properties_count: 0,
    max_properties: 1,
    can_create_properties: false,
    is_trial_expired: false,
    loading: true,
    error: null,
  });

  const checkSubscriptionStatus = useCallback(async () => {
    if (!user) {
      setSubscription(prev => ({ ...prev, loading: false, error: 'User not authenticated' }));
      return;
    }

    try {
      setSubscription(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription-status');
      
      if (error) throw error;
      
      setSubscription({
        status: data.status,
        trial_end_date: data.trial_end_date,
        current_period_end: data.current_period_end,
        properties_count: data.properties_count,
        max_properties: data.max_properties,
        can_create_properties: data.can_create_properties,
        is_trial_expired: data.is_trial_expired,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setSubscription(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription status',
      }));
    }
  }, [user]);

  const startSubscription = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout');
      
      if (error) throw error;
      
      // Open Stripe checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating subscription checkout:', error);
      toast({
        title: "Subscription Error",
        description: error instanceof Error ? error.message : 'Failed to start subscription process.',
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const manageSubscription = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to manage your subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription');
      
      if (error) throw error;
      
      // Open Stripe customer portal in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      toast({
        title: "Management Error",
        description: error instanceof Error ? error.message : 'Failed to open subscription management.',
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const canCreateProperty = useCallback(() => {
    if (subscription.status === 'active') return true;
    if (subscription.status === 'trial' && !subscription.is_trial_expired) {
      return subscription.properties_count < subscription.max_properties;
    }
    return false;
  }, [subscription]);

  const getSubscriptionMessage = useCallback(() => {
    if (subscription.status === 'loading') return 'Checking subscription status...';
    if (subscription.status === 'active') return `Active subscription - ${subscription.properties_count} properties`;
    if (subscription.status === 'trial' && !subscription.is_trial_expired) {
      const trialEnd = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
      return `Free trial - ${subscription.properties_count}/${subscription.max_properties} properties (${daysLeft} days left)`;
    }
    if (subscription.is_trial_expired) return 'Trial expired - Subscribe to add properties';
    return 'No active subscription';
  }, [subscription]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  return {
    subscription,
    checkSubscriptionStatus,
    startSubscription,
    manageSubscription,
    canCreateProperty,
    getSubscriptionMessage,
  };
};
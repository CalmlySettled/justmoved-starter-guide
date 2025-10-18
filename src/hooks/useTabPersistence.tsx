import { useEffect, useCallback, useMemo } from 'react';

interface TabPersistenceOptions {
  key: string;
  data: any;
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export const useTabPersistence = ({ key, data, enabled = true, ttl }: TabPersistenceOptions) => {
  // Load initial state synchronously
  const initialState = useMemo(() => {
    if (!enabled) return null;

    try {
      const saved = sessionStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Check TTL if provided
      if (ttl && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp;
        if (age > ttl) {
          sessionStorage.removeItem(key);
          return null;
        }
      }

      return parsed.data || parsed;
    } catch (error) {
      console.error('Failed to load initial tab state:', error);
      return null;
    }
  }, [key, enabled, ttl]);

  // Auto-save to sessionStorage
  useEffect(() => {
    if (!enabled || !data) return;

    const saveTimeout = setTimeout(() => {
      try {
        const toSave = ttl ? { data, timestamp: Date.now() } : data;
        sessionStorage.setItem(key, JSON.stringify(toSave));
      } catch (error) {
        console.error('Failed to save tab state:', error);
      }
    }, 500); // Debounce saves

    return () => clearTimeout(saveTimeout);
  }, [key, data, enabled, ttl]);

  // Load from sessionStorage
  const loadState = useCallback(() => {
    if (!enabled) return null;

    try {
      const saved = sessionStorage.getItem(key);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Check TTL if provided
      if (ttl && parsed.timestamp) {
        const age = Date.now() - parsed.timestamp;
        if (age > ttl) {
          sessionStorage.removeItem(key);
          return null;
        }
      }

      return parsed.data || parsed;
    } catch (error) {
      console.error('Failed to load tab state:', error);
      return null;
    }
  }, [key, enabled, ttl]);

  // Clear sessionStorage
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear tab state:', error);
    }
  }, [key]);

  return { loadState, clearState, initialState };
};

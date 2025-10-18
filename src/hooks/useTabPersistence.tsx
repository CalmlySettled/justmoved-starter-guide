import { useEffect, useCallback } from 'react';

interface TabPersistenceOptions {
  key: string;
  data: any;
  enabled?: boolean;
}

export const useTabPersistence = ({ key, data, enabled = true }: TabPersistenceOptions) => {
  // Auto-save to sessionStorage
  useEffect(() => {
    if (!enabled || !data) return;

    const saveTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save tab state:', error);
      }
    }, 500); // Debounce saves

    return () => clearTimeout(saveTimeout);
  }, [key, data, enabled]);

  // Load from sessionStorage
  const loadState = useCallback(() => {
    if (!enabled) return null;

    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load tab state:', error);
      return null;
    }
  }, [key, enabled]);

  // Clear sessionStorage
  const clearState = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear tab state:', error);
    }
  }, [key]);

  return { loadState, clearState };
};

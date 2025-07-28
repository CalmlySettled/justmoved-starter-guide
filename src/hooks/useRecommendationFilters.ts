import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { filterRecommendations, FilterOptions, FilterResult } from '@/utils/filterRecommendations';

export function useRecommendationFilters() {
  const [loading, setLoading] = useState<{[category: string]: boolean}>({});
  const [activeFilters, setActiveFilters] = useState<{[category: string]: string[]}>({});
  const [filteredResults, setFilteredResults] = useState<{[category: string]: any[]}>({});
  const [additionalResults, setAdditionalResults] = useState<{[category: string]: number}>({});
  const { toast } = useToast();

  const applyFilter = useCallback(async (
    userId: string,
    category: string,
    filter: string,
    currentFilters: string[] = []
  ) => {
    const isRemoving = currentFilters.includes(filter);
    const newFilters = isRemoving 
      ? currentFilters.filter(f => f !== filter)
      : [...currentFilters, filter];

    setActiveFilters(prev => ({
      ...prev,
      [category]: newFilters
    }));

    if (newFilters.length === 0) {
      // Clear all filters for this category
      setFilteredResults(prev => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
      setAdditionalResults(prev => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
      return;
    }

    setLoading(prev => ({ ...prev, [category]: true }));

    try {
      const result = await filterRecommendations({
        userId,
        category,
        filters: newFilters,
        sortBy: 'relevance'
      });

      setFilteredResults(prev => ({
        ...prev,
        [category]: result.recommendations
      }));

      setAdditionalResults(prev => ({
        ...prev,
        [category]: result.additionalResults
      }));

      if (result.additionalResults > 0) {
        toast({
          title: "Filter Applied",
          description: `Found ${result.totalCount} matching options, showing ${result.additionalResults} additional results.`,
        });
      }

    } catch (error) {
      console.error('Error applying filter:', error);
      toast({
        title: "Filter Error",
        description: "Could not apply filter. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, [category]: false }));
    }
  }, [toast]);

  const clearAllFilters = useCallback((category: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: []
    }));
    setFilteredResults(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
    setAdditionalResults(prev => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  }, []);

  return {
    loading,
    activeFilters,
    filteredResults,
    additionalResults,
    applyFilter,
    clearAllFilters
  };
}
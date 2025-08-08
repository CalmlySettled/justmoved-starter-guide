import { useState, useEffect } from 'react';

interface MoveInProgress {
  [category: string]: boolean;
}

export const useMoveInProgress = () => {
  const [progress, setProgress] = useState<MoveInProgress>({});

  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('moveInProgress');
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.error('Error loading move-in progress:', error);
      }
    }
  }, []);

  // Save to localStorage whenever progress changes
  useEffect(() => {
    localStorage.setItem('moveInProgress', JSON.stringify(progress));
  }, [progress]);

  const markComplete = (category: string) => {
    setProgress(prev => ({ ...prev, [category]: true }));
  };

  const markIncomplete = (category: string) => {
    setProgress(prev => ({ ...prev, [category]: false }));
  };

  const isComplete = (category: string): boolean => {
    return progress[category] || false;
  };

  const getPhaseProgress = (categories: string[]): { completed: number; total: number; percentage: number } => {
    const completed = categories.filter(cat => isComplete(cat)).length;
    const total = categories.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const clearProgress = () => {
    setProgress({});
    localStorage.removeItem('moveInProgress');
  };

  return {
    markComplete,
    markIncomplete,
    isComplete,
    getPhaseProgress,
    clearProgress,
    progress
  };
};
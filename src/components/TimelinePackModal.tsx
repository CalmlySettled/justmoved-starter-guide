import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMoveInProgress } from '@/hooks/useMoveInProgress';
import { useToast } from '@/hooks/use-toast';

interface Category {
  name: string;
  displayName: string;
}

interface TimelinePack {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  categories: Category[];
}

interface TimelinePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: TimelinePack | null;
  onCategorySelect: (categoryName: string) => void;
}

export const TimelinePackModal: React.FC<TimelinePackModalProps> = ({
  isOpen,
  onClose,
  pack,
  onCategorySelect,
}) => {
  const moveProgress = useMoveInProgress();
  const { toast } = useToast();

  if (!pack) return null;

  const phaseProgress = moveProgress.getPhaseProgress(pack.categories.map(cat => cat.name));
  const isPhaseComplete = phaseProgress.percentage === 100;

  const handleCategoryToggle = (category: Category) => {
    const isCurrentlyComplete = moveProgress.isComplete(category.name);
    
    if (isCurrentlyComplete) {
      moveProgress.markIncomplete(category.name);
    } else {
      moveProgress.markComplete(category.name);
      toast({
        title: "Progress saved!",
        description: `Marked ${category.displayName} as complete`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-section">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pack.icon}</span>
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {pack.title}
                  {isPhaseComplete && (
                    <span className="text-green-500">
                      <Check className="h-6 w-6" />
                    </span>
                  )}
                </DialogTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  {pack.description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Phase Progress</span>
              <span className="text-sm text-muted-foreground">
                {phaseProgress.completed}/{phaseProgress.total} completed
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${phaseProgress.percentage}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pack.categories.map((category) => {
              const isComplete = moveProgress.isComplete(category.name);
              
              return (
                <Card 
                  key={category.name} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isComplete ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={`font-medium ${isComplete ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {category.displayName}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCategoryToggle(category)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            isComplete 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-muted hover:border-primary'
                          }`}
                        >
                          {isComplete && <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => onCategorySelect(category.name)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Find {category.displayName}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
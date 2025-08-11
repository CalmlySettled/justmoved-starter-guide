import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Sparkles } from 'lucide-react';

interface SurveyQuestion {
  id: string;
  question_key: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text';
  options: string[];
  category: string;
}

interface MicroSurveyModalProps {
  open: boolean;
  question: SurveyQuestion | null;
  onSubmit: (answer: string | string[]) => void;
  onDismiss: () => void;
  isSubmitting?: boolean;
}

export const MicroSurveyModal: React.FC<MicroSurveyModalProps> = ({
  open,
  question,
  onSubmit,
  onDismiss,
  isSubmitting = false
}) => {
  const [singleChoice, setSingleChoice] = useState<string>('');
  const [multipleChoices, setMultipleChoices] = useState<string[]>([]);

  if (!question) return null;

  const handleSubmit = () => {
    if (question.question_type === 'single_choice') {
      if (singleChoice) {
        onSubmit(singleChoice);
        setSingleChoice('');
      }
    } else if (question.question_type === 'multiple_choice') {
      if (multipleChoices.length > 0) {
        onSubmit(multipleChoices);
        setMultipleChoices([]);
      }
    }
  };

  const handleMultipleChoiceChange = (option: string, checked: boolean) => {
    if (checked) {
      setMultipleChoices(prev => [...prev, option]);
    } else {
      setMultipleChoices(prev => prev.filter(item => item !== option));
    }
  };

  const canSubmit = question.question_type === 'single_choice' 
    ? !!singleChoice 
    : multipleChoices.length > 0;

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">
              Help us personalize your experience
            </DialogTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-6 w-6"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          <p className="text-foreground font-medium">
            {question.question_text}
          </p>
          
          {question.question_type === 'single_choice' && (
            <RadioGroup value={singleChoice} onValueChange={setSingleChoice}>
              <div className="space-y-3">
                {question.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label 
                      htmlFor={option} 
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
          
          {question.question_type === 'multiple_choice' && (
            <div className="space-y-3">
              {question.options.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={option}
                    checked={multipleChoices.includes(option)}
                    onCheckedChange={(checked) => 
                      handleMultipleChoiceChange(option, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={option} 
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onDismiss}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Submit'}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            This helps us show you more relevant recommendations
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
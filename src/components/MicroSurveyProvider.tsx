import React, { createContext, useContext, useCallback } from 'react';
import { useMicroSurvey } from '@/hooks/useMicroSurvey';
import { MicroSurveyModal } from './MicroSurveyModal';

interface MicroSurveyContextType {
  triggerSurveyCheck: (eventType: string, eventData: Record<string, any>) => void;
}

const MicroSurveyContext = createContext<MicroSurveyContextType | undefined>(undefined);

export const useMicroSurveyContext = () => {
  const context = useContext(MicroSurveyContext);
  if (!context) {
    throw new Error('useMicroSurveyContext must be used within MicroSurveyProvider');
  }
  return context;
};

interface MicroSurveyProviderProps {
  children: React.ReactNode;
}

export const MicroSurveyProvider: React.FC<MicroSurveyProviderProps> = ({ children }) => {
  const {
    currentQuestion,
    showSurvey,
    isSubmitting,
    checkForSurveyTrigger,
    submitSurveyResponse,
    dismissSurvey
  } = useMicroSurvey();

  const triggerSurveyCheck = useCallback((eventType: string, eventData: Record<string, any>) => {
    // Add small delay to ensure the user action feels complete
    setTimeout(() => {
      checkForSurveyTrigger(eventType, eventData);
    }, 500);
  }, [checkForSurveyTrigger]);

  return (
    <MicroSurveyContext.Provider value={{ triggerSurveyCheck }}>
      {children}
      <MicroSurveyModal
        open={showSurvey}
        question={currentQuestion}
        onSubmit={submitSurveyResponse}
        onDismiss={dismissSurvey}
        isSubmitting={isSubmitting}
      />
    </MicroSurveyContext.Provider>
  );
};
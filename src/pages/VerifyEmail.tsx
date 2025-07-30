import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Home, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  
  useEffect(() => {
    // Detect mobile
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(isMobileDevice);
    console.log('Mobile Debug: VerifyEmail - Mobile device detected:', isMobileDevice);
  }, []);
  
  useEffect(() => {
    const handleVerification = async () => {
      console.log('Mobile Debug: VerifyEmail - Starting verification process');
      
      // Check if verification was successful by looking for auth changes
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('Mobile Debug: VerifyEmail - Session check:', session);
          
            if (session?.user) {
              console.log('Mobile Debug: VerifyEmail - User verified successfully');
              setVerificationStatus('success');
              
              // Check if there's saved quiz data to process
              const savedQuizData = localStorage.getItem('onboardingQuizData');
              console.log('Mobile Debug: VerifyEmail - Saved quiz data found:', !!savedQuizData);
              
              if (savedQuizData) {
                // Mark that user should be redirected to dashboard with quiz processing
                localStorage.setItem('pendingQuizProcessing', 'true');
              }
              
              // Mobile-specific handling
              if (isMobile) {
                console.log('Mobile Debug: VerifyEmail - Mobile redirect with delay');
                setTimeout(() => {
                  navigate('/dashboard', { replace: true });
                }, 2000);
              } else {
                // Desktop handling
                if (window.opener) {
                  try {
                    window.opener.postMessage({ type: 'EMAIL_VERIFIED' }, window.location.origin);
                    window.opener.focus();
                    setTimeout(() => window.close(), 1000);
                  } catch (error) {
                    console.log('Cannot communicate with opener, redirecting normally');
                    setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
                  }
                } else {
                  setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
                }
              }
          } else {
            console.log('Mobile Debug: VerifyEmail - No session found, checking URL params');
            // Check URL parameters for verification tokens
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');
            
            if (error) {
              console.error('Mobile Debug: VerifyEmail - URL error:', error, errorDescription);
              setVerificationStatus('failed');
              setTimeout(() => navigate('/auth', { replace: true }), 3000);
            } else {
              // Give more time for mobile auth to process
              setTimeout(() => {
                navigate('/dashboard', { replace: true });
              }, isMobile ? 3000 : 2000);
            }
          }
        } catch (error) {
          console.error('Mobile Debug: VerifyEmail - Error checking session:', error);
          setVerificationStatus('failed');
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
        }
      }, 1000);
    };

    handleVerification();
  }, [navigate, searchParams, isMobile]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-elegant border-border/50">
        <CardHeader>
          <div className="mx-auto mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-soft">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email Verified!</CardTitle>
          <CardDescription>
            Your email has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verificationStatus === 'checking' && (
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying your email...</span>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Redirecting to dashboard...</span>
            </div>
          )}
          
          {verificationStatus === 'failed' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Verification failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The email link may have expired or been used already.
              </p>
              <Button onClick={() => navigate('/auth')} variant="outline">
                Return to Sign In
              </Button>
            </div>
          )}
          
          {isMobile && verificationStatus === 'success' && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 text-center">
                Mobile verification may take a moment longer to complete
              </p>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
              <Home className="h-4 w-4" />
              <span>CalmlySettled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
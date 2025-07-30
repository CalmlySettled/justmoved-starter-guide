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
      console.log('VerifyEmail: Starting verification process');
      
      try {
        // Listen for auth state changes first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('VerifyEmail: Auth state changed:', event, !!session);
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('VerifyEmail: User verified and signed in');
            setVerificationStatus('success');
            
            // Don't set pendingQuizProcessing flag here - let Auth.tsx handle it
            // This prevents duplicate processing
            
            // Redirect after short delay
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
            
            // Clean up subscription
            subscription.unsubscribe();
          }
        });
        
        // Also check for existing session after a brief delay
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          console.log('VerifyEmail: Session check result:', !!session);
          
          if (session?.user) {
            console.log('VerifyEmail: User already verified');
            setVerificationStatus('success');
            
            // Don't set pendingQuizProcessing flag here - let Auth.tsx handle it
            
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1500);
          } else {
            // Check for URL errors
            const error = searchParams.get('error');
            if (error) {
              console.error('VerifyEmail: URL error:', error);
              setVerificationStatus('failed');
            } else {
              // Still checking - give it more time
              setTimeout(async () => {
                const { data: { session: laterSession } } = await supabase.auth.getSession();
                if (!laterSession?.user) {
                  console.log('VerifyEmail: No session found after extended wait');
                  setVerificationStatus('failed');
                }
              }, 3000);
            }
          }
        }, 1000);
        
        // Cleanup function
        return () => {
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error('VerifyEmail: Error in verification process:', error);
        setVerificationStatus('failed');
      }
    };

    handleVerification();
  }, [navigate, searchParams]);

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
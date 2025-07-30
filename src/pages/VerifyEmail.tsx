import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Home } from "lucide-react";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // If this page was opened in a new tab from email, close it and focus original tab
    if (window.opener) {
      // Try to send a message to the original tab
      try {
        window.opener.postMessage({ type: 'EMAIL_VERIFIED' }, window.location.origin);
        window.opener.focus();
        
        // Close this tab after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
      } catch (error) {
        // If we can't communicate with opener, just redirect normally
        console.log('Cannot communicate with opener, redirecting normally');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } else {
      // This is the original tab, redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [navigate]);

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
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting to dashboard...</span>
          </div>
          
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
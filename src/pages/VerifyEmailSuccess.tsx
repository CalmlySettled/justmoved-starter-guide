import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VerifyEmailSuccess() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsRedirecting(true);
          toast.success('Email verified successfully!');
          
          // Check if user has profile data (indicating they've completed onboarding)
          const { data: profile } = await supabase
            .from('profiles')
            .select('priorities, address')
            .eq('user_id', session.user.id)
            .single();

          setTimeout(() => {
            if (profile?.priorities && profile?.address) {
              navigate('/dashboard');
            } else {
              navigate('/onboarding');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSessionAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your email has been successfully verified. Welcome to CalmlySettled!
          </p>
          
          {isRedirecting ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Redirecting...</span>
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            CalmlySettled - Find Your Perfect Community
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
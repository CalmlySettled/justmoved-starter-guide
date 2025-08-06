import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Eye, EyeOff } from "lucide-react";

// Create a separate Supabase client that doesn't auto-handle auth URLs
const resetClient = createClient(
  "https://ghbnvodnnxgxkiufcael.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoYm52b2RubnhneGtpdWZjYWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4ODQ4MzEsImV4cCI6MjA2ODQ2MDgzMX0.zxcaTXyNmZO2-YbKiiNeNv1xTfnR2Jp9k-P4JqFgOa0",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false, // This is key - prevents auto URL processing
    }
  }
);

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validTokens, setValidTokens] = useState(false);
  const [storedTokens, setStoredTokens] = useState<{accessToken: string, refreshToken: string} | null>(null);
  const navigate = useNavigate();
  

  useEffect(() => {
    console.log('ResetPassword page loaded');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    // Extract tokens from URL before Supabase can process them
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    
    console.log('Extracted tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
    
    if (accessToken && refreshToken && type === 'recovery') {
      console.log('Valid reset tokens found - setting validTokens to true');
      setValidTokens(true);
      // Store tokens before clearing URL
      setStoredTokens({ accessToken, refreshToken });
      
      // Clear the URL to prevent Supabase from auto-processing
      console.log('Clearing URL parameters');
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('URL after clearing:', window.location.href);
    } else {
      console.log('No valid reset tokens found, redirecting to auth');
      navigate('/auth');
    }
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      // Toast notification removed per user request
      return;
    }

    if (password.length < 6) {
      // Toast notification removed per user request
      return;
    }

    setLoading(true);

    try {
      console.log('Starting password reset with stored tokens:', !!storedTokens);
      
      if (!storedTokens) {
        throw new Error('Reset tokens not found - session may have expired');
      }

      console.log('Setting session with stored tokens using resetClient');
      // Use the special reset client that doesn't auto-process URLs
      const { data: sessionData, error: sessionError } = await resetClient.auth.setSession({
        access_token: storedTokens.accessToken,
        refresh_token: storedTokens.refreshToken,
      });

      console.log('Session set result:', { sessionData: !!sessionData, error: sessionError });

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }

      console.log('Updating password');
      // Now update the password using the same client
      const { error: updateError } = await resetClient.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      // Toast notification removed per user request

      // Redirect to explore page
      navigate("/explore");
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      // Toast notification removed per user request
    } finally {
      setLoading(false);
    }
  };

  if (!validTokens) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
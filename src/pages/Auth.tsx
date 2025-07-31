import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Eye, EyeOff } from "lucide-react";
import { sanitizeInput, displayNameSchema, emailSchema, passwordSchema, logSecurityEvent } from "@/lib/security";

// Declare global gtag function for Google Ads conversion tracking
declare global {
  function gtag(...args: any[]): void;
}

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resetTokens, setResetTokens] = useState<{accessToken: string, refreshToken: string} | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check URL parameters for password reset FIRST
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    
    const isPasswordReset = accessToken && refreshToken && type === 'recovery';
    
    // If this is a password reset link, set up the reset password state
    if (isPasswordReset) {
      console.log('Password reset detected, storing tokens and setting reset state');
      setIsResetPassword(true);
      setIsForgotPassword(false);
      setIsSignUp(false);
      
      // Store tokens temporarily - don't set session until password is reset
      setResetTokens({ accessToken, refreshToken });
      
      // Don't run any other auth checks - just return
      return;
    }

    // Only run normal auth checks if NOT in password reset mode
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Listen for auth changes - but skip if in password reset mode
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'Session:', !!session);
        
        // Skip all navigation if we're in password reset mode
        if (isPasswordReset) {
          console.log('Skipping auth navigation - in password reset mode');
          return;
        }
        
        if (session) {
          // Check if there's completed quiz data in localStorage (user took quiz before signup)
          const storedQuizData = localStorage.getItem('onboardingQuizData');
          console.log('Auth state change - checking for stored quiz data:', storedQuizData);
          console.log('Session user ID:', session?.user?.id);
          
          if (storedQuizData) {
            try {
              const quizData = JSON.parse(storedQuizData);
              console.log('Mobile Debug: Parsed quiz data:', quizData);
              
              if (quizData.address && quizData.priorities && quizData.priorities.length > 0) {
                console.log('Mobile Debug: Valid quiz data found, setting up for processing on dashboard...');
                
                // Just set the flag for dashboard to process - don't process here to avoid race conditions
                localStorage.setItem('pendingQuizProcessing', 'true');
                console.log('Auth: Set pendingQuizProcessing flag for dashboard to handle');
                
                navigate("/dashboard");
                return;
              }
            } catch (error) {
              console.error('Error parsing stored quiz data:', error);
            }
          }
          
          // Check if user has completed onboarding in Supabase
          console.log('Mobile Debug: Checking if user has profile data...');
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('address, priorities')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            console.log('Mobile Debug: Profile data:', profile, 'Error:', profileError);
            
            // If they have profile data, go to dashboard, otherwise onboarding
            if (profile?.address && profile?.priorities && profile?.priorities.length > 0) {
              console.log('Mobile Debug: User has profile data, navigating to dashboard');
              navigate("/dashboard");
            } else {
              console.log('Mobile Debug: User has no profile data, navigating to onboarding');
              navigate("/onboarding");
            }
          } catch (error) {
            console.error('Mobile Debug: Error checking profile:', error);
            navigate("/onboarding");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate and sanitize inputs
        if (!email || !password || !displayName) {
          toast({
            title: "Error",
            description: "Please fill in all fields",
            variant: "destructive",
          });
          return;
        }

        // Security validation
        try {
          emailSchema.parse(email);
          passwordSchema.parse(password);
          displayNameSchema.parse(displayName);
        } catch (validationError: any) {
          await logSecurityEvent('Invalid input attempt', {
            email: email.substring(0, 5) + '***',
            error: validationError.message
          });
          
          toast({
            title: "Invalid input",
            description: validationError.errors?.[0]?.message || "Please check your input",
            variant: "destructive",
          });
          return;
        }

        const sanitizedDisplayName = sanitizeInput(displayName);

        // Check if user has quiz data to determine redirect URL
        const hasQuizData = localStorage.getItem('onboardingQuizData');
        const redirectUrl = hasQuizData 
          ? `${window.location.origin}/verify-email`
          : `${window.location.origin}/verify-email`;
        
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: sanitizedDisplayName
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account already exists",
              description: "An account with this email already exists. Try signing in instead.",
              variant: "destructive"
            });
          } else {
            await logSecurityEvent('Sign up failed', { error: error.message });
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive"
            });
          }
        } else if (data.user && !data.session) {
          // User was created but needs email verification
          // Supabase will automatically trigger our custom webhook email
          toast({
            title: "Account created!",
            description: "Please check your email (including spam folder) for a verification link to complete your registration."
          });
          setShowResendButton(true);
          
          // Track Google Ads conversion for signup
          if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {'send_to': 'AW-17410195791/Q2gnCPfp_fsaEM-C6u1A'});
          }
        } else {
          // User was created and auto-confirmed
          toast({
            title: "Account created!",
            description: "Welcome! You're now signed in."
          });
          
          // Track Google Ads conversion for signup
          if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {'send_to': 'AW-17410195791/Q2gnCPfp_fsaEM-C6u1A'});
          }
        }
      } else {
        // Sign in validation
        try {
          emailSchema.parse(email);
        } catch (validationError: any) {
          toast({
            title: "Invalid email format",
            description: "Please enter a valid email address",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (error) {
          await logSecurityEvent('Sign in failed', { 
            email: email.substring(0, 5) + '***',
            error: error.message 
          });

          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Invalid credentials",
              description: "Please check your email and password and try again.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Sign in failed",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      }
    } catch (error) {
      await logSecurityEvent('Auth error', { error: String(error) });
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setResendLoading(true);
    try {
      // Use Supabase's resend method - this will trigger our webhook to send custom email
      const hasQuizData = localStorage.getItem('onboardingQuizData');
      const redirectUrl = hasQuizData 
        ? `${window.location.origin}/verify-email`
        : `${window.location.origin}/verify-email`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your email (including spam folder) for the verification link."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset email sent!",
          description: "Check your email for a password reset link.",
        });
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetTokens) {
      toast({
        title: "Error",
        description: "Reset session expired. Please request a new password reset link.",
        variant: "destructive"
      });
      return;
    }
    
    if (!password || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in both password fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate password strength
    try {
      passwordSchema.parse(password);
    } catch (validationError: any) {
      toast({
        title: "Invalid password",
        description: validationError.errors?.[0]?.message || "Please choose a stronger password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, set the session with the stored tokens
      console.log('Setting session with stored tokens for password reset');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: resetTokens.accessToken,
        refresh_token: resetTokens.refreshToken
      });

      if (sessionError) {
        console.error('Failed to set session:', sessionError);
        toast({
          title: "Error",
          description: "Reset session expired. Please request a new password reset link.",
          variant: "destructive"
        });
        return;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password updated!",
          description: "Your password has been successfully changed. You're now signed in."
        });
        
        // Clear the reset tokens and state
        setResetTokens(null);
        setIsResetPassword(false);
        
        // Navigate to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate("/")}
            className="inline-flex items-center space-x-2 mb-4 hover:opacity-80 transition-smooth cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">CalmlySettled</span>
          </button>
          <p className="text-muted-foreground">Welcome to your neighborhood guide</p>
        </div>

        <Card className="shadow-elegant border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isResetPassword ? "Set New Password" : (isForgotPassword ? "Reset Password" : (isSignUp ? "Create Account" : "Welcome Back"))}
            </CardTitle>
            <CardDescription>
              {isResetPassword 
                ? "Enter your new password below"
                : (isForgotPassword 
                  ? "Enter your email to receive a password reset link"
                  : (isSignUp 
                    ? "Sign up to get personalized neighborhood recommendations" 
                    : "Sign in to access your personalized recommendations"
                  )
                )
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
                </Button>
              </form>
            )}
            
            {showResendButton && isSignUp && !isForgotPassword && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="mobile"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            )}
            
            {!isForgotPassword && !isResetPassword && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setShowResendButton(false);
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                >
                  {isSignUp 
                    ? "Already have an account? Sign in" 
                    : "Don't have an account? Sign up"
                  }
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
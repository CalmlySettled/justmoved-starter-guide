import { toast } from "@/utils/notificationRemover";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Eye, EyeOff } from "lucide-react";
import { sanitizeInput, displayNameSchema, emailSchema, passwordSchema, logSecurityEvent } from "@/lib/security";
import { Separator } from "@/components/ui/separator";
import heroImage from "@/assets/hero-lifestyle.jpg";


export default function Auth() {
  // Check URL params to determine initial state
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup'); // Show signup if mode=signup in URL
  
  // Check if this is a property manager route
  const isPropertyManagerRoute = window.location.pathname.includes('property-manager');
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
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigate = useNavigate();


  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if user is a property manager
          const { data: hasRole } = await supabase.rpc('has_role', {
            _user_id: session.user.id,
            _role: 'property_manager'
          });
          
          if (hasRole || isPropertyManagerRoute) {
            navigate("/property-manager");
            return;
          }
          
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          const oauth = urlParams.get('oauth');
          const focus = urlParams.get('focus');
          
          // Build redirect URL with preserved parameters
          let redirectUrl = "/explore"; // Default
          if (redirect === 'popular') {
            redirectUrl = "/popular";
          }
          
          // Preserve OAuth and focus parameters for proper mobile flow
          const params = new URLSearchParams();
          if (oauth) params.set('oauth', oauth);
          if (focus) params.set('focus', focus);
          if (redirect) params.set('redirect', redirect);
          
          const queryString = params.toString();
          const finalUrl = queryString ? `${redirectUrl}?${queryString}` : redirectUrl;
          
          navigate(finalUrl);
        }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AUTH STATE CHANGE:', { event, hasSession: !!session, isPropertyManagerRoute });
        
        if (session) {
          console.log('🟡 AUTH - Session detected, checking redirect...');
          
          // For SIGNED_IN events from property manager route, prioritize route context
          const isSignupEvent = event === 'SIGNED_IN';
          const signupSource = session.user?.user_metadata?.signup_source;
          
          console.log('🔍 AUTH - Context:', { 
            isSignupEvent, 
            signupSource, 
            isPropertyManagerRoute,
            userMetadata: session.user?.user_metadata 
          });
          
          // Check if this is a property manager signup/signin
          const shouldRedirectToPM = isPropertyManagerRoute || signupSource === 'property_manager';
          
          if (shouldRedirectToPM) {
            console.log('🟡 AUTH - Property manager context detected, attempting role verification with retry...');
            
            // For new signups, add a small delay to allow database to commit
            if (isSignupEvent) {
              console.log('⏳ AUTH - New signup detected, adding delay for DB commit...');
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Retry role check with exponential backoff
            let hasRole = false;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts && !hasRole) {
              attempts++;
              console.log(`🔄 AUTH - Role check attempt ${attempts}/${maxAttempts}`);
              
              try {
                const { data: roleData, error: roleError } = await supabase.rpc('has_role', {
                  _user_id: session.user.id,
                  _role: 'property_manager'
                });
                
                if (roleError) {
                  console.error('🚫 AUTH - Role check error:', roleError);
                } else {
                  hasRole = roleData || false;
                  console.log('✅ AUTH - Role check result:', hasRole);
                }
                
                if (!hasRole && attempts < maxAttempts) {
                  // Wait before retry (exponential backoff: 1s, 2s, 4s)
                  const delay = Math.pow(2, attempts - 1) * 1000;
                  console.log(`⏳ AUTH - Waiting ${delay}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              } catch (error) {
                console.error('🚫 AUTH - Role check exception:', error);
              }
            }
            
            // If we have role or this is clearly a PM route, redirect to PM dashboard
            if (hasRole || shouldRedirectToPM) {
              console.log('🎯 AUTH - Redirecting to property manager dashboard');
              navigate("/property-manager");
              return;
            } else {
              console.warn('⚠️ AUTH - Role check failed but PM context detected. Redirecting anyway.');
              navigate("/property-manager");
              return;
            }
          }
          
          // Regular user flow
          console.log('👤 AUTH - Regular user flow, checking redirect params...');
          
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get('redirect');
          const oauth = urlParams.get('oauth');
          const focus = urlParams.get('focus');
          
          // Build redirect URL with preserved parameters
          let redirectUrl = "/explore"; // Default
          if (redirect === 'popular') {
            redirectUrl = "/popular";
          }
          
          // Preserve OAuth and focus parameters for proper mobile flow
          const params = new URLSearchParams();
          if (oauth) params.set('oauth', oauth);
          if (focus) params.set('focus', focus);
          if (redirect) params.set('redirect', redirect);
          
          const queryString = params.toString();
          const finalUrl = queryString ? `${redirectUrl}?${queryString}` : redirectUrl;
          
          console.log('🎯 AUTH - Redirecting regular user to:', finalUrl);
          navigate(finalUrl);
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
        
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              display_name: sanitizedDisplayName,
              signup_source: isPropertyManagerRoute ? 'property_manager' : 'regular'
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
          // This shouldn't happen with email verification disabled
          toast({
            title: "Account created!",
            description: "Your account has been created successfully."
          });
          
          } else if (data.user && data.session) {
          // User was created and auto-confirmed, create basic profile
          try {
            const profileData = {
              user_id: data.user.id,
              display_name: sanitizedDisplayName,
              // Set sensible defaults for other fields
              household_type: 'Not specified',
              priorities: ['Convenience'],
              transportation_style: 'Flexible',
              budget_preference: 'Moderate',
              life_stage: 'Getting settled',
              settling_tasks: [],
              priority_preferences: {},
              distance_priority: true
            };

            const { error: profileError } = await supabase
              .from('profiles')
              .upsert(profileData, { onConflict: 'user_id' });

            if (profileError) {
              console.error('Profile creation error:', profileError);
            }

            if (isPropertyManagerRoute) {
              toast({
                title: "Welcome to CalmlySettled Property Manager!",
                description: "Your property manager account has been created successfully."
              });
            } else {
              toast({
                title: "Welcome to CalmlySettled!",
                description: "Your account has been created successfully. Start exploring local businesses!"
              });
            }
          } catch (error) {
            console.error('Error creating profile:', error);
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
      // Use Supabase's resend method
      const redirectUrl = `${window.location.origin}/verify-email`;
      
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
        redirectTo: `${window.location.origin}/reset-password`,
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
        
        // Navigate to explore
        navigate("/explore");
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      console.log('🟡 AUTH - Google OAuth initiated');
      
      // Get redirect parameter from URL to preserve user intent
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'explore';
      const focus = urlParams.get('focus') || 'essentials';
      
      console.log('🟡 AUTH - Google OAuth params:', { redirect, focus });
      
      // Mobile browsers sometimes have issues with complex redirect URLs
      // Use a simpler approach: redirect to auth page with parameters that we can handle
      const redirectUrl = `${window.location.origin}/auth?oauth=true&redirect=${redirect}&focus=${focus}`;
      
      console.log('🟡 AUTH - Mobile redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) {
        await logSecurityEvent('Google OAuth failed', { error: error.message });
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      await logSecurityEvent('Google OAuth error', { error: String(error) });
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/60 to-primary/50" />
      
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate("/")}
            className="inline-flex items-center space-x-2 mb-4 hover:opacity-80 transition-smooth cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">CalmlySettled</span>
          </button>
          <p className="text-white/90">
            {isPropertyManagerRoute ? "Join Our Property Manager Network 🏢" : "Let's personalize your move 🌍"}
          </p>
        </div>

        <Card className="shadow-2xl border-white/20 backdrop-blur-sm bg-white/95 dark:bg-black/90">
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
                     ? (isPropertyManagerRoute 
                        ? "Create your property manager account to start helping tenants discover local businesses"
                        : "Sign up to explore local businesses and services")
                     : (isPropertyManagerRoute 
                        ? "Sign in to your property manager dashboard"
                        : "Sign in to access your saved favorites")
                   )
                )
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isForgotPassword && !isResetPassword && (
              <>
                {/* Google OAuth Button */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 h-11"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Email/Password Forms */}
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
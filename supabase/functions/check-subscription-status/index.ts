import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing subscription in database
    let { data: existingSubscription } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, setting trial");
      
      // Get subscription tier
      const { data: tierData } = await supabaseClient
        .from("subscription_tiers")
        .select("*")
        .eq("name", "Standard")
        .single();

      if (!existingSubscription && tierData) {
        // Create trial subscription
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + tierData.trial_days);

        const { data: newSubscription } = await supabaseClient
          .from("subscriptions")
          .insert({
            user_id: user.id,
            tier_id: tierData.id,
            status: "trial",
            trial_end_date: trialEndDate.toISOString(),
            properties_count: 0,
          })
          .select()
          .single();

        return new Response(JSON.stringify({
          status: "trial",
          trial_end_date: trialEndDate.toISOString(),
          properties_count: 0,
          max_properties: 1, // Trial allows 1 property
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions in Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionStatus = "canceled";
    let currentPeriodEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionStatus = "active";
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: currentPeriodEnd });

      // Update subscription in database
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: "active",
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } else {
      logStep("No active subscription found");
      
      // Update subscription status
      await supabaseClient
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Get updated subscription data
    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const isTrialExpired = subscription?.trial_end_date && new Date(subscription.trial_end_date) < new Date();
    const canCreateProperties = hasActiveSub || (subscription?.status === "trial" && !isTrialExpired);

    logStep("Subscription status determined", { 
      status: subscriptionStatus, 
      canCreateProperties,
      propertiesCount: subscription?.properties_count || 0
    });

    return new Response(JSON.stringify({
      status: subscriptionStatus,
      trial_end_date: subscription?.trial_end_date,
      current_period_end: currentPeriodEnd,
      properties_count: subscription?.properties_count || 0,
      max_properties: hasActiveSub ? -1 : 1, // -1 means unlimited for active subs
      can_create_properties: canCreateProperties,
      is_trial_expired: isTrialExpired,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription-status", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
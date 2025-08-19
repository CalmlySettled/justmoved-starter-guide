import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-TENANT-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role key for administrative access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { tenant_token } = await req.json();
    
    if (!tenant_token) {
      throw new Error("Tenant token is required");
    }

    logStep("Validating tenant token", { tenant_token });

    // Get tenant link and associated property manager
    const { data: tenantLink, error: tenantError } = await supabaseAdmin
      .from('tenant_links')
      .select(`
        *,
        properties (
          id,
          manager_id,
          property_name,
          address,
          latitude,
          longitude,
          contact_info,
          branding
        )
      `)
      .eq('tenant_token', tenant_token)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenantLink) {
      logStep("Invalid tenant token", { error: tenantError });
      return new Response(JSON.stringify({
        valid: false,
        error: 'Invalid or expired tenant link'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    logStep("Tenant link found", { 
      property_id: tenantLink.properties.id,
      manager_id: tenantLink.properties.manager_id 
    });

    // Check property manager's subscription status
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', tenantLink.properties.manager_id)
      .single();

    if (subError || !subscription) {
      logStep("No subscription found for property manager", { 
        manager_id: tenantLink.properties.manager_id,
        error: subError 
      });
      return new Response(JSON.stringify({
        valid: false,
        error: 'Property manager subscription not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Check if subscription is active or trial is valid
    const now = new Date();
    const isActiveSubscription = subscription.status === 'active';
    const isValidTrial = subscription.status === 'trial' && 
                        subscription.trial_end_date && 
                        new Date(subscription.trial_end_date) > now;

    if (!isActiveSubscription && !isValidTrial) {
      logStep("Property manager subscription expired", {
        status: subscription.status,
        trial_end_date: subscription.trial_end_date
      });
      return new Response(JSON.stringify({
        valid: false,
        error: 'Property manager subscription has expired'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // Log tenant access for billing purposes
    await supabaseAdmin.from('property_analytics').insert({
      property_id: tenantLink.properties.id,
      tenant_link_id: tenantLink.id,
      event_type: 'tenant_page_access',
      event_data: {
        subscription_status: subscription.status,
        user_agent: req.headers.get('user-agent'),
        timestamp: now.toISOString()
      }
    });

    // Update last accessed timestamp
    await supabaseAdmin
      .from('tenant_links')
      .update({ last_accessed_at: now.toISOString() })
      .eq('id', tenantLink.id);

    logStep("Tenant access validated successfully", {
      subscription_status: subscription.status,
      property_name: tenantLink.properties.property_name
    });

    return new Response(JSON.stringify({
      valid: true,
      tenant_data: tenantLink,
      subscription_status: subscription.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in validate-tenant-access", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      valid: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
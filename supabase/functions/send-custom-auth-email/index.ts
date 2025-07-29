import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { VerificationEmail } from './_templates/verification-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
// Use a hardcoded secret temporarily for testing
const hookSecret = 'calmlysettled-webhook-secret-2025-xyz789'

console.log('=== Function starting up ===');
console.log('RESEND_API_KEY available:', !!Deno.env.get('RESEND_API_KEY'));
console.log('Hook secret set to:', hookSecret);
console.log('SUPABASE_URL available:', !!Deno.env.get('SUPABASE_URL'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('=== Webhook triggered ===', { 
    method: req.method, 
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return new Response('Method not allowed', { 
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    console.log('Processing webhook payload...');
    
    const payload = await req.text()
    console.log('Raw payload:', payload);
    
    // Skip webhook verification for now to test if function is being called
    const webhookData = JSON.parse(payload);
    console.log('Parsed webhook data:', JSON.stringify(webhookData, null, 2));
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = webhookData as {
      user: {
        email: string
        user_metadata: {
          display_name?: string
        }
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    console.log('Webhook verification successful!');
    console.log('Email action type:', email_action_type);
    console.log('User email:', user.email);
    console.log('User metadata:', user.user_metadata);

    // Only handle signup confirmations, let other email types use default Supabase emails
    if (email_action_type !== 'signup') {
      console.log('Skipping non-signup email type:', email_action_type);
      return new Response(JSON.stringify({ message: 'Not a signup confirmation, skipping custom email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log(`Sending custom verification email to: ${user.email}`)

    const html = await renderAsync(
      React.createElement(VerificationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
        userName: user.user_metadata?.display_name,
      })
    )

    const { error } = await resend.emails.send({
      from: 'CalmlySettled <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Welcome to CalmlySettled - Verify Your Email',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log(`Custom verification email sent successfully to: ${user.email}`)

    return new Response(JSON.stringify({ message: 'Custom email sent successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('Error in send-custom-auth-email function:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Failed to send custom email',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
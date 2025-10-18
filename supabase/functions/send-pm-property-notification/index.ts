import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyNotification {
  property_id: string;
  property_name: string;
  address: string;
  manager_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { property_id, property_name, address, manager_id }: PropertyNotification = await req.json();
    
    console.log('[PM-PROPERTY-NOTIFICATION] New property notification:', { property_id, property_name });
    
    // Get manager details
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', manager_id)
      .single();
    
    const managerName = profile?.display_name || 'Property Manager';
    const curationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/admin/dashboard?tab=curation&property=${property_id}`;
    
    // Send email to admin
    const { data, error } = await resend.emails.send({
      from: 'CalmlySettled <notifications@calmlysettled.com>',
      to: ['hello@calmlysettled.com'], // Admin email
      subject: `🏢 New Property Needs Curation - ${property_name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .property-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .property-info h3 { margin: 0 0 10px 0; color: #667eea; }
              .property-info p { margin: 5px 0; color: #6b7280; }
              .cta-button { display: inline-block; background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .cta-button:hover { background: #5a67d8; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🏢 New Property Added</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">A property manager just added a new property</p>
              </div>
              
              <div class="content">
                <p>Hi Admin,</p>
                
                <p><strong>${managerName}</strong> just added a new property that needs recommendations curated:</p>
                
                <div class="property-info">
                  <h3>📍 ${property_name}</h3>
                  <p><strong>Address:</strong> ${address}</p>
                  <p><strong>Manager:</strong> ${managerName}</p>
                  <p><strong>Property ID:</strong> ${property_id}</p>
                  <p><strong>Added:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <p>Once you curate the recommendations, the property manager will be able to download the QR code and share it with their tenants.</p>
                
                <center>
                  <a href="${curationUrl}" class="cta-button">Start Curating →</a>
                </center>
                
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                  <strong>Quick Actions:</strong><br>
                  • Review the property location<br>
                  • Select relevant categories<br>
                  • Curate local recommendations<br>
                  • Publish when complete
                </p>
              </div>
              
              <div class="footer">
                <p>CalmlySettled Property Management System</p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('[PM-PROPERTY-NOTIFICATION] Error sending email:', error);
      throw error;
    }

    console.log('[PM-PROPERTY-NOTIFICATION] Email sent successfully:', data);

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[PM-PROPERTY-NOTIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PropertyManagerInquiry {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  property_count?: string;
  property_type?: string;
  current_solution?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const inquiry: PropertyManagerInquiry = await req.json();
    console.log("Received property manager inquiry:", inquiry);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">New Property Manager Inquiry</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">CalmlySettled Business Development</p>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Contact Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Company:</td>
                <td style="padding: 8px 0; color: #374151;">${inquiry.company_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Contact Name:</td>
                <td style="padding: 8px 0; color: #374151;">${inquiry.contact_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0;"><a href="mailto:${inquiry.email}" style="color: #667eea; text-decoration: none;">${inquiry.email}</a></td>
              </tr>
              ${inquiry.phone ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
                <td style="padding: 8px 0;"><a href="tel:${inquiry.phone}" style="color: #667eea; text-decoration: none;">${inquiry.phone}</a></td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #374151; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Property Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${inquiry.property_count ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Property Count:</td>
                <td style="padding: 8px 0; color: #374151;">${inquiry.property_count}</td>
              </tr>
              ` : ''}
              ${inquiry.property_type ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Property Type:</td>
                <td style="padding: 8px 0; color: #374151;">${inquiry.property_type}</td>
              </tr>
              ` : ''}
              ${inquiry.current_solution ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Current Solution:</td>
                <td style="padding: 8px 0; color: #374151;">${inquiry.current_solution}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${inquiry.message ? `
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Message</h2>
            <p style="color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">${inquiry.message}</p>
          </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
          <p>This inquiry was submitted through the CalmlySettled property manager contact form.</p>
          <p>Please respond promptly to maintain our professional service standards.</p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "CalmlySettled Inquiries <noreply@calmlysettled.com>",
      to: ["hello@calmlysettled.com"],
      subject: `New Property Manager Inquiry - ${inquiry.company_name}`,
      html: emailHtml,
      replyTo: inquiry.email,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-property-manager-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  confirmationUrl: string;
  userName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, confirmationUrl, userName }: VerificationEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "CalmlySettled <noreply@calmlysettled.com>",
      to: [email],
      subject: "Verify your CalmlySettled account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <span style="color: white; font-size: 24px;">🏠</span>
            </div>
            <h1 style="color: #1f2937; margin: 0; font-size: 28px;">Welcome to CalmlySettled!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi${userName ? ` ${userName}` : ''}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Thank you for signing up for CalmlySettled! We're excited to help you discover the perfect neighborhood recommendations tailored just for you.
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              To get started, please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                        color: white; 
                        text-decoration: none; 
                        padding: 12px 30px; 
                        border-radius: 8px; 
                        font-weight: 600;
                        display: inline-block;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${confirmationUrl}" style="color: #6366f1; word-break: break-all;">${confirmationUrl}</a>
            </p>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin-top: 0; font-size: 16px;">🎯 What's Next?</h3>
            <p style="color: #1e40af; margin-bottom: 0; font-size: 14px;">
              After verification, we'll guide you through a quick personalization quiz to understand your preferences and provide the most relevant neighborhood recommendations.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="margin: 0;">
              This email was sent by CalmlySettled. If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="margin: 10px 0 0 0;">
              <a href="https://calmlysettled.com" style="color: #6366f1;">calmlysettled.com</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Verification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
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
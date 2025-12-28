import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Hotel Mandira <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  recipientEmail: string;
  recipientName: string;
  abteilung: string;
  role: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      recipientEmail, 
      recipientName, 
      abteilung, 
      role,
      inviterName
    }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to ${recipientEmail} for role ${role}`);

    // Generate app URL from Supabase URL (fallback to a placeholder)
    const appUrl = SUPABASE_URL?.replace('.supabase.co', '.lovable.app') || 'https://hotel-mandira.lovable.app';
    const authUrl = `${appUrl}/auth`;

    const roleLabel = role === 'abteilungsleiter' ? 'Abteilungsleiter' : role === 'admin' ? 'Administrator' : 'Mitarbeiter';

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [recipientEmail],
        subject: `Einladung zum Hotel Mandira KPI Dashboard`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a3a2f 0%, #0d1f19 100%); padding: 30px; text-align: center;">
              <h1 style="color: #d4a853; margin: 0;">🏨 Hotel Mandira</h1>
              <p style="color: #a8b5a0; margin: 10px 0 0;">KPI Dashboard - Einladung</p>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 18px; color: #333;">Hallo ${recipientName || 'Kolleg:in'},</p>
              <p>Sie wurden von <strong>${inviterName}</strong> eingeladen, am Hotel Mandira KPI Dashboard teilzunehmen.</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #d4a853; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px; color: #1a3a2f;">📋 Ihre Zugangsdaten</h3>
                <p style="margin: 0; color: #666;"><strong>Rolle:</strong> ${roleLabel}</p>
                <p style="margin: 0; color: #666;"><strong>Abteilung:</strong> ${abteilung || 'Wird nach Anmeldung zugewiesen'}</p>
                <p style="margin: 0; color: #666;"><strong>E-Mail:</strong> ${recipientEmail}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${authUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #d4a853 0%, #b8943f 100%); 
                          color: #1a3a2f; padding: 15px 30px; text-decoration: none; 
                          border-radius: 8px; font-weight: bold; font-size: 16px;">
                  🔐 Jetzt Registrieren
                </a>
              </div>

              <div style="background-color: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px; color: #2e7d32;">📱 Was Sie erwartet:</h4>
                <ul style="margin: 0; padding-left: 20px; color: #555;">
                  <li>Übersicht aller KPIs Ihrer Abteilung</li>
                  <li>Schichtplanung und Mitarbeiterverwaltung</li>
                  <li>Automatische Benachrichtigungen bei Grenzwertüberschreitungen</li>
                  <li>Mobile-optimierte Oberfläche</li>
                </ul>
              </div>

              <p style="color: #888; font-size: 12px; margin-top: 30px;">
                Bitte registrieren Sie sich mit der E-Mail-Adresse <strong>${recipientEmail}</strong>. 
                Nach der Registrierung wird Ihre Rolle automatisch zugewiesen.
              </p>

              <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br><strong>Ihr Hotel Mandira Team</strong></p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
              Hotel Mandira KPI Dashboard © ${new Date().getFullYear()}
            </div>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      let resendMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        resendMessage = parsed?.message ?? parsed?.error?.message ?? errorText;
      } catch {
        // keep raw text
      }

      const needsDomainVerification =
        res.status === 403 &&
        typeof resendMessage === 'string' &&
        resendMessage.includes('verify a domain');

      return new Response(
        JSON.stringify({
          success: false,
          error: `E-Mail konnte nicht gesendet werden: ${resendMessage}`,
          hint: needsDomainVerification
            ? 'Resend ist noch im Testmodus: Bitte Domain bei resend.com/domains verifizieren und eine Absenderadresse dieser Domain verwenden.'
            : undefined,
        }),
        {
          status: needsDomainVerification ? 400 : res.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResponse = await res.json();
    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invitation function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

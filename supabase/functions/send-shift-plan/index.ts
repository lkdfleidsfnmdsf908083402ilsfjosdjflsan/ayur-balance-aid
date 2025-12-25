import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ShiftPlanEmailRequest {
  recipientEmail: string;
  recipientName: string;
  abteilung: string;
  weekStart: string;
  weekEnd: string;
  pdfBase64: string;
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
      weekStart, 
      weekEnd, 
      pdfBase64 
    }: ShiftPlanEmailRequest = await req.json();

    console.log(`Sending shift plan email to ${recipientEmail} for ${abteilung}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hotel Mandira <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `Schichtplan ${abteilung} - KW ${weekStart} bis ${weekEnd}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a3a2f 0%, #0d1f19 100%); padding: 30px; text-align: center;">
              <h1 style="color: #d4a853; margin: 0;">🏨 Hotel Mandira</h1>
              <p style="color: #a8b5a0; margin: 10px 0 0;">KPI Dashboard - Schichtplanung</p>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 18px; color: #333;">Hallo ${recipientName},</p>
              <p>im Anhang finden Sie den aktuellen Schichtplan für Ihre Abteilung.</p>
              <div style="background-color: #f8f9fa; border-left: 4px solid #d4a853; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px; color: #1a3a2f;">📋 Schichtplan Details</h3>
                <p style="margin: 0; color: #666;"><strong>Abteilung:</strong> ${abteilung}</p>
                <p style="margin: 0; color: #666;"><strong>Zeitraum:</strong> ${weekStart} bis ${weekEnd}</p>
              </div>
              <p>Der Schichtplan ist als PDF-Datei angehängt.</p>
              <p style="margin-top: 30px;">Mit freundlichen Grüßen,<br><strong>Ihr Hotel Mandira Team</strong></p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Schichtplan_${abteilung.replace(/\s+/g, '_')}_${weekStart.replace(/\./g, '-')}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-shift-plan function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  abteilung: string;
  kpiTyp: string;
  aktuellerWert: number;
  schwellenwertMin?: number;
  schwellenwertMax?: number;
  status: 'warning' | 'critical';
}

const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "KPI-Alarm <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { abteilung, kpiTyp, aktuellerWert, schwellenwertMin, schwellenwertMax, status }: AlertRequest = await req.json();

    console.log(`Sending alert for ${abteilung} - ${kpiTyp}`);

    // Get department head email
    const { data: leiter, error: leiterError } = await supabaseClient
      .from("abteilungsleiter")
      .select("*")
      .eq("abteilung", abteilung)
      .eq("aktiv", true)
      .maybeSingle();

    if (leiterError) {
      console.error("Error fetching department head:", leiterError);
      throw leiterError;
    }

    if (!leiter) {
      console.log(`No active department head found for ${abteilung}`);
      return new Response(
        JSON.stringify({ message: "No department head configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const statusText = status === 'critical' ? '🔴 KRITISCH' : '🟡 WARNUNG';
    const schwellenwertText = schwellenwertMin !== undefined && schwellenwertMax !== undefined
      ? `${schwellenwertMin.toLocaleString('de-DE')} - ${schwellenwertMax.toLocaleString('de-DE')}`
      : schwellenwertMin !== undefined 
        ? `Min: ${schwellenwertMin.toLocaleString('de-DE')}`
        : `Max: ${schwellenwertMax?.toLocaleString('de-DE')}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${status === 'critical' ? '#dc2626' : '#f59e0b'};">
          ${statusText}
        </h1>
        <h2>KPI-Alarm: ${kpiTyp}</h2>
        <p>Sehr geehrte/r ${leiter.name},</p>
        <p>für die Abteilung <strong>${abteilung}</strong> wurde ein KPI-Alarm ausgelöst:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>KPI</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${kpiTyp}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Aktueller Wert</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; color: ${status === 'critical' ? '#dc2626' : '#f59e0b'};">
              ${aktuellerWert.toLocaleString('de-DE')} €
            </td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Schwellenwert</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${schwellenwertText}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Status</strong></td>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">${statusText}</td>
          </tr>
        </table>
        <p>Bitte überprüfen Sie die Situation und ergreifen Sie bei Bedarf entsprechende Maßnahmen.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">
          Diese E-Mail wurde automatisch vom KPI-Überwachungssystem gesendet.
        </p>
      </div>
    `;

    const emailResponse = await sendEmail(
      leiter.email,
      `${statusText} - ${kpiTyp} Alarm für ${abteilung}`,
      emailHtml
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-kpi-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

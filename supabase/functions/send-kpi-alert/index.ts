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

    // Extract first name from full name
    const vorname = leiter.name.split(' ')[0];
    
    const schwellenwertText = schwellenwertMax !== undefined 
      ? `${schwellenwertMax.toLocaleString('de-DE')}%`
      : schwellenwertMin !== undefined 
        ? `${schwellenwertMin.toLocaleString('de-DE')}%`
        : '';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <p style="margin-bottom: 20px;">Hallo ${vorname},</p>
        
        <p style="margin-bottom: 20px;">
          Die ${kpiTyp} Deiner Abteilung <strong>${abteilung}</strong> hat den Schwellenwert von ${schwellenwertText} überschritten 
          (aktueller Wert: <span style="color: ${status === 'critical' ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${aktuellerWert.toLocaleString('de-DE')}%</span>). 
          Ich würde gerne wissen woran das liegt und was deine Lösungsvorschläge sind. 
          Ein dauerhafter Zustand wie dieser darf sich nicht einschleichen.
        </p>
        
        <p style="margin-bottom: 20px;">
          Ich bin sehr zuversichtlich gemeinsam eine gute Lösung für alle zu finden. 
          Bis dahin verbleibe ich
        </p>
        
        <p style="margin-bottom: 0;">Mit freundlichen Grüßen</p>
        <p style="margin-top: 5px;"><strong>Andreas</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #6b7280; font-size: 11px;">
          Diese E-Mail wurde automatisch vom KPI-Überwachungssystem gesendet.
        </p>
      </div>
    `;

    const statusText = status === 'critical' ? 'KRITISCH' : 'WARNUNG';
    
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

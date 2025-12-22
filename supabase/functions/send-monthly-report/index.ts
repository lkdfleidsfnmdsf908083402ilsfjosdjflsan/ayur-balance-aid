import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  jahr: number;
  monat: number;
  abteilung?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value: number | null): string => {
  if (value === null) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Performance Report <onboarding@resend.dev>",
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

    const { jahr, monat, abteilung }: ReportRequest = await req.json();
    const monatNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    console.log(`Generating monthly report for ${monat}/${jahr}`);

    // Get department heads
    let leiterQuery = supabaseClient
      .from("abteilungsleiter")
      .select("*")
      .eq("aktiv", true);
    
    if (abteilung) {
      leiterQuery = leiterQuery.eq("abteilung", abteilung);
    }

    const { data: leiter, error: leiterError } = await leiterQuery;

    if (leiterError) {
      console.error("Error fetching department heads:", leiterError);
      throw leiterError;
    }

    if (!leiter || leiter.length === 0) {
      console.log("No active department heads found");
      return new Response(
        JSON.stringify({ message: "No department heads configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];

    for (const l of leiter) {
      // Get KPI data for this department
      const { data: kpiData, error: kpiError } = await supabaseClient
        .from("abteilung_kpi_monat")
        .select("*")
        .eq("abteilung", l.abteilung)
        .eq("jahr", jahr)
        .eq("monat", monat)
        .maybeSingle();

      if (kpiError) {
        console.error(`Error fetching KPI for ${l.abteilung}:`, kpiError);
        continue;
      }

      if (!kpiData) {
        console.log(`No KPI data found for ${l.abteilung} in ${monat}/${jahr}`);
        continue;
      }

      // Get budget data
      const { data: budgetData } = await supabaseClient
        .from("budget_planung")
        .select("*")
        .eq("abteilung", l.abteilung)
        .eq("jahr", jahr)
        .eq("monat", monat)
        .maybeSingle();

      const budgetVergleich = budgetData ? `
        <h3 style="margin-top: 30px;">Budget-Vergleich</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #1e3a5f; color: white;">
            <th style="padding: 12px; text-align: left;">KPI</th>
            <th style="padding: 12px; text-align: right;">Ist</th>
            <th style="padding: 12px; text-align: right;">Budget</th>
            <th style="padding: 12px; text-align: right;">Abweichung</th>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">Umsatz</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.umsatz)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(budgetData.umsatz_budget)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${kpiData.umsatz >= budgetData.umsatz_budget ? '#16a34a' : '#dc2626'};">
              ${formatPercent(budgetData.umsatz_budget > 0 ? ((kpiData.umsatz - budgetData.umsatz_budget) / budgetData.umsatz_budget) * 100 : null)}
            </td>
          </tr>
          <tr style="background: #f3f4f6;">
            <td style="padding: 12px; border: 1px solid #e5e7eb;">DB I</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.db1)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(budgetData.db1_budget)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${kpiData.db1 >= budgetData.db1_budget ? '#16a34a' : '#dc2626'};">
              ${formatPercent(budgetData.db1_budget > 0 ? ((kpiData.db1 - budgetData.db1_budget) / budgetData.db1_budget) * 100 : null)}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #e5e7eb;">DB II</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.db2)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(budgetData.db2_budget)}</td>
            <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${kpiData.db2 >= budgetData.db2_budget ? '#16a34a' : '#dc2626'};">
              ${formatPercent(budgetData.db2_budget > 0 ? ((kpiData.db2 - budgetData.db2_budget) / budgetData.db2_budget) * 100 : null)}
            </td>
          </tr>
        </table>
      ` : '';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; color: white;">
            <h1 style="margin: 0;">Performance Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${monatNamen[monat - 1]} ${jahr} - ${l.abteilung}</p>
          </div>
          
          <div style="padding: 30px;">
            <p>Sehr geehrte/r ${l.name},</p>
            <p>hier ist Ihr monatlicher Performance Report für die Abteilung <strong>${l.abteilung}</strong>:</p>
            
            <h3>Kernkennzahlen</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #1e3a5f; color: white;">
                <th style="padding: 12px; text-align: left;">Kennzahl</th>
                <th style="padding: 12px; text-align: right;">Wert</th>
                <th style="padding: 12px; text-align: right;">Vorjahr</th>
                <th style="padding: 12px; text-align: right;">Veränderung</th>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Umsatz</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(kpiData.umsatz)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${kpiData.umsatz_vorjahr ? formatCurrency(kpiData.umsatz_vorjahr) : '-'}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${(kpiData.umsatz_diff_prozent || 0) >= 0 ? '#16a34a' : '#dc2626'};">
                  ${formatPercent(kpiData.umsatz_diff_prozent)}
                </td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Wareneinsatz</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.wareneinsatz)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">-</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">-</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Personal</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.personal)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">-</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">-</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>DB I</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(kpiData.db1)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${kpiData.db1_vorjahr ? formatCurrency(kpiData.db1_vorjahr) : '-'}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${(kpiData.db1_diff_prozent || 0) >= 0 ? '#16a34a' : '#dc2626'};">
                  ${formatPercent(kpiData.db1_diff_prozent)}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>DB II</strong></td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(kpiData.db2)}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${kpiData.db2_vorjahr ? formatCurrency(kpiData.db2_vorjahr) : '-'}</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right; color: ${(kpiData.db2_diff_prozent || 0) >= 0 ? '#16a34a' : '#dc2626'};">
                  ${formatPercent(kpiData.db2_diff_prozent)}
                </td>
              </tr>
            </table>

            ${budgetVergleich}

            <h3 style="margin-top: 30px;">Kostenübersicht</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #1e3a5f; color: white;">
                <th style="padding: 12px; text-align: left;">Kostenart</th>
                <th style="padding: 12px; text-align: right;">Betrag</th>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Energie</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.energie)}</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Marketing</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.marketing)}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Betriebsaufwand</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.betriebsaufwand)}</td>
              </tr>
              <tr style="background: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Abschreibung</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(kpiData.abschreibung)}</td>
              </tr>
            </table>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Dieser Report wurde automatisch vom KPI-System generiert am ${new Date().toLocaleDateString('de-DE')}.
            </p>
          </div>
        </div>
      `;

      try {
        const emailResponse = await sendEmail(
          l.email,
          `Monatlicher Performance Report ${monatNamen[monat - 1]} ${jahr} - ${l.abteilung}`,
          emailHtml
        );
        console.log(`Report sent to ${l.email}:`, emailResponse);
        results.push({ abteilung: l.abteilung, email: l.email, success: true });
      } catch (emailError) {
        console.error(`Failed to send email to ${l.email}:`, emailError);
        results.push({ abteilung: l.abteilung, email: l.email, success: false, error: emailError });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-monthly-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);

// =============================================================================
// EDGE FUNCTION: send-technik-bestellung-reminder
// PFAD: supabase/functions/send-technik-bestellung-reminder/index.ts
// BESCHREIBUNG: Sendet Erinnerungs-E-Mails für ausstehende Wareneingangsbestätigungen
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// E-Mail-Empfänger
const BUCHHALTUNG_EMAIL = "buchhaltung@mandira-ayurveda.at";

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fällige Erinnerungen abrufen
    const { data: reminders, error: fetchError } = await supabase
      .from("technik_erinnerungen_faellig")
      .select("*");

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Keine Erinnerungen fällig",
          count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    // Für jede fällige Erinnerung E-Mail senden
    for (const order of reminders) {
      try {
        const isFirstReminder = order.faellige_erinnerung === 'erinnerung_1';
        const isSecondReminder = order.faellige_erinnerung === 'erinnerung_2';

        // Empfänger bestimmen
        const recipients = [order.besteller_email];
        
        // Bei 2. Erinnerung auch Buchhaltung informieren
        if (isSecondReminder) {
          recipients.push(BUCHHALTUNG_EMAIL);
        }

        // E-Mail HTML generieren
        const emailHtml = generateReminderEmail(order, isSecondReminder);
        const subject = isSecondReminder
          ? `⚠️ DRINGEND: Wareneingang nicht bestätigt - ${order.bestell_id}`
          : `🔔 Erinnerung: Wareneingang bestätigen - ${order.bestell_id}`;

        // E-Mail senden
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Mandira Technik <noreply@mandira-ayurveda.at>",
            to: recipients,
            subject: subject,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          errors.push(`Order ${order.bestell_id}: ${errorText}`);
          continue;
        }

        // Erinnerung als gesendet markieren
        const updateData = isFirstReminder
          ? { erinnerung_1_gesendet: true, erinnerung_1_am: new Date().toISOString() }
          : { erinnerung_2_gesendet: true, erinnerung_2_am: new Date().toISOString() };

        await supabase
          .from("technik_bestellungen")
          .update(updateData)
          .eq("id", order.id);

        sentCount++;

      } catch (orderError) {
        errors.push(`Order ${order.bestell_id}: ${orderError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${sentCount} Erinnerungen gesendet`,
        count: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// =============================================================================
// E-MAIL TEMPLATE
// =============================================================================

function generateReminderEmail(order: any, isEscalation: boolean): string {
  const bestellDatum = new Date(order.bestellt_am).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tageHer = Math.floor(
    (Date.now() - new Date(order.bestellt_am).getTime()) / (1000 * 60 * 60 * 24)
  );

  const haendlerIcons: Record<string, string> = {
    'Amazon': '📦',
    'Conrad': '🔌',
    'Hornbach': '🔨',
    'Bauhaus': '🏗️',
    'Lagerhaus': '🌿',
    'Sonstiges': '🛒',
  };

  const headerColor = isEscalation ? '#dc2626' : '#f59e0b';
  const headerText = isEscalation 
    ? '⚠️ DRINGENDE Erinnerung - Wareneingang nicht bestätigt'
    : '🔔 Erinnerung - Bitte Wareneingang bestätigen';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Technik-Bestellung Erinnerung</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: ${headerColor}; color: white; padding: 24px;">
          <h1 style="margin: 0; font-size: 20px;">${headerText}</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 24px;">
          <p style="color: #374151; margin-bottom: 20px;">
            Hallo ${order.besteller_name},
          </p>
          
          <p style="color: #374151; margin-bottom: 20px;">
            die folgende Bestellung wurde vor <strong>${tageHer} Tagen</strong> aufgegeben. 
            Bitte bestätigen Sie den Wareneingang im KPI-System.
          </p>
          
          <!-- Bestelldetails -->
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Bestell-ID:</td>
                <td style="padding: 8px 0; font-weight: bold;">${order.bestell_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Artikel:</td>
                <td style="padding: 8px 0; font-weight: bold;">${order.artikel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Menge:</td>
                <td style="padding: 8px 0;">${order.menge} Stück</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Preis:</td>
                <td style="padding: 8px 0;">€${order.gesamtpreis?.toFixed(2) || '0.00'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Händler:</td>
                <td style="padding: 8px 0;">${haendlerIcons[order.haendler] || '🛒'} ${order.haendler}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Bestellt am:</td>
                <td style="padding: 8px 0;">${bestellDatum}</td>
              </tr>
            </table>
          </div>
          
          ${isEscalation ? `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="color: #dc2626; margin: 0; font-weight: bold;">
              ⚠️ Dies ist die zweite Erinnerung!
            </p>
            <p style="color: #dc2626; margin: 8px 0 0 0; font-size: 14px;">
              Falls die Ware nicht eingetroffen ist, melden Sie dies bitte umgehend 
              mit einer Erklärung im System. Die Buchhaltung wurde informiert.
            </p>
          </div>
          ` : ''}
          
          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://kpi.ecomarine-group.com/" 
               style="display: inline-block; background-color: ${isEscalation ? '#dc2626' : '#f59e0b'}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Wareneingang jetzt bestätigen →
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
            Bei Fragen wenden Sie sich an die Technik-Leitung oder Buchhaltung.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">
            Diese E-Mail wurde automatisch vom Mandira KPI System gesendet.<br>
            Technik-Bestellsystem • Mandira Ayurveda Hotel
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

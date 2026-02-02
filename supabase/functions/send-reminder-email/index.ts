import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: settings } = await supabase
      .from('admin_calendar_settings')
      .select('*')
      .single()

    const recipients = [
      settings?.email_1,
      settings?.email_2,
      settings?.email_3
    ].filter(Boolean)

    const { data: reminders } = await supabase
      .from('admin_erinnerungen_faellig')
      .select('*')

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Keine Erinnerungen fällig', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // E-Mail HTML erstellen
    const itemList = reminders.map(r => 
      `<tr>
        <td style="padding:10px;border:1px solid #ddd;">${r.auto_id}</td>
        <td style="padding:10px;border:1px solid #ddd;">${r.typ}</td>
        <td style="padding:10px;border:1px solid #ddd;">${r.bereich_anlage}</td>
        <td style="padding:10px;border:1px solid #ddd;">${r.faellig_am}</td>
      </tr>`
    ).join('')

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1F4E79;color:white;padding:20px;text-align:center;">
          <h1>⏰ Erinnerung: Fälligkeit in 2 Tagen</h1>
          <p>Hotel Mandira - Verwaltungs-Tracker</p>
        </div>
        <div style="padding:20px;">
          <p><strong>Folgende Vorgänge sind in 2 Tagen fällig:</strong></p>
          <table style="border-collapse:collapse;width:100%;">
            <tr style="background:#4472C4;color:white;">
              <th style="padding:10px;text-align:left;">ID</th>
              <th style="padding:10px;text-align:left;">Typ</th>
              <th style="padding:10px;text-align:left;">Bereich</th>
              <th style="padding:10px;text-align:left;">Fällig am</th>
            </tr>
            ${itemList}
          </table>
          <p style="margin-top:20px;">Bitte prüfen Sie diese Vorgänge.</p>
        </div>
        <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;">
          Hotel Mandira | Verwaltungs-Tracker
        </div>
      </div>
    `

    let emailSent = false
    let emailError = null

    // E-Mail mit Resend senden
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Mandira Tracker <onboarding@resend.dev>',
            to: recipients,
            subject: `⏰ Erinnerung: ${reminders.length} Vorgang/Vorgänge fällig`,
            html: emailHtml
          })
        })
        emailSent = res.ok
        if (!res.ok) {
          emailError = await res.text()
        }
      } catch (e) {
        emailError = e.message
      }
    }

    // Als gesendet markieren
    for (const item of reminders) {
      await supabase
        .from(item.source_table)
        .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
        .eq('id', item.source_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${reminders.length} Erinnerungen verarbeitet`,
        email_sent: emailSent,
        email_error: emailError,
        count: reminders.length,
        recipients: recipients,
        items: reminders.map(r => r.auto_id)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

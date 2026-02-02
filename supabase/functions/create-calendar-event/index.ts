import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ICS-Datei generieren (funktioniert mit allen Kalendern)
function generateICS(event: any): string {
  const uid = `${event.auto_id}@mandira-ayurveda.at`
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const eventDate = event.faellig_am.replace(/-/g, '')
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hotel Mandira//Verwaltungs-Tracker//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART;VALUE=DATE:${eventDate}
DTEND;VALUE=DATE:${eventDate}
SUMMARY:📋 ${event.auto_id} - ${event.bereich_anlage}
DESCRIPTION:Fälligkeit: ${event.bereich_anlage}\\nTyp: ${event.typ || 'Allgemein'}\\nID: ${event.auto_id}
LOCATION:Hotel Mandira
BEGIN:VALARM
TRIGGER:-P2D
ACTION:DISPLAY
DESCRIPTION:Erinnerung: ${event.auto_id} ist in 2 Tagen fällig!
END:VALARM
END:VEVENT
END:VCALENDAR`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    
    // Validierung
    if (!body.auto_id || !body.bereich_anlage || !body.faellig_am) {
      return new Response(
        JSON.stringify({ success: false, error: 'Fehlende Pflichtfelder: auto_id, bereich_anlage, faellig_am' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ICS generieren
    const icsContent = generateICS(body)

    // In Datenbank als erstellt markieren (falls source_table und source_id angegeben)
    if (body.source_table && body.source_id) {
      await supabase
        .from(body.source_table)
        .update({ 
          calendar_event_created: true,
          calendar_event_id: body.auto_id
        })
        .eq('id', body.source_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Kalendereintrag erstellt',
        auto_id: body.auto_id,
        ics_content: icsContent,
        ics_download: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`
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

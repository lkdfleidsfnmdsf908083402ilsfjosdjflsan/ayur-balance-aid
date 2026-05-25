/**
 * Supabase Edge Function: recognize-wine
 *
 * Nimmt ein Base64-JPEG entgegen, schickt es an Claude (Anthropic API) und gibt
 * strukturierte Wein-Metadaten zurück. Der API-Key bleibt serverseitig.
 *
 * Setup:
 *   1. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   2. supabase functions deploy recognize-wine --no-verify-jwt
 *      (no-verify-jwt nur wenn auch anonyme Aufrufe erlaubt sein sollen)
 *
 * Request-Body:  { "image": "<base64 ohne data:image-Prefix>" }
 * Response:      { "name", "weingut", "jahrgang", "rebsorte", "region", "confidence" }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT = `Du bist ein Wein-Experte. Identifiziere den Wein auf diesem Foto so präzise wie möglich.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt ohne Markdown, ohne Backticks, ohne erläuternden Text davor oder danach. Format:
{"name":"Vollständiger Weinname","weingut":"Weingut/Produzent oder leer","jahrgang":"4-stelliges Jahr oder leer","rebsorte":"Rebsorte oder leer","region":"Region oder leer","confidence":"high|medium|low"}

Falls auf dem Foto kein Wein erkennbar ist:
{"name":"Nicht erkannt","weingut":"","jahrgang":"","rebsorte":"","region":"","confidence":"none"}`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST erforderlich' }, 405);
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' }, 500);
    }

    const body = await req.json().catch(() => null);
    const image = body?.image;
    if (!image || typeof image !== 'string') {
      return jsonResponse({ error: 'image (base64) erforderlich' }, 400);
    }

    // Defensive: data:-Prefix entfernen falls Client ihn doch mitschickt
    const cleanImage = image.replace(/^data:image\/[a-z]+;base64,/, '');

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: cleanImage },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      return jsonResponse(
        { error: `Claude API ${claudeRes.status}`, detail },
        502
      );
    }

    const data = await claudeRes.json();
    const text: string = (data.content || [])
      .map((c: { text?: string }) => c.text || '')
      .join('')
      .trim();

    const clean = text.replace(/```json|```/g, '').trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return jsonResponse(
        { error: 'Antwort nicht parsebar', raw: clean },
        502
      );
    }

    // Confidence normalisieren
    const valid = ['high', 'medium', 'low', 'none'];
    if (!valid.includes(String(parsed.confidence))) {
      parsed.confidence = 'low';
    }

    return jsonResponse(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Interner Fehler';
    return jsonResponse({ error: message }, 500);
  }
});

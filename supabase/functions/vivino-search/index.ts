/**
 * Supabase Edge Function: vivino-search
 *
 * CORS-Proxy für Vivinos inoffizielle Such-API. Wird vom Browser nicht direkt
 * akzeptiert (kein Access-Control-Allow-Origin auf vivino.com).
 *
 * Setup:
 *   supabase functions deploy vivino-search --no-verify-jwt
 *
 * Request-Body:  { "query": "Grüner Veltliner Smaragd" }
 * Response (gefunden):
 *   { "found": true, "name", "weingut", "jahrgang", "rebsorte", "region", "bildUrl" }
 * Response (nicht gefunden):
 *   { "found": false }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    return jsonResponse({ found: false, error: 'POST erforderlich' }, 405);
  }

  try {
    const body = await req.json().catch(() => null);
    const query = body?.query;
    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return jsonResponse({ found: false, error: 'query (mind. 3 Zeichen) erforderlich' }, 400);
    }

    const url =
      `https://www.vivino.com/api/explore?country_code=AT&currency_code=EUR` +
      `&grape_filter=wines&min_rating=1&order_by=match&order=desc&page=1` +
      `&price_range_max=500&price_range_min=1&language=de` +
      `&q=${encodeURIComponent(query.trim())}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return jsonResponse({ found: false, error: `Vivino ${res.status}` });
    }

    const data = await res.json().catch(() => null);
    const matches = data?.explore_vintage?.matches;
    if (!Array.isArray(matches) || matches.length === 0) {
      return jsonResponse({ found: false });
    }

    const m = matches[0];
    const vintage = m.vintage;
    const wine = vintage?.wine;

    if (!wine) {
      return jsonResponse({ found: false });
    }

    const imageLocation: string | undefined = vintage?.image?.location;
    const bildUrl = imageLocation
      ? imageLocation.startsWith('//')
        ? `https:${imageLocation}`
        : imageLocation.startsWith('http')
          ? imageLocation
          : `https://images.vivino.com/thumbs/${imageLocation}`
      : undefined;

    return jsonResponse({
      found: true,
      name: wine.name
        ? `${wine.name}${vintage?.year ? ' ' + vintage.year : ''}`.trim()
        : query,
      weingut: wine.winery?.name || undefined,
      jahrgang: vintage?.year ? String(vintage.year) : undefined,
      rebsorte: wine.style?.grapes?.[0]?.name || undefined,
      region: wine.region?.name || undefined,
      bildUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Interner Fehler';
    return jsonResponse({ found: false, error: message }, 500);
  }
});

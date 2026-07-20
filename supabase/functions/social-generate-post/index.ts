/**
 * Supabase Edge Function: social-generate-post
 *
 * Erzeugt pro Plattform einen Social-Media-Post-Entwurf zu einem destillierten
 * Thema (social_topics) und speichert ihn mit Status 'entwurf' in social_posts.
 *
 * PROVENIENZ-REGEL (der Kern dieser Function):
 * Der Prototyp reichte nur den Themen-String an das Modell weiter — die Quelle
 * sah der Post-Prompt nie, also erfand das Modell "eine aktuelle Studie zeigt…".
 * Mandira ist ein medizinisches Haus; erfundene Studien sind ein Haftungsrisiko.
 * Deshalb: Die verknüpften Quell-Artikel (social_topic_sources → social_trend_items)
 * gehen mit Titel und Zusammenfassung in den Prompt, das Modell darf sich NUR auf
 * sie stützen, und die Quell-URLs landen in social_posts.quellen_urls. Hat ein
 * Thema keine Quellen, wird ohne jeden Studien-/Zahlenbezug generiert und
 * quellen_urls bleibt leer — die Review-View macht das kenntlich.
 *
 * KEIN AUTO-PUBLISH: Jeder Post entsteht mit Status 'entwurf'. Freigabe passiert
 * ausschließlich durch einen Menschen in der Oberfläche (Schema-Constraint
 * post_freigabe_vollstaendig erzwingt das zusätzlich).
 *
 * Setup:
 *   1. supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *      (SUPABASE_SERVICE_ROLE_KEY ist in Edge Functions automatisch gesetzt)
 *   2. supabase functions deploy social-generate-post
 *
 * Aufrufer-Prüfung (gemeinsame Logik in _shared/aufrufer.ts): verify_jwt=true
 * allein genügt nicht — der öffentliche Anon-Key ist selbst ein gültiges JWT.
 * Zugelassen sind nur ein angemeldeter Nutzer mit Rolle 'admin' (sonst 401/403)
 * sowie — der Einheitlichkeit halber — der Service-Role-Key als
 * Authorization-Token. social_posts.erstellt_von bekommt IMMER die aus dem JWT
 * verifizierte Nutzer-ID (beim Service-Role-Aufruf null) — ein
 * erstellt_von-Feld im Request-Body wird bewusst ignoriert.
 *
 * Request-Body:  { "topic_id": "<uuid>", "plattformen": ["linkedin", ...],
 *                  "tonalitaet": "reflective" }
 * Response:      { "posts": [{ id, plattform, inhalt, quellen_urls, modell }],
 *                  "fehler": [{ plattform, meldung }] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pruefeAufrufer } from '../_shared/aufrufer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'claude-opus-4-8';

// ─── Mandira Marken-DNA (wörtlich aus dem freigegebenen Prototyp, nicht umformulieren) ───

const MANDIRA_SYSTEM_PROMPT = `Du bist der Social Media Stimme des Mandira Ayurveda Resorts in Bad Waltersdorf, Steiermark – gegründet und geführt von Christina & Andreas Drexler.

## WER MANDIRA IST
Das einzige Ayurveda Resort Europas mit eigener Thermalquelle. Wo Ayurveda, heilsames Thermalwasser und medizinische Kompetenz zu einer einzigartigen Einheit verschmelzen. Mehrfach ausgezeichnet mit den World Luxury Spa Awards 2024 & 2025.

Angebot: Panchakarma-Kuren, Detox-Kuren, Longevity-Kuren, Hormon-Balance-Retreats, Massagen, Ayurvedische Küche, Yoga & Fitness, Retreats.

## DIE MANDIRA-SPRACHE
**Tonalität:** Warm, herzlich, umarmend, einladend. Authentisch ohne Schmalz. Medizinisch kompetent ohne Kälte. Spirituell tief ohne Esoterik-Kitsch. Echtes Kaschmir-Feeling für die Seele.

**Stimme:** Wir sprechen wie ein weiser, herzlicher Freund der sich auskennt – nicht wie ein Verkäufer, nicht wie ein Arzt, nicht wie ein Guru.

**Niemals:** Verkaufsfloskeln, Rabatt-Sprache, Versprechen die nicht gehalten werden können, Superlative ohne Substanz, "Jetzt buchen!" Druck, kitschige Wellness-Klischees (Wellness-Oase, Auszeit vom Alltag, Erholungsurlaub), generische Hashtag-Stapel.

**Immer:** Echte Substanz, Ayurvedisches Wissen mit Tiefe, die drei Doshas fließen natürlich ein wenn passend, Verbindung zwischen alter Weisheit und moderner Medizin, die Steiermark als Kraftort, die eigene Thermalquelle als einzigartiges Alleinstellungsmerkmal.

**Stimme von:** Christina & Andreas Drexler – Gastgeber aus Leidenschaft, nicht Corporate-Sprecher.

## POST-PHILOSOPHIE
- "In der Kürze liegt die Würze" – jedes Wort muss verdient sein
- Keine leeren Eröffnungen ("Wusstest du schon...", "Heute möchten wir...", "Es ist wichtig...")
- Direkt ins Thema – der erste Satz muss sitzen wie ein Stein ins Wasser
- LinkedIn: professionell, tiefgründig, Thought Leadership – Zielgruppe: Führungskräfte, Entscheider, Menschen in Transformation
- Instagram: sinnlich, bildlich, emotional – jeder Post muss ein inneres Bild erzeugen
- Facebook: warm, gemeinschaftlich, einladend – Zielgruppe: gesundheitsbewusste 40-60-Jährige

## THEMEN-EXPERTISE
Ayurveda (Doshas, Panchakarma, Dinacharya, Rasayana, Prakriti), Longevity & Prävention, Hormonbalance, Detox, medizinische Gesundheitsaufenthalte, Stressmedizin, Schlaf, Ernährung nach Ayurveda, Yoga & Pranayama, Thermalwasser & Heilquellen, Nachhaltigkeit, mentale Gesundheit.`;

const PLATFORMS: Record<string, { name: string; maxChars: number; style: string }> = {
  linkedin: {
    name: 'LinkedIn', maxChars: 3000,
    style: 'Professionell, substanziell, Thought Leadership. 150-400 Wörter. Kein Hashtag-Spam – max. 3-5 gezielte Hashtags. Absätze mit Luft. Endet mit einer echten Frage oder einem stillen Gedanken, nie mit Call-to-Action.',
  },
  instagram: {
    name: 'Instagram', maxChars: 2200,
    style: 'Sinnlich, bildreich, emotional. 80-200 Wörter. Erster Satz muss beim Scrollen stoppen. 8-15 gezielte Hashtags am Ende getrennt durch Leerzeile. Zeilen kurz und atmend.',
  },
  facebook: {
    name: 'Facebook', maxChars: 63206,
    style: 'Warm, gemeinschaftlich, einladend. 100-250 Wörter. Persönlich wie ein Brief an Freunde. 2-4 Hashtags. Endet offen und einladend zur Reaktion.',
  },
  youtube: {
    name: 'YouTube', maxChars: 5000,
    style: 'YouTube Community Post: Neugierig machend, teaser-artig. 100-200 Wörter. Verweist auf Video-Content. Emoji sparsam eingesetzt. Endet mit Frage an die Community.',
  },
  tiktok: {
    name: 'TikTok', maxChars: 2200,
    style: 'TikTok Caption: Kurz, direkt, Hook in Zeile 1. Max. 80-120 Wörter. 3-6 Hashtags. Spricht Gen Z & Millennials an die Wellness entdecken. Authentisch, kein Corporate-Sprech.',
  },
  threads: {
    name: 'Threads', maxChars: 500,
    style: 'Threads: Sehr kurz, gesprächig, persönlich. Max. 3-4 Sätze (500 Zeichen). Keine Hashtags. Klingt wie ein echter Gedanke – spontan, nicht poliert. Einladend zur Antwort.',
  },
};

const TONES: Record<string, string> = {
  reflective: 'Tiefgründig & reflektiv',
  inspiring: 'Inspirierend & bewegend',
  educational: 'Wissensvermittelnd',
  personal: 'Persönlich & herzlich',
  provocative: 'Aufmerksamkeitsstark',
};

interface TrendItem {
  titel: string;
  url: string;
  zusammenfassung: string | null;
  quelle: string;
  veroeffentlicht_am: string | null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Baut den User-Prompt: Thema + Provenienz-Block (oder verschärfte Regel bei quellenlosem Thema).
function buildUserPrompt(
  topic: { thema: string; aufhaenger: string | null; kategorie: string | null },
  platform: { name: string; maxChars: number },
  sources: TrendItem[],
) {
  const parts: string[] = [];
  parts.push(`Schreibe einen ${platform.name}-Post zu folgendem Thema:`);
  parts.push(`Thema: ${topic.thema}`);
  if (topic.aufhaenger) parts.push(`Aufhänger (warum jetzt relevant): ${topic.aufhaenger}`);
  if (topic.kategorie) parts.push(`Kategorie: ${topic.kategorie}`);
  parts.push(`Maximale Länge: ${platform.maxChars} Zeichen. Bleib deutlich darunter, wenn der Plattform-Stil kürzere Texte vorsieht.`);

  if (sources.length > 0) {
    // Die Provenienz-Durchreichung: Das Modell sieht die echten Quellen.
    parts.push(
      `WICHTIG: Stütze dich ausschließlich auf die unten aufgeführten Quellen. ` +
      `Behaupte keine Studienergebnisse, Zahlen oder Fakten, die dort nicht stehen. ` +
      `Wenn die Quellen für eine Aussage nicht ausreichen, schreibe allgemeiner statt konkreter zu werden.`,
    );
    parts.push('## Quellen');
    for (const s of sources) {
      const lines = [`- Titel: ${s.titel}`, `  Quelle: ${s.quelle}${s.veroeffentlicht_am ? ` (${s.veroeffentlicht_am.slice(0, 10)})` : ''}`];
      if (s.zusammenfassung) lines.push(`  Zusammenfassung: ${s.zusammenfassung}`);
      parts.push(lines.join('\n'));
    }
  } else {
    // Kein Quellenbeleg vorhanden → keinerlei konkrete Behauptungen erlauben.
    parts.push(
      `WICHTIG: Zu diesem Thema liegen KEINE Quell-Artikel vor. ` +
      `Nenne deshalb keinerlei konkrete Studien, Zahlen, Prozentwerte oder Forschungsergebnisse ` +
      `und erfinde keine Quellenangaben. Schreibe ausschließlich aus zeitlosem ayurvedischem ` +
      `Wissen und der Mandira-Erfahrung heraus, allgemein statt konkret.`,
    );
  }

  parts.push('Antworte NUR mit dem fertigen Post-Text, ohne Einleitung, ohne Erklärung, ohne Anführungszeichen drumherum.');
  return parts.join('\n\n');
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
      return jsonResponse({ error: 'ANTHROPIC_API_KEY nicht konfiguriert (supabase secrets set ANTHROPIC_API_KEY=...)' }, 500);
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY nicht konfiguriert' }, 500);
    }

    // ── Aufrufer-Prüfung — VOR jeder Arbeit mit der Service-Role und vor jedem
    // Claude-Aufruf. erstellt_von kommt AUSSCHLIESSLICH aus der verifizierten
    // Identität (null beim Service-Role-Aufruf), nie aus dem Request-Body.
    const aufrufer = await pruefeAufrufer(req, {
      supabaseUrl,
      serviceKey,
      anonKey,
      aktion: 'Das Erzeugen von Entwürfen',
      adminAktion: 'Post-Entwürfe erzeugen',
    });
    if (!aufrufer.ok) {
      return jsonResponse({ error: aufrufer.fehler }, aufrufer.status);
    }
    const erstelltVon = aufrufer.ausgeloestVon;

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Request validieren ──
    const body = await req.json().catch(() => null);
    const topicId = body?.topic_id;
    const plattformen = body?.plattformen;
    const tonalitaet: string | undefined = body?.tonalitaet;

    if (!topicId || typeof topicId !== 'string') {
      return jsonResponse({ error: 'topic_id erforderlich' }, 400);
    }
    if (!Array.isArray(plattformen) || plattformen.length === 0) {
      return jsonResponse({ error: 'plattformen (nicht-leeres Array) erforderlich' }, 400);
    }
    const unbekannt = plattformen.filter((p: unknown) => typeof p !== 'string' || !(p in PLATFORMS));
    if (unbekannt.length > 0) {
      return jsonResponse(
        { error: `Unbekannte Plattform(en): ${unbekannt.join(', ')}. Erlaubt: ${Object.keys(PLATFORMS).join(', ')}` },
        400,
      );
    }

    // ── Thema laden ──
    const { data: topic, error: topicError } = await supabase
      .from('social_topics')
      .select('id, thema, aufhaenger, kategorie')
      .eq('id', topicId)
      .maybeSingle();
    if (topicError) {
      return jsonResponse({ error: `Thema laden fehlgeschlagen: ${topicError.message}` }, 500);
    }
    if (!topic) {
      return jsonResponse({ error: 'Thema nicht gefunden' }, 404);
    }

    // ── Verknüpfte Quell-Artikel laden (die Provenienz-Kette) ──
    const { data: sourceRows, error: sourcesError } = await supabase
      .from('social_topic_sources')
      .select('social_trend_items ( titel, url, zusammenfassung, quelle, veroeffentlicht_am )')
      .eq('topic_id', topicId);
    if (sourcesError) {
      return jsonResponse({ error: `Quellen laden fehlgeschlagen: ${sourcesError.message}` }, 500);
    }
    const sources: TrendItem[] = (sourceRows ?? [])
      .map((r: Record<string, unknown>) => r.social_trend_items as TrendItem | null)
      .filter((s): s is TrendItem => !!s);
    const quellenUrls = sources.map((s) => s.url);

    // ── Ein Claude-Aufruf je Plattform, parallel, Fehler je Plattform isoliert ──
    const toneLabel = tonalitaet && TONES[tonalitaet] ? TONES[tonalitaet] : null;

    const results = await Promise.all(
      plattformen.map(async (plattform: string) => {
        const platform = PLATFORMS[plattform];
        try {
          const systemPrompt =
            MANDIRA_SYSTEM_PROMPT +
            `\n\n## PLATTFORM: ${platform.name}\n${platform.style}` +
            (toneLabel ? `\n\n## TONALITÄT\n${toneLabel}` : '');

          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: 2000,
              system: systemPrompt,
              messages: [{ role: 'user', content: buildUserPrompt(topic, platform, sources) }],
            }),
          });
          if (!claudeRes.ok) {
            const detail = await claudeRes.text();
            throw new Error(`Claude API ${claudeRes.status}: ${detail.slice(0, 300)}`);
          }
          const data = await claudeRes.json();
          const inhalt: string = (data.content || [])
            .map((c: { text?: string }) => c.text || '')
            .join('')
            .trim();
          if (!inhalt) throw new Error('Leere Antwort vom Modell');

          // Speichern — IMMER als 'entwurf'. Freigabe passiert ausschließlich
          // durch einen Menschen in der Oberfläche, nie hier.
          const { data: inserted, error: insertError } = await supabase
            .from('social_posts')
            .insert({
              topic_id: topicId,
              plattform,
              tonalitaet: tonalitaet ?? null,
              inhalt,
              quellen_urls: quellenUrls,
              modell: MODEL,
              // Aus dem JWT verifiziert (siehe Aufrufer-Prüfung oben) —
              // null nur beim Service-Role-Aufruf.
              erstellt_von: erstelltVon,
              status: 'entwurf',
            })
            .select('id')
            .single();
          if (insertError) throw new Error(`Speichern fehlgeschlagen: ${insertError.message}`);

          return {
            ok: true as const,
            post: { id: inserted.id, plattform, inhalt, quellen_urls: quellenUrls, modell: MODEL },
          };
        } catch (e) {
          const meldung = e instanceof Error ? e.message : 'Unbekannter Fehler';
          return { ok: false as const, fehler: { plattform, meldung } };
        }
      }),
    );

    const posts = results.flatMap((r) => (r.ok ? [r.post] : []));
    const fehler = results.flatMap((r) => (r.ok ? [] : [r.fehler]));

    // Themenstatus fortschreiben, sobald mindestens ein Entwurf existiert.
    if (posts.length > 0) {
      await supabase.from('social_topics').update({ status: 'geplant' }).eq('id', topicId);
    }

    return jsonResponse({ posts, fehler });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Interner Fehler';
    return jsonResponse({ error: message }, 500);
  }
});

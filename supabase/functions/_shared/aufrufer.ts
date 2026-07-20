/**
 * Gemeinsame Aufrufer-Prüfung für die Social-Edge-Functions
 * (social-publish, social-trend-scan, social-generate-post).
 *
 * verify_jwt=true allein genügt nicht: der öffentliche Anon-Key ist selbst ein
 * gültiges JWT und steckt im Frontend-Bundle. Deshalb echte Identitätsprüfung —
 * VOR jeder Arbeit mit der Service-Role und vor jedem Claude-Aufruf:
 *
 *   - Zeitplan-Worker (Cron aus 20260719_social_zeitplan.sql): erkennbar
 *     daran, dass das Authorization-Token der Service-Role-Key SELBST ist —
 *     kein Body-Feld, das jeder behaupten könnte. ausgeloestVon bleibt dann null.
 *   - Sonst: Nutzer per auth.getUser() über einen Anon-Key-Client auflösen
 *     (401, wenn keiner) und die Rolle aus user_profiles prüfen — nur 'admin'
 *     darf auslösen (403).
 *
 * Die Herkunft ('manuell' | 'zeitplan') und die auslösende Nutzer-ID werden
 * IMMER aus der so verifizierten Identität abgeleitet, NIE aus dem Request-Body.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AufruferErgebnis =
  | {
      ok: true;
      /** true = Authorization-Token war der Service-Role-Key (Cron/Zeitplan). */
      istZeitplanAufruf: boolean;
      /** Aus dem JWT verifizierte Nutzer-ID; null beim Zeitplan-Aufruf. */
      ausgeloestVon: string | null;
      ausloeserArt: 'manuell' | 'zeitplan';
    }
  | { ok: false; status: number; fehler: string };

export async function pruefeAufrufer(
  req: Request,
  cfg: {
    supabaseUrl: string;
    serviceKey: string;
    anonKey: string;
    /** Für die 401-Meldung, z.B. 'Ausspielen' → "Nicht angemeldet: Ausspielen erfordert …" */
    aktion: string;
    /** Für die 403-Meldung, z.B. 'Posts ausspielen' → "Nur Admins dürfen Posts ausspielen." */
    adminAktion: string;
  },
): Promise<AufruferErgebnis> {
  const callerToken = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const istZeitplanAufruf = callerToken.length > 0 && callerToken === cfg.serviceKey;

  if (istZeitplanAufruf) {
    return { ok: true, istZeitplanAufruf: true, ausgeloestVon: null, ausloeserArt: 'zeitplan' };
  }

  const authClient = createClient(cfg.supabaseUrl, cfg.anonKey);
  const { data: authData, error: authError } = await authClient.auth.getUser(callerToken);
  if (authError || !authData?.user?.id) {
    return {
      ok: false,
      status: 401,
      fehler: `Nicht angemeldet: ${cfg.aktion} erfordert ein gültiges Nutzer-Token — die auslösende Person konnte nicht verifiziert werden.`,
    };
  }

  const { data: profil, error: profilError } = await createClient(cfg.supabaseUrl, cfg.serviceKey)
    .from('user_profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle<{ role: string | null }>();
  if (profilError) {
    return { ok: false, status: 500, fehler: `Rollenprüfung fehlgeschlagen: ${profilError.message}` };
  }
  if (profil?.role !== 'admin') {
    return { ok: false, status: 403, fehler: `Nur Admins dürfen ${cfg.adminAktion}.` };
  }

  return {
    ok: true,
    istZeitplanAufruf: false,
    ausgeloestVon: authData.user.id,
    ausloeserArt: 'manuell',
  };
}

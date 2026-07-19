-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 2 · Ayur Balance Aid / Mandira-KPI-Dashboard
--
--  Aufbauend auf 20260715_rls_security_hardening.sql. Behebt die verbliebenen
--  Advisor-WARNUNGEN (keine Errors mehr), soweit ohne Risiko fürs Dashboard:
--    1. anon darf keine Funktionen (RPC) mehr ausführen
--    2. search_path aller eigenen Funktionen fixieren (kein Hijacking)
--    3. verwaiste anon-Policy auf wein_lager entfernen
--
--  NICHT enthalten (bewusste Entscheidungen, kein Zwang):
--    - rls_policy_always_true: die authenticated-Policies mit USING(true) sind
--      das gewollte Modell "jeder eingeloggte Mitarbeiter darf alles". Nur
--      ändern, wenn pro Rolle eingeschränkt werden soll (z. B. employees/
--      user_roles nur für Admins). Beispiel am Ende dieser Datei.
--    - pg_net in public lassen (Verschieben würde Reminder-Funktionen brechen).
--    - Leaked-Password-Protection: Dashboard-Toggle, siehe Ende.
--
--  Idempotent & nicht-destruktiv. `authenticated` behält alle Rechte.
-- ══════════════════════════════════════════════════════════════════════════


-- ─── 1) anon den Ausführungszugriff auf Funktionen/RPC entziehen ────────────
--
-- Das erste Skript entzog anon nur Tabellen/Views. Funktionen blieben offen —
-- daher konnten SECURITY-DEFINER-Funktionen (is_admin, get_view_def,
-- call_send_reminder, …) noch anonym über /rest/v1/rpc/* aufgerufen werden.
-- Die App ist login-gated und ruft anonym keine RPCs auf → gefahrlos.

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

DO $$
DECLARE creator TEXT;
BEGIN
  FOREACH creator IN ARRAY ARRAY['postgres', 'supabase_admin', current_user] LOOP
    BEGIN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;',
        creator
      );
    EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
      RAISE NOTICE 'Default-Privileges (Funktionen) für Rolle % übersprungen (%).', creator, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─── 2) search_path aller EIGENEN Funktionen fixieren ───────────────────────
--
-- Setzt einen festen search_path, damit keine Funktion über eine manipulierte
-- Session-Einstellung auf untergeschobene Objekte zugreift. Extension-eigene
-- Funktionen (z. B. pg_net) werden übersprungen — die fassen wir nicht an.
-- `public, extensions, pg_temp` erhält das bisherige Auflösungsverhalten.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'                         -- nur normale Funktionen
      AND NOT EXISTS (                            -- keine Extension-Funktionen
        SELECT 1 FROM pg_depend d
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = public, extensions, pg_temp;',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'search_path für %(%): übersprungen — %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─── 3) Verwaiste anon-Policy auf wein_lager entfernen ──────────────────────
--
-- `allow_all_anon` galt für public/anon. anon ist zwar bereits per GRANT-Entzug
-- gesperrt, aber die Policy soll nicht herumliegen. Die authenticated-Policy
-- `auth_all` auf derselben Tabelle bleibt bestehen (App-Zugriff unverändert).

DROP POLICY IF EXISTS "allow_all_anon" ON public.wein_lager;


-- ══════════════════════════════════════════════════════════════════════════
--  NACH Phase 2 verbleiben nur noch "unkritische" WARNungen:
--    - rls_policy_always_true (authenticated USING(true))  → gewolltes Modell
--    - authenticated kann SECURITY DEFINER-Funktionen aufrufen → gewollt
--    - pg_net in public                                     → belassen
--
--  ── Manueller Rest (2 Klicks, nur wenn gewünscht) ──
--  Leaked-Password-Schutz aktivieren:
--    Dashboard → Authentication → Policies/Settings →
--    "Leaked password protection" / "Check against HaveIBeenPwned" → ON
--
--  ── OPTIONAL: pro-Rolle einschränken (Beispiel) ──
--  Wenn z. B. nur Admins Mitarbeiterstammdaten ändern dürfen sollen:
--
--    DROP POLICY IF EXISTS "authenticated_write" ON public.employees;
--    CREATE POLICY "employees_select" ON public.employees
--      FOR SELECT TO authenticated USING (true);
--    CREATE POLICY "employees_admin_write" ON public.employees
--      FOR ALL TO authenticated
--      USING (public.is_admin(auth.uid()))
--      WITH CHECK (public.is_admin(auth.uid()));
-- ══════════════════════════════════════════════════════════════════════════

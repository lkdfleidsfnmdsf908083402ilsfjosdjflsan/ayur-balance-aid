-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Sicherheits-Härtung  ·  Ayur Balance Aid / Mandira-KPI-Dashboard
--  Behebt die Befunde des Supabase Security Advisors:
--    1. "RLS disabled in public"      → RLS auf ALLEN Basistabellen aktivieren
--    2. "Anonymer Vollzugriff"        → anon-Rolle komplett aus public entziehen
--    3. "Security Definer View"       → alle Views auf security_invoker umstellen
--
--  Kernproblem war NICHT nur fehlendes RLS, sondern dass die bestehenden
--  Policies "USING (true)" OHNE Rollen-Einschränkung galten → also für
--  `public` inkl. `anon`. Jeder mit dem (öffentlichen) anon-Key konnte damit
--  lesen UND schreiben.
--
--  Sicherheitsmodell dieser App:
--    - Das Dashboard ist vollständig login-gated (ProtectedRoute → /auth).
--    - Der Invite-Flow läuft server-seitig über eine Edge Function mit
--      service_role. Es gibt KEINEN legitimen anonymen Tabellenzugriff.
--    → Deshalb: anon wird komplett gesperrt, `authenticated` behält Vollzugriff.
--
--  Diese Migration ist IDEMPOTENT und NICHT-DESTRUKTIV:
--    - Sie nimmt eingeloggten Nutzern KEINEN Zugriff weg (Dashboard bleibt live).
--    - Sie überschreibt KEINE bereits vorhandenen, restriktiveren Policies:
--      eine Fallback-Policy wird nur dort angelegt, wo eine Tabelle nach dem
--      RLS-Einschalten gar keine Policy hätte (sonst wären eingeloggte Nutzer
--      ausgesperrt).
--    - Mehrfaches Ausführen ist gefahrlos (z. B. nach Anlegen neuer Tabellen).
-- ══════════════════════════════════════════════════════════════════════════


-- ─── 1) anon-Rolle den Tabellen-/View-Zugriff im public-Schema entziehen ────
--
-- Das ist der wirksamste, regressionsfreie Hebel: In Supabase/PostgREST braucht
-- eine Rolle einen Tabellen-GRANT, um überhaupt zuzugreifen. Ohne GRANT ist
-- anon ausgesperrt — unabhängig davon, ob RLS an ist oder wie die Policies
-- aussehen. `ALL TABLES` umfasst in Postgres auch Views.
--
-- `authenticated` behält seine GRANTs → das Dashboard funktioniert weiter.

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Auch künftig angelegte Tabellen sollen anon nicht automatisch offenstehen.
-- (Für die Rollen, die üblicherweise Tabellen anlegen — best effort.)
DO $$
DECLARE
  creator TEXT;
BEGIN
  FOREACH creator IN ARRAY ARRAY['postgres', 'supabase_admin', current_user] LOOP
    BEGIN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon;',
        creator
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;',
        creator
      );
    EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
      -- Rolle existiert nicht oder wir sind nicht Mitglied → überspringen.
      RAISE NOTICE 'Default-Privileges für Rolle % übersprungen (%).', creator, SQLERRM;
    END;
  END LOOP;
END $$;


-- ─── 2) RLS auf JEDER Basistabelle aktivieren (+ Fallback-Policy) ───────────
--
-- Deckt auch Live-Tabellen ab, die in den lokalen Migrations fehlen
-- (protel_*, tac_*, wein_*, guests, …). Eine Fallback-Policy für
-- `authenticated` wird NUR angelegt, wenn die Tabelle sonst gar keine Policy
-- hätte — damit eingeloggte Nutzer nach dem RLS-Einschalten nicht ausgesperrt
-- werden. Bereits vorhandene Policies bleiben unangetastet.

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- RLS einschalten (idempotent)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);

    -- Fallback-Policy nur, wenn die Tabelle noch KEINE Policy hat
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t.tablename
    ) THEN
      EXECUTE format($f$
        CREATE POLICY "authenticated_full_access" ON public.%I
          FOR ALL
          TO authenticated
          USING (true)
          WITH CHECK (true);
      $f$, t.tablename);
      RAISE NOTICE 'Fallback-Policy (authenticated) angelegt für: %', t.tablename;
    END IF;
  END LOOP;
END $$;


-- ─── 3) Alle Views auf security_invoker umstellen ───────────────────────────
--
-- Standard-Views laufen mit den Rechten des Erstellers (postgres) und umgehen
-- damit RLS der zugrunde liegenden Tabellen ("Security Definer View"-Befund).
-- security_invoker=on lässt die View mit den Rechten des ABFRAGENDEN Nutzers
-- laufen → RLS greift korrekt. (Benötigt Postgres 15+, in Supabase gegeben.)

DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on);', v.table_name);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'View % konnte nicht umgestellt werden: %', v.table_name, SQLERRM;
    END;
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
--  Nach dieser Migration:
--    ✓ anon (öffentlicher Frontend-Key) hat KEINEN Tabellen-/View-Zugriff mehr
--    ✓ RLS ist auf allen Basistabellen aktiv
--    ✓ eingeloggte Nutzer (authenticated) behalten vollen Zugriff → App läuft
--    ✓ Views umgehen RLS nicht mehr
--
--  OPTIONALE FEINGRANULARITÄT (bewusst NICHT automatisch gemacht, da es je
--  nach gewünschtem Rollenmodell den Zugriff eingeloggter Nutzer einschränkt):
--  Wer z. B. `user_roles`/`profiles` nur für Admins schreibbar machen will,
--  ersetzt dort die Fallback-Policy durch eine rollenbasierte Policy, etwa:
--
--    DROP POLICY IF EXISTS "authenticated_full_access" ON public.user_roles;
--    CREATE POLICY "user_roles_admin_write" ON public.user_roles
--      FOR ALL TO authenticated
--      USING (public.is_admin())          -- vorhandene SECURITY-DEFINER-Helper
--      WITH CHECK (public.is_admin());
-- ══════════════════════════════════════════════════════════════════════════

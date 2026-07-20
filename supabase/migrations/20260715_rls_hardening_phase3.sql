-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 3 · Ayur Balance Aid / Mandira-KPI-Dashboard
--
--  Schließt die 7 verbliebenen `anon_security_definer_function_executable`-
--  Warnungen. Phase 2 entzog nur den direkten anon-Grant auf Funktionen — der
--  von PostgreSQL standardmäßig vergebene EXECUTE-Grant an die Sammelrolle
--  PUBLIC (die anon einschließt) blieb bestehen. Daher konnte anon die
--  SECURITY-DEFINER-Funktionen weiterhin per /rest/v1/rpc/* aufrufen.
--
--  Vorgehen (nur für EIGENE Funktionen, Extension-Funktionen wie pg_net bleiben
--  unberührt): EXECUTE von PUBLIC und anon entziehen, für authenticated und
--  service_role explizit (wieder-)gewähren. Ohne das explizite Grant würden
--  Policy-Aufrufe wie is_admin()/get_user_role() für eingeloggte Nutzer
--  scheitern — dieser Schritt hält das Dashboard also bewusst funktionsfähig.
--
--  Idempotent & nicht-destruktiv.
-- ══════════════════════════════════════════════════════════════════════════

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
      -- anon (direkt + über PUBLIC) den Ausführungszugriff entziehen
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon;',
        r.proname, r.args
      );
      -- App-Rollen behalten den Zugriff (sonst brechen Policy-Funktionsaufrufe)
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role;',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'EXECUTE-Grants für %(%): übersprungen — %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
--  Endzustand nach Phase 3 — es verbleiben NUR noch bewusste Warnungen:
--
--    • rls_policy_always_true (authenticated USING(true))
--        → gewolltes Modell "jeder eingeloggte Mitarbeiter darf alles".
--          Nur ändern, wenn pro Rolle eingeschränkt werden soll
--          (Beispiel in Phase 2 am Dateiende).
--
--    • authenticated_security_definer_function_executable
--        → is_admin/get_user_role/… MÜSSEN von eingeloggten Nutzern
--          aufrufbar sein (Policies, Login-Flow). Bewusst so.
--          Reine Cron-Funktionen (call_send_reminder,
--          call_reminder_edge_function) könnte man zusätzlich auf
--          service_role beschränken — nur, wenn sie NICHT vom Frontend
--          aufgerufen werden. Vorher im Code prüfen.
--
--    • extension_in_public (pg_net) → belassen.
--
--    • auth_leaked_password_protection → Dashboard-Toggle:
--        Authentication → Policies/Settings →
--        "Leaked password protection / HaveIBeenPwned" → ON
-- ══════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 7 · Selbst-Eskalation über user_profiles.role verhindern
--
--  Befund (Audit): Der Admin-Check im Frontend UND in den Social-Edge-Functions
--  (pruefeAufrufer) liest die Rolle aus public.user_profiles. Für user_profiles
--  existieren keine Policies in den Migrationen (live/Lovable angelegt). Falls
--  ein Nutzer seine EIGENE Zeile aktualisieren darf, könnte er role='admin'
--  setzen und sich selbst zum Admin machen → alle Admin-Gates umgangen.
--
--  Fix (unabhängig vom aktuellen Policy-Zustand): Ein BEFORE-UPDATE-Trigger
--  verbietet das Ändern der Spalte `role`, außer:
--    - der Aufrufer ist bereits Admin (has_role), oder
--    - es ist ein Server-Zugriff mit service_role (Onboarding/Cron, auth.role()).
--  Normale Profil-Änderungen (Name, Sprache, …) bleiben unberührt; INSERTs
--  (Erst-Anlage des eigenen Profils) sind nicht betroffen.
--
--  Idempotent.
-- ══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.schuetze_user_profile_rolle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND coalesce(auth.role(), '') <> 'service_role'
     AND NOT has_role(auth.uid(), 'admin'::app_role)
  THEN
    RAISE EXCEPTION 'Rollenänderung ist nur Administratoren erlaubt.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schuetze_user_profile_rolle ON public.user_profiles;
CREATE TRIGGER trg_schuetze_user_profile_rolle
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.schuetze_user_profile_rolle();

-- ── Zusätzlich empfohlen: aktuellen Policy-Zustand prüfen ──────────────────
-- Führe einmal aus und schau, ob eine breite UPDATE-Policy existiert:
--   SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles';
-- Falls dort eine "authenticated_full_access"-Policy mit qual/with_check = true
-- steht, ist der Trigger oben die Absicherung; sauberer wäre zusätzlich eine
-- UPDATE-Policy, die nur die eigene Zeile erlaubt (id = auth.uid()).

-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 6b · erstanamnese nur für admin + medical
--
--  erstanamnese enthält Gesundheitsdaten (DSGVO Art. 9): Diagnosen, Medikamente,
--  psychische Zustände, Blutdruck, Familienanamnese. Bisher konnte jeder
--  eingeloggte Mitarbeiter (auch Küche/Technik/Housekeeping) alles lesen.
--  Neu: nur 'admin' und 'medical' dürfen lesen UND schreiben.
--
--  ⚠️ REIHENFOLGE: ERST Phase 6a laufen lassen UND das medizinische Personal
--  mit der Rolle 'medical' ausstatten (public.user_roles!). Wird diese
--  Migration vorher eingespielt, verlieren Therapeuten sofort den Zugriff.
--
--  guests / protel_gaeste / tac_kunden bleiben BEWUSST unangetastet — sie
--  werden in vielen operativen Ansichten (Front-Office, Kampagnen, KPIs)
--  gebraucht; eine Sperre dort würde die App lahmlegen.
--
--  Idempotent.
-- ══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "authenticated_full_access"     ON public.erstanamnese;
DROP POLICY IF EXISTS "erstanamnese_medical_access"    ON public.erstanamnese;

CREATE POLICY "erstanamnese_medical_access" ON public.erstanamnese
  FOR ALL
  TO authenticated
  USING      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'medical'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'medical'::app_role));

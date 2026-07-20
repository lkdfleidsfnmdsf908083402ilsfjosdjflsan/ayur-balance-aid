-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 4 · Rollenmodell an UI angleichen (optional)
--
--  Bisher: auf diesen Tabellen darf JEDER eingeloggte Nutzer schreiben
--  (allow-all-Policy). Das UI erlaubt das Bearbeiten aber nur bestimmten
--  Rollen. Diese Migration schließt die Lücke "mitarbeiter schreibt per API
--  vorbei", OHNE legitime Abläufe zu brechen:
--    - LESEN bleibt für alle eingeloggten Nutzer offen (Dashboards/Planung).
--    - SCHREIBEN nur für die Rollen, die es im UI ohnehin dürfen.
--
--  Bereits sauber abgesichert und daher NICHT Teil dieser Migration:
--    user_roles, profiles, invitations, konten, budget_planung, salden_monat.
--
--  Bewusst NICHT angefasst (geteiltes-Daten-Modell / Datenschutz-Entscheidung):
--    Tagesberichte, protel_*, tac_*, social_*, wein_*, erstanamnese,
--    protel_gaeste, tac_kunden.
--
--  Nutzt die vorhandene SECURITY-DEFINER-Funktion has_role(uuid, app_role)
--  (keine RLS-Rekursion). Idempotent.
-- ══════════════════════════════════════════════════════════════════════════


-- ─── Mitarbeiter-Stammdaten: lesen alle, schreiben admin + abteilungsleiter ──
-- (entspricht der Ansicht "mitarbeiter" mit requiredRole: abteilungsleiter)

DROP POLICY IF EXISTS "authenticated_write"       ON public.employees;
DROP POLICY IF EXISTS "employees_select_all"      ON public.employees;
DROP POLICY IF EXISTS "employees_manager_write"   ON public.employees;

CREATE POLICY "employees_select_all" ON public.employees
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_manager_write" ON public.employees
  FOR ALL TO authenticated
  USING      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abteilungsleiter'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abteilungsleiter'::app_role));

DROP POLICY IF EXISTS "authenticated_write"              ON public.employees_history;
DROP POLICY IF EXISTS "employees_history_select_all"     ON public.employees_history;
DROP POLICY IF EXISTS "employees_history_manager_write"  ON public.employees_history;

CREATE POLICY "employees_history_select_all" ON public.employees_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_history_manager_write" ON public.employees_history
  FOR ALL TO authenticated
  USING      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abteilungsleiter'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'abteilungsleiter'::app_role));


-- ─── Facility-/Admin-Verwaltung: lesen alle, schreiben nur admin ─────────────
-- (entspricht dem UI-Bereich "Verwaltung" mit requiredRole: admin)
-- calendar_settings & reminder_log bleiben bewusst offen (ggf. automatisiert).

DO $$
DECLARE
  tbl   TEXT;
  oldp  TEXT;
  tables_policies TEXT[][] := ARRAY[
    ['admin_abnahme_protokoll', 'allow_all_abnahme'],
    ['admin_reparaturen',       'allow_all_reparaturen'],
    ['admin_tuev_wartungen',    'allow_all_tuev'],
    ['admin_versicherungen',    'allow_all_versicherungen']
  ];
  i INT;
BEGIN
  FOR i IN 1 .. array_length(tables_policies, 1) LOOP
    tbl  := tables_policies[i][1];
    oldp := tables_policies[i][2];

    -- alte allow-all-Policy + evtl. frühere Läufe entfernen
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', oldp, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_select_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_admin_write', tbl);

    -- lesen: alle eingeloggten
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
      tbl || '_select_all', tbl
    );
    -- schreiben: nur admin
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      'USING (has_role(auth.uid(), ''admin''::app_role)) '
      'WITH CHECK (has_role(auth.uid(), ''admin''::app_role));',
      tbl || '_admin_write', tbl
    );
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════
--  Nach Phase 4:
--    - employees/employees_history: nur Manager/Admin schreiben, alle lesen
--    - admin_reparaturen/_tuev/_versicherungen/_abnahme: nur Admin schreiben
--    - alles andere unverändert
--
--  Test nach dem Einspielen: als Admin UND als normaler Mitarbeiter einloggen;
--  Mitarbeiter darf Stammdaten SEHEN, aber Speichern/Löschen wird (korrekt)
--  abgelehnt.  Falls ein legitimer Nicht-Manager-Flow schreibt: melden, dann
--  Rolle in der jeweiligen Policy ergänzen.
-- ══════════════════════════════════════════════════════════════════════════


-- Fix Security Definer Views - explizit als SECURITY INVOKER markieren
DROP VIEW IF EXISTS public.v_employee_department_stats;
DROP VIEW IF EXISTS public.v_daily_department_hours;

CREATE VIEW public.v_employee_department_stats
WITH (security_invoker = true)
AS
SELECT 
  e.abteilung,
  COUNT(*) FILTER (WHERE e.aktiv = true) as aktive_mitarbeiter,
  COUNT(*) FILTER (WHERE e.aktiv = false) as inaktive_mitarbeiter,
  SUM(e.wochenstunden_soll) FILTER (WHERE e.aktiv = true) as gesamt_wochenstunden_soll,
  AVG(e.stundenlohn) FILTER (WHERE e.aktiv = true) as durchschnitt_stundenlohn,
  COUNT(*) FILTER (WHERE e.anstellungsart = 'Vollzeit' AND e.aktiv = true) as vollzeit_count,
  COUNT(*) FILTER (WHERE e.anstellungsart = 'Teilzeit' AND e.aktiv = true) as teilzeit_count,
  COUNT(*) FILTER (WHERE e.anstellungsart = 'Mini-Job' AND e.aktiv = true) as minijob_count,
  COUNT(*) FILTER (WHERE e.anstellungsart = 'Aushilfe' AND e.aktiv = true) as aushilfe_count
FROM public.employees e
GROUP BY e.abteilung;

CREATE VIEW public.v_daily_department_hours
WITH (security_invoker = true)
AS
SELECT 
  e.abteilung,
  s.datum,
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Arbeit') as mitarbeiter_anwesend,
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Krank') as mitarbeiter_krank,
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Urlaub') as mitarbeiter_urlaub,
  SUM(s.soll_stunden) as gesamt_soll_stunden,
  SUM(s.ist_stunden) as gesamt_ist_stunden,
  SUM(s.ueberstunden) as gesamt_ueberstunden,
  SUM(s.ist_stunden * e.stundenlohn) as gesamt_personalkosten
FROM public.employee_shifts s
JOIN public.employees e ON s.employee_id = e.id
GROUP BY e.abteilung, s.datum;

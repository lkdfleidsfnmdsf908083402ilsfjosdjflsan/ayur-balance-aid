
-- =====================================================
-- AGGREGIERTE MITARBEITER-KPIs PRO ABTEILUNG UND TAG
-- =====================================================

-- View für tägliche Personal-KPIs pro Abteilung (aus Schichtdaten)
CREATE OR REPLACE VIEW public.v_department_staff_kpis
WITH (security_invoker = true)
AS
SELECT 
  e.abteilung,
  s.datum,
  -- Mitarbeiter-Zahlen
  COUNT(DISTINCT e.id) FILTER (WHERE s.abwesenheit = 'Arbeit') as mitarbeiter_anwesend,
  COUNT(DISTINCT e.id) FILTER (WHERE s.abwesenheit = 'Krank') as mitarbeiter_krank,
  COUNT(DISTINCT e.id) FILTER (WHERE s.abwesenheit = 'Urlaub') as mitarbeiter_urlaub,
  COUNT(DISTINCT e.id) as mitarbeiter_geplant,
  
  -- Stunden
  COALESCE(SUM(s.soll_stunden) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as soll_stunden,
  COALESCE(SUM(s.ist_stunden) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as ist_stunden,
  COALESCE(SUM(s.ueberstunden), 0) as ueberstunden,
  
  -- Kosten (basierend auf Ist-Stunden * Stundenlohn)
  COALESCE(SUM(s.ist_stunden * e.stundenlohn) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as personalkosten,
  
  -- Durchschnittswerte
  CASE 
    WHEN COUNT(*) FILTER (WHERE s.abwesenheit = 'Arbeit') > 0 
    THEN AVG(s.ist_stunden) FILTER (WHERE s.abwesenheit = 'Arbeit')
    ELSE 0 
  END as durchschnitt_stunden_pro_ma,
  
  CASE 
    WHEN COUNT(*) FILTER (WHERE s.abwesenheit = 'Arbeit') > 0 
    THEN AVG(e.stundenlohn) FILTER (WHERE s.abwesenheit = 'Arbeit')
    ELSE 0 
  END as durchschnitt_stundenlohn,
  
  -- Anwesenheitsquote
  CASE 
    WHEN COUNT(DISTINCT e.id) > 0 
    THEN (COUNT(DISTINCT e.id) FILTER (WHERE s.abwesenheit = 'Arbeit')::NUMERIC / COUNT(DISTINCT e.id)) * 100
    ELSE 0 
  END as anwesenheitsquote_pct,
  
  -- Krankenquote
  CASE 
    WHEN COUNT(DISTINCT e.id) > 0 
    THEN (COUNT(DISTINCT e.id) FILTER (WHERE s.abwesenheit = 'Krank')::NUMERIC / COUNT(DISTINCT e.id)) * 100
    ELSE 0 
  END as krankenquote_pct

FROM public.employee_shifts s
JOIN public.employees e ON s.employee_id = e.id
WHERE e.aktiv = true
GROUP BY e.abteilung, s.datum;

-- =====================================================
-- MONATLICHE AGGREGATION PRO ABTEILUNG
-- =====================================================
CREATE OR REPLACE VIEW public.v_department_monthly_staff_kpis
WITH (security_invoker = true)
AS
SELECT 
  e.abteilung,
  EXTRACT(YEAR FROM s.datum)::INTEGER as jahr,
  EXTRACT(MONTH FROM s.datum)::INTEGER as monat,
  
  -- Mitarbeiter (Durchschnitt pro Tag)
  COUNT(DISTINCT e.id) as mitarbeiter_gesamt,
  
  -- Stunden gesamt
  COALESCE(SUM(s.soll_stunden) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as soll_stunden_monat,
  COALESCE(SUM(s.ist_stunden) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as ist_stunden_monat,
  COALESCE(SUM(s.ueberstunden), 0) as ueberstunden_monat,
  
  -- Kosten gesamt
  COALESCE(SUM(s.ist_stunden * e.stundenlohn) FILTER (WHERE s.abwesenheit = 'Arbeit'), 0) as personalkosten_monat,
  
  -- Abwesenheitstage
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Krank') as krankheitstage,
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Urlaub') as urlaubstage,
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Fortbildung') as fortbildungstage,
  
  -- Arbeitstage
  COUNT(*) FILTER (WHERE s.abwesenheit = 'Arbeit') as arbeitstage,
  
  -- Quoten
  CASE 
    WHEN COUNT(*) > 0 
    THEN (COUNT(*) FILTER (WHERE s.abwesenheit = 'Arbeit')::NUMERIC / COUNT(*)) * 100
    ELSE 0 
  END as anwesenheitsquote_pct,
  
  CASE 
    WHEN COUNT(*) > 0 
    THEN (COUNT(*) FILTER (WHERE s.abwesenheit = 'Krank')::NUMERIC / COUNT(*)) * 100
    ELSE 0 
  END as krankenquote_pct

FROM public.employee_shifts s
JOIN public.employees e ON s.employee_id = e.id
WHERE e.aktiv = true
GROUP BY e.abteilung, EXTRACT(YEAR FROM s.datum), EXTRACT(MONTH FROM s.datum);

-- =====================================================
-- MAPPING VON ABTEILUNGEN ZU KPI-TABELLEN
-- =====================================================
-- Housekeeping = Housekeeping
-- Küche = kitchen
-- Service = service  
-- Rezeption = frontoffice
-- Spa = spa
-- Technik = technical
-- Verwaltung = admin

-- =====================================================
-- FUNCTION: Personal-KPIs für eine Abteilung an einem Tag abrufen
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_department_staff_stats(
  p_abteilung TEXT,
  p_datum DATE
)
RETURNS TABLE (
  mitarbeiter_anwesend BIGINT,
  mitarbeiter_krank BIGINT,
  mitarbeiter_urlaub BIGINT,
  soll_stunden NUMERIC,
  ist_stunden NUMERIC,
  ueberstunden NUMERIC,
  personalkosten NUMERIC,
  anwesenheitsquote_pct NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    COALESCE(v.mitarbeiter_anwesend, 0),
    COALESCE(v.mitarbeiter_krank, 0),
    COALESCE(v.mitarbeiter_urlaub, 0),
    COALESCE(v.soll_stunden, 0),
    COALESCE(v.ist_stunden, 0),
    COALESCE(v.ueberstunden, 0),
    COALESCE(v.personalkosten, 0),
    COALESCE(v.anwesenheitsquote_pct, 0)
  FROM public.v_department_staff_kpis v
  WHERE v.abteilung = p_abteilung AND v.datum = p_datum;
$$;

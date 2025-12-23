
-- =====================================================
-- MITARBEITER-MANAGEMENT MODUL
-- =====================================================

-- 1. ENUM für Beschäftigungsart
CREATE TYPE public.employment_type AS ENUM ('Vollzeit', 'Teilzeit', 'Mini-Job', 'Aushilfe', 'Praktikant', 'Azubi');

-- 2. ENUM für Abwesenheitsgründe
CREATE TYPE public.absence_reason AS ENUM ('Arbeit', 'Urlaub', 'Krank', 'Fortbildung', 'Frei', 'Überstundenabbau', 'Elternzeit', 'Sonstiges');

-- =====================================================
-- MITARBEITER STAMMDATEN
-- =====================================================
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  personalnummer TEXT NOT NULL UNIQUE,
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  email TEXT,
  telefon TEXT,
  
  -- Beschäftigung
  abteilung TEXT NOT NULL,
  position TEXT,
  anstellungsart employment_type NOT NULL DEFAULT 'Vollzeit',
  wochenstunden_soll NUMERIC NOT NULL DEFAULT 40 CHECK (wochenstunden_soll >= 0 AND wochenstunden_soll <= 60),
  stundenlohn NUMERIC NOT NULL DEFAULT 0 CHECK (stundenlohn >= 0),
  
  -- Zeitraum
  eintrittsdatum DATE NOT NULL,
  austrittsdatum DATE,
  
  -- Status
  aktiv BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SCHICHTPLANUNG / TÄGLICHE ARBEITSZEIT
-- =====================================================
CREATE TABLE public.employee_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  
  -- Geplante Arbeitszeit
  soll_stunden NUMERIC NOT NULL DEFAULT 8 CHECK (soll_stunden >= 0 AND soll_stunden <= 16),
  schicht_beginn TIME,
  schicht_ende TIME,
  
  -- Tatsächliche Arbeitszeit
  ist_stunden NUMERIC CHECK (ist_stunden >= 0 AND ist_stunden <= 16),
  ist_beginn TIME,
  ist_ende TIME,
  
  -- Automatisch berechnet
  ueberstunden NUMERIC DEFAULT 0,
  
  -- Abwesenheit
  abwesenheit absence_reason NOT NULL DEFAULT 'Arbeit',
  abwesenheit_notiz TEXT,
  
  -- Pause
  pause_minuten INTEGER DEFAULT 0 CHECK (pause_minuten >= 0 AND pause_minuten <= 120),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: Ein Eintrag pro Mitarbeiter pro Tag
  UNIQUE(employee_id, datum)
);

-- =====================================================
-- ZEITKONTEN (Monatliche Salden)
-- =====================================================
CREATE TABLE public.employee_time_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL CHECK (monat >= 1 AND monat <= 12),
  
  -- Überstunden
  ueberstunden_saldo NUMERIC NOT NULL DEFAULT 0,
  ueberstunden_neu NUMERIC NOT NULL DEFAULT 0,
  ueberstunden_abgebaut NUMERIC NOT NULL DEFAULT 0,
  
  -- Urlaub
  urlaub_anspruch_tage INTEGER NOT NULL DEFAULT 0,
  urlaub_genommen_tage INTEGER NOT NULL DEFAULT 0,
  urlaub_rest_tage INTEGER NOT NULL DEFAULT 0,
  
  -- Krankheit
  krankheitstage INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(employee_id, jahr, monat)
);

-- =====================================================
-- TRIGGER: Überstunden automatisch berechnen
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_shift_overtime()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Überstunden nur berechnen wenn Ist-Stunden erfasst und Arbeit geleistet wurde
  IF NEW.ist_stunden IS NOT NULL AND NEW.abwesenheit = 'Arbeit' THEN
    NEW.ueberstunden := NEW.ist_stunden - NEW.soll_stunden;
  ELSE
    NEW.ueberstunden := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_shift_overtime_trigger
  BEFORE INSERT OR UPDATE ON public.employee_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_shift_overtime();

-- =====================================================
-- TRIGGER: Updated_at für alle Tabellen
-- =====================================================
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_shifts_updated_at
  BEFORE UPDATE ON public.employee_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_time_balances_updated_at
  BEFORE UPDATE ON public.employee_time_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_time_balances ENABLE ROW LEVEL SECURITY;

-- Employees Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Mitarbeiter" 
  ON public.employees FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Mitarbeiter" 
  ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Mitarbeiter" 
  ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Mitarbeiter" 
  ON public.employees FOR DELETE USING (true);

-- Employee Shifts Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Schichten" 
  ON public.employee_shifts FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Schichten" 
  ON public.employee_shifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Schichten" 
  ON public.employee_shifts FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Schichten" 
  ON public.employee_shifts FOR DELETE USING (true);

-- Time Balances Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Zeitkonten" 
  ON public.employee_time_balances FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Zeitkonten" 
  ON public.employee_time_balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Zeitkonten" 
  ON public.employee_time_balances FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Zeitkonten" 
  ON public.employee_time_balances FOR DELETE USING (true);

-- =====================================================
-- HELPER VIEWS für Aggregationen
-- =====================================================
CREATE OR REPLACE VIEW public.v_employee_department_stats AS
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

CREATE OR REPLACE VIEW public.v_daily_department_hours AS
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

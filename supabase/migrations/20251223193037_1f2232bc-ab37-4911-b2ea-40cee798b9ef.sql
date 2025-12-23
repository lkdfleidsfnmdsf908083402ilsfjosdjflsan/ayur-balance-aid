-- Spa Daily Reports Tabelle
CREATE TABLE public.spa_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- Kapazität & Auslastung
  available_treatment_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  booked_treatment_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  treatments_total INTEGER NOT NULL DEFAULT 0,
  guests_total INTEGER NOT NULL DEFAULT 0,
  
  -- Personal
  therapists_on_duty INTEGER NOT NULL DEFAULT 0,
  therapist_hours_total NUMERIC(6,2) NOT NULL DEFAULT 0,
  
  -- Umsatz
  spa_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  retail_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Effizienz
  no_shows INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  bookings_total INTEGER NOT NULL DEFAULT 0,
  
  -- Qualität
  spa_complaints INTEGER NOT NULL DEFAULT 0,
  spa_ratings_count INTEGER NOT NULL DEFAULT 0,
  spa_ratings_sum INTEGER NOT NULL DEFAULT 0,
  
  -- Personal-KPIs (optional)
  attendance_rate NUMERIC(5,2) NULL,
  turnover_rate NUMERIC(5,2) NULL,
  
  -- Berechnete KPIs (werden beim Insert/Update berechnet)
  room_utilization_pct NUMERIC(5,2) NULL,
  therapist_utilization_pct NUMERIC(5,2) NULL,
  revpath NUMERIC(10,2) NULL,
  revenue_per_guest NUMERIC(10,2) NULL,
  retail_ratio_pct NUMERIC(5,2) NULL,
  treatments_per_therapist NUMERIC(5,2) NULL,
  avg_spa_rating NUMERIC(3,2) NULL,
  complaint_rate_pct NUMERIC(5,2) NULL,
  no_show_rate_pct NUMERIC(5,2) NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spa_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Spa Reports" 
ON public.spa_daily_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Spa Reports" 
ON public.spa_daily_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Spa Reports" 
ON public.spa_daily_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Spa Reports" 
ON public.spa_daily_reports 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_spa_daily_reports_updated_at
BEFORE UPDATE ON public.spa_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger-Funktion für KPI-Berechnungen
CREATE OR REPLACE FUNCTION public.calculate_spa_kpis()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Room Utilization %
  IF NEW.available_treatment_hours > 0 THEN
    NEW.room_utilization_pct := (NEW.booked_treatment_hours / NEW.available_treatment_hours) * 100;
  END IF;
  
  -- Therapist Utilization %
  IF NEW.therapist_hours_total > 0 THEN
    NEW.therapist_utilization_pct := (NEW.booked_treatment_hours / NEW.therapist_hours_total) * 100;
  END IF;
  
  -- RevPATH
  IF NEW.available_treatment_hours > 0 THEN
    NEW.revpath := NEW.spa_revenue / NEW.available_treatment_hours;
  END IF;
  
  -- Revenue per Guest
  IF NEW.guests_total > 0 THEN
    NEW.revenue_per_guest := NEW.spa_revenue / NEW.guests_total;
  END IF;
  
  -- Retail Ratio %
  IF (NEW.spa_revenue + NEW.retail_revenue) > 0 THEN
    NEW.retail_ratio_pct := (NEW.retail_revenue / (NEW.spa_revenue + NEW.retail_revenue)) * 100;
  END IF;
  
  -- Treatments per Therapist
  IF NEW.therapists_on_duty > 0 THEN
    NEW.treatments_per_therapist := NEW.treatments_total::NUMERIC / NEW.therapists_on_duty;
  END IF;
  
  -- Average Spa Rating
  IF NEW.spa_ratings_count > 0 THEN
    NEW.avg_spa_rating := NEW.spa_ratings_sum::NUMERIC / NEW.spa_ratings_count;
  END IF;
  
  -- Complaint Rate %
  IF NEW.guests_total > 0 THEN
    NEW.complaint_rate_pct := (NEW.spa_complaints::NUMERIC / NEW.guests_total) * 100;
  END IF;
  
  -- No-Show Rate %
  IF NEW.bookings_total > 0 THEN
    NEW.no_show_rate_pct := (NEW.no_shows::NUMERIC / NEW.bookings_total) * 100;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger für automatische KPI-Berechnung
CREATE TRIGGER calculate_spa_kpis_trigger
BEFORE INSERT OR UPDATE ON public.spa_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_spa_kpis();
-- Front Office Tagesreports Tabelle
CREATE TABLE public.frontoffice_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,

  arrivals_total INT NOT NULL DEFAULT 0,
  departures_total INT NOT NULL DEFAULT 0,

  avg_checkin_time_sec INT NOT NULL DEFAULT 0,
  avg_checkout_time_sec INT NOT NULL DEFAULT 0,
  avg_queue_time_sec INT NULL,

  fo_staff_on_duty INT NOT NULL DEFAULT 0,
  fo_hours_total NUMERIC(6,2) NOT NULL DEFAULT 0,

  requests_total INT NOT NULL DEFAULT 0,
  requests_resolved_first_contact INT NOT NULL DEFAULT 0,

  fo_complaints INT NOT NULL DEFAULT 0,

  upsell_attempts INT NOT NULL DEFAULT 0,
  upsell_successes INT NOT NULL DEFAULT 0,
  upsell_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,

  fo_ratings_count INT NOT NULL DEFAULT 0,
  fo_ratings_sum INT NOT NULL DEFAULT 0,

  attendance_rate NUMERIC(5,2) NULL,
  turnover_rate NUMERIC(5,2) NULL,

  -- Berechnete KPIs
  guests_per_fo_employee NUMERIC(6,2) NULL,
  requests_per_hour NUMERIC(6,2) NULL,
  fcr_pct NUMERIC(5,2) NULL,
  fo_complaint_rate_pct NUMERIC(6,3) NULL,
  avg_fo_rating NUMERIC(3,2) NULL,
  upsell_conversion_pct NUMERIC(5,2) NULL,
  upsell_rev_per_arrival NUMERIC(10,2) NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.frontoffice_daily_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Öffentlicher Lesezugriff auf FO Reports" 
ON public.frontoffice_daily_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf FO Reports" 
ON public.frontoffice_daily_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf FO Reports" 
ON public.frontoffice_daily_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf FO Reports" 
ON public.frontoffice_daily_reports 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_frontoffice_daily_reports_updated_at
BEFORE UPDATE ON public.frontoffice_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
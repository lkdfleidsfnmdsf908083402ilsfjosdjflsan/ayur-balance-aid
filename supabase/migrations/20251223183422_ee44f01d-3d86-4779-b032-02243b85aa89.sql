-- Service-Tagesreports Tabelle
CREATE TABLE public.service_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,

  service_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  covers_total INT NOT NULL DEFAULT 0,
  tables_served INT NOT NULL DEFAULT 0,
  tables_available INT NULL,

  service_staff_on_duty INT NOT NULL DEFAULT 0,
  service_hours_total NUMERIC(6,2) NOT NULL DEFAULT 0,

  service_errors INT NOT NULL DEFAULT 0,
  items_total INT NOT NULL DEFAULT 0,

  service_complaints INT NOT NULL DEFAULT 0,

  service_ratings_count INT NOT NULL DEFAULT 0,
  service_ratings_sum INT NOT NULL DEFAULT 0,
  csat_positive_count INT NULL,
  csat_total_respondents INT NULL,

  attendance_rate NUMERIC(5,2) NULL,
  turnover_rate NUMERIC(5,2) NULL,

  -- Berechnete KPIs
  sales_per_cover NUMERIC(10,2) NULL,
  sales_per_server NUMERIC(10,2) NULL,
  covers_per_server_per_hour NUMERIC(6,2) NULL,
  table_turnover_rate NUMERIC(5,2) NULL,
  service_error_rate_pct NUMERIC(6,3) NULL,
  service_complaint_rate_pct NUMERIC(6,3) NULL,
  avg_service_rating NUMERIC(3,2) NULL,
  csat_pct NUMERIC(5,2) NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.service_daily_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Service Reports" 
ON public.service_daily_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Service Reports" 
ON public.service_daily_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Service Reports" 
ON public.service_daily_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Service Reports" 
ON public.service_daily_reports 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_service_daily_reports_updated_at
BEFORE UPDATE ON public.service_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Housekeeping Tagesreports Tabelle
CREATE TABLE public.hk_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- Basis-Daten
  rooms_in_sale INT NOT NULL DEFAULT 0,
  occupied_rooms INT NOT NULL DEFAULT 0,
  cleaned_rooms INT NOT NULL DEFAULT 0,
  
  -- Reinigungszeit
  avg_minutes_per_room NUMERIC(5,2) DEFAULT 0,
  total_cleaning_minutes INT DEFAULT 0,
  
  -- Personal
  hk_employees_on_duty INT NOT NULL DEFAULT 0,
  hk_hours_total NUMERIC(6,2) DEFAULT 0,
  shift_minutes INT DEFAULT 480,
  
  -- Qualität
  inspected_rooms INT NOT NULL DEFAULT 0,
  passed_rooms INT NOT NULL DEFAULT 0,
  complaints_cleanliness INT NOT NULL DEFAULT 0,
  
  -- Personal-KPIs
  attendance_rate NUMERIC(5,2) DEFAULT 0,
  turnover_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Berechnete KPIs (werden beim Speichern berechnet)
  rooms_per_attendant NUMERIC(6,2) DEFAULT 0,
  inspection_pass_rate NUMERIC(5,2) DEFAULT 0,
  complaint_rate NUMERIC(6,3) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.hk_daily_reports ENABLE ROW LEVEL SECURITY;

-- Öffentliche Policies (da keine Auth)
CREATE POLICY "Öffentlicher Lesezugriff auf HK Reports" 
ON public.hk_daily_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf HK Reports" 
ON public.hk_daily_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf HK Reports" 
ON public.hk_daily_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf HK Reports" 
ON public.hk_daily_reports 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_hk_daily_reports_updated_at
BEFORE UPDATE ON public.hk_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
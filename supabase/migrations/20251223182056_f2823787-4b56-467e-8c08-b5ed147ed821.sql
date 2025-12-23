-- Küchen-Tagesreports Tabelle
CREATE TABLE public.kitchen_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  food_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  food_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  covers_total INT NOT NULL DEFAULT 0,
  plates_total INT NOT NULL DEFAULT 0,
  
  kitchen_staff_on_duty INT NOT NULL DEFAULT 0,
  kitchen_hours_total NUMERIC(6,2) NOT NULL DEFAULT 0,
  kitchen_labour_cost NUMERIC(10,2) NULL,
  
  food_complaints INT NOT NULL DEFAULT 0,
  correct_orders INT NOT NULL DEFAULT 0,
  orders_total INT NOT NULL DEFAULT 0,
  
  food_waste_value NUMERIC(10,2) NULL,
  attendance_rate NUMERIC(5,2) NULL,
  turnover_rate NUMERIC(5,2) NULL,
  
  -- Berechnete KPIs
  food_cost_pct NUMERIC(5,2) NULL,
  food_cost_per_cover NUMERIC(10,2) NULL,
  kitchen_labour_pct NUMERIC(5,2) NULL,
  prime_cost_pct NUMERIC(5,2) NULL,
  meals_per_employee NUMERIC(6,2) NULL,
  plates_per_hour NUMERIC(6,2) NULL,
  complaint_rate_pct NUMERIC(6,3) NULL,
  order_accuracy_pct NUMERIC(5,2) NULL,
  food_waste_pct NUMERIC(5,2) NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.kitchen_daily_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Kitchen Reports" 
ON public.kitchen_daily_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Kitchen Reports" 
ON public.kitchen_daily_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Kitchen Reports" 
ON public.kitchen_daily_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Kitchen Reports" 
ON public.kitchen_daily_reports 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_kitchen_daily_reports_updated_at
BEFORE UPDATE ON public.kitchen_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
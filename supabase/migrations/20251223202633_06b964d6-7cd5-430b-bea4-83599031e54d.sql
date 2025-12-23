-- Create table for daily administration/back-office reports
CREATE TABLE public.admin_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- HR/Personal
  open_positions INTEGER NOT NULL DEFAULT 0,
  applications_received INTEGER NOT NULL DEFAULT 0,
  new_hires INTEGER NOT NULL DEFAULT 0,
  terminations INTEGER NOT NULL DEFAULT 0,
  sick_days INTEGER NOT NULL DEFAULT 0,
  total_employees INTEGER NOT NULL DEFAULT 0,
  planned_employees INTEGER NOT NULL DEFAULT 0,
  
  -- Finanzen
  open_invoices_count INTEGER NOT NULL DEFAULT 0,
  open_invoices_value NUMERIC NOT NULL DEFAULT 0,
  paid_invoices_count INTEGER NOT NULL DEFAULT 0,
  open_receivables NUMERIC NOT NULL DEFAULT 0,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  daily_revenue NUMERIC NOT NULL DEFAULT 0,
  daily_expenses NUMERIC NOT NULL DEFAULT 0,
  
  -- IT Support
  it_tickets_open INTEGER NOT NULL DEFAULT 0,
  it_tickets_resolved INTEGER NOT NULL DEFAULT 0,
  system_downtime_min INTEGER NOT NULL DEFAULT 0,
  
  -- Einkauf
  orders_placed INTEGER NOT NULL DEFAULT 0,
  deliveries_received INTEGER NOT NULL DEFAULT 0,
  supplier_complaints INTEGER NOT NULL DEFAULT 0,
  
  -- Verwaltung Personal
  admin_staff_on_duty INTEGER NOT NULL DEFAULT 0,
  admin_hours_total NUMERIC NOT NULL DEFAULT 0,
  attendance_rate NUMERIC,
  turnover_rate NUMERIC,
  
  -- Calculated KPIs (via trigger)
  sick_rate_pct NUMERIC,
  open_positions_rate_pct NUMERIC,
  monthly_turnover_rate_pct NUMERIC,
  payment_compliance_pct NUMERIC,
  dso_days NUMERIC,
  dpo_days NUMERIC,
  it_availability_pct NUMERIC,
  it_resolution_rate_pct NUMERIC,
  supplier_complaint_rate_pct NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Öffentlicher Lesezugriff auf Admin Reports" 
ON public.admin_daily_reports FOR SELECT USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Admin Reports" 
ON public.admin_daily_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Admin Reports" 
ON public.admin_daily_reports FOR UPDATE USING (true);

CREATE POLICY "Öffentlicher Delete auf Admin Reports" 
ON public.admin_daily_reports FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_admin_reports_updated_at
BEFORE UPDATE ON public.admin_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate Admin KPIs
CREATE OR REPLACE FUNCTION public.calculate_admin_kpis()
RETURNS TRIGGER AS $$
BEGIN
  -- Sick Rate % (Krankenquote)
  IF NEW.total_employees > 0 THEN
    NEW.sick_rate_pct := (NEW.sick_days::NUMERIC / NEW.total_employees) * 100;
  END IF;
  
  -- Open Positions Rate %
  IF NEW.planned_employees > 0 THEN
    NEW.open_positions_rate_pct := (NEW.open_positions::NUMERIC / NEW.planned_employees) * 100;
  END IF;
  
  -- Monthly Turnover Rate % (annualized)
  IF NEW.total_employees > 0 THEN
    NEW.monthly_turnover_rate_pct := (NEW.terminations::NUMERIC / NEW.total_employees) * 100;
  END IF;
  
  -- Payment Compliance % (based on paid vs total invoices)
  IF (NEW.paid_invoices_count + NEW.open_invoices_count) > 0 THEN
    NEW.payment_compliance_pct := (NEW.paid_invoices_count::NUMERIC / (NEW.paid_invoices_count + NEW.open_invoices_count)) * 100;
  END IF;
  
  -- DSO (Days Sales Outstanding)
  IF NEW.daily_revenue > 0 THEN
    NEW.dso_days := NEW.open_receivables / NEW.daily_revenue;
  END IF;
  
  -- DPO (Days Payable Outstanding)
  IF NEW.daily_expenses > 0 THEN
    NEW.dpo_days := NEW.open_invoices_value / NEW.daily_expenses;
  END IF;
  
  -- IT Availability % (1440 min = 24h)
  NEW.it_availability_pct := ((1440 - NEW.system_downtime_min)::NUMERIC / 1440) * 100;
  
  -- IT Resolution Rate %
  IF (NEW.it_tickets_open + NEW.it_tickets_resolved) > 0 THEN
    NEW.it_resolution_rate_pct := (NEW.it_tickets_resolved::NUMERIC / (NEW.it_tickets_open + NEW.it_tickets_resolved)) * 100;
  END IF;
  
  -- Supplier Complaint Rate %
  IF NEW.deliveries_received > 0 THEN
    NEW.supplier_complaint_rate_pct := (NEW.supplier_complaints::NUMERIC / NEW.deliveries_received) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER calculate_admin_kpis_trigger
BEFORE INSERT OR UPDATE ON public.admin_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_admin_kpis();
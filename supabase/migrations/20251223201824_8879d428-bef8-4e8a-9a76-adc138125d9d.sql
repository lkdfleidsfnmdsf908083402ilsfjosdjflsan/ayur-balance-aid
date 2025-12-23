-- Create table for daily technical/maintenance reports
CREATE TABLE public.technical_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- Ticket Management
  open_tickets INTEGER NOT NULL DEFAULT 0,
  new_tickets INTEGER NOT NULL DEFAULT 0,
  resolved_tickets INTEGER NOT NULL DEFAULT 0,
  avg_resolution_time_min INTEGER NOT NULL DEFAULT 0,
  
  -- Maintenance
  preventive_maintenance_done INTEGER NOT NULL DEFAULT 0,
  preventive_maintenance_planned INTEGER NOT NULL DEFAULT 0,
  emergency_repairs INTEGER NOT NULL DEFAULT 0,
  
  -- Staff
  technicians_on_duty INTEGER NOT NULL DEFAULT 0,
  technician_hours_total NUMERIC NOT NULL DEFAULT 0,
  attendance_rate NUMERIC,
  turnover_rate NUMERIC,
  
  -- Costs
  external_costs NUMERIC NOT NULL DEFAULT 0,
  material_costs NUMERIC NOT NULL DEFAULT 0,
  
  -- Energy
  energy_consumption_kwh NUMERIC NOT NULL DEFAULT 0,
  occupied_rooms INTEGER NOT NULL DEFAULT 0,
  
  -- Calculated KPIs (via trigger)
  ticket_backlog_rate_pct NUMERIC,
  same_day_resolution_pct NUMERIC,
  preventive_maintenance_pct NUMERIC,
  emergency_rate_pct NUMERIC,
  tickets_per_technician NUMERIC,
  cost_per_ticket NUMERIC,
  energy_per_room NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Öffentlicher Lesezugriff auf Technical Reports" 
ON public.technical_daily_reports FOR SELECT USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Technical Reports" 
ON public.technical_daily_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Technical Reports" 
ON public.technical_daily_reports FOR UPDATE USING (true);

CREATE POLICY "Öffentlicher Delete auf Technical Reports" 
ON public.technical_daily_reports FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_technical_reports_updated_at
BEFORE UPDATE ON public.technical_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate Technical KPIs
CREATE OR REPLACE FUNCTION public.calculate_technical_kpis()
RETURNS TRIGGER AS $$
BEGIN
  -- Ticket Backlog Rate %
  IF (NEW.open_tickets + NEW.resolved_tickets) > 0 THEN
    NEW.ticket_backlog_rate_pct := (NEW.open_tickets::NUMERIC / (NEW.open_tickets + NEW.resolved_tickets)) * 100;
  END IF;
  
  -- Same-Day Resolution %
  IF NEW.new_tickets > 0 THEN
    NEW.same_day_resolution_pct := (NEW.resolved_tickets::NUMERIC / NEW.new_tickets) * 100;
  END IF;
  
  -- Preventive Maintenance %
  IF NEW.preventive_maintenance_planned > 0 THEN
    NEW.preventive_maintenance_pct := (NEW.preventive_maintenance_done::NUMERIC / NEW.preventive_maintenance_planned) * 100;
  END IF;
  
  -- Emergency Rate %
  IF (NEW.preventive_maintenance_done + NEW.emergency_repairs) > 0 THEN
    NEW.emergency_rate_pct := (NEW.emergency_repairs::NUMERIC / (NEW.preventive_maintenance_done + NEW.emergency_repairs)) * 100;
  END IF;
  
  -- Tickets per Technician
  IF NEW.technicians_on_duty > 0 THEN
    NEW.tickets_per_technician := NEW.resolved_tickets::NUMERIC / NEW.technicians_on_duty;
  END IF;
  
  -- Cost per Ticket
  IF NEW.resolved_tickets > 0 THEN
    NEW.cost_per_ticket := (NEW.external_costs + NEW.material_costs) / NEW.resolved_tickets;
  END IF;
  
  -- Energy per Room
  IF NEW.occupied_rooms > 0 THEN
    NEW.energy_per_room := NEW.energy_consumption_kwh / NEW.occupied_rooms;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER calculate_technical_kpis_trigger
BEFORE INSERT OR UPDATE ON public.technical_daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.calculate_technical_kpis();
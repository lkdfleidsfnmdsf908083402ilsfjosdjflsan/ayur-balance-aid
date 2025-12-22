-- Tabelle für Budget-Planung
CREATE TABLE public.budget_planung (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abteilung TEXT NOT NULL,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL,
  umsatz_budget NUMERIC NOT NULL DEFAULT 0,
  wareneinsatz_budget NUMERIC NOT NULL DEFAULT 0,
  personal_budget NUMERIC NOT NULL DEFAULT 0,
  energie_budget NUMERIC NOT NULL DEFAULT 0,
  marketing_budget NUMERIC NOT NULL DEFAULT 0,
  db1_budget NUMERIC NOT NULL DEFAULT 0,
  db2_budget NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(abteilung, jahr, monat)
);

-- Tabelle für KPI-Alarm-Schwellenwerte
CREATE TABLE public.kpi_schwellenwerte (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abteilung TEXT NOT NULL,
  kpi_typ TEXT NOT NULL, -- 'umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge'
  schwellenwert_min NUMERIC,
  schwellenwert_max NUMERIC,
  alarm_aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(abteilung, kpi_typ)
);

-- Enable Row Level Security
ALTER TABLE public.budget_planung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_schwellenwerte ENABLE ROW LEVEL SECURITY;

-- Create policies for budget_planung
CREATE POLICY "Öffentlicher Lesezugriff auf Budget" 
ON public.budget_planung 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Budget" 
ON public.budget_planung 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Budget" 
ON public.budget_planung 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Budget" 
ON public.budget_planung 
FOR DELETE 
USING (true);

-- Create policies for kpi_schwellenwerte
CREATE POLICY "Öffentlicher Lesezugriff auf Schwellenwerte" 
ON public.kpi_schwellenwerte 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Schwellenwerte" 
ON public.kpi_schwellenwerte 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Schwellenwerte" 
ON public.kpi_schwellenwerte 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Schwellenwerte" 
ON public.kpi_schwellenwerte 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_budget_planung_updated_at
BEFORE UPDATE ON public.budget_planung
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_schwellenwerte_updated_at
BEFORE UPDATE ON public.kpi_schwellenwerte
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
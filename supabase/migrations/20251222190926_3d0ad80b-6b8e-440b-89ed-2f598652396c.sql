-- Tabelle für Abteilungsleiter-Kontakte
CREATE TABLE public.abteilungsleiter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abteilung TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  aktiv BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abteilungsleiter ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Abteilungsleiter" 
ON public.abteilungsleiter 
FOR SELECT 
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Abteilungsleiter" 
ON public.abteilungsleiter 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Abteilungsleiter" 
ON public.abteilungsleiter 
FOR UPDATE 
USING (true);

CREATE POLICY "Öffentlicher Delete auf Abteilungsleiter" 
ON public.abteilungsleiter 
FOR DELETE 
USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_abteilungsleiter_updated_at
  BEFORE UPDATE ON public.abteilungsleiter
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
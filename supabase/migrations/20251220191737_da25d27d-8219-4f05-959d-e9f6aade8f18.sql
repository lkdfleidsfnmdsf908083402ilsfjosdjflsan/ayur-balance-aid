-- Konten-Stammdaten
CREATE TABLE public.konten (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kontonummer TEXT NOT NULL UNIQUE,
  kontobezeichnung TEXT NOT NULL,
  kontoklasse TEXT NOT NULL,
  bereich TEXT NOT NULL DEFAULT 'Sonstiges',
  kostenartt_typ TEXT NOT NULL DEFAULT 'Neutral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Monatliche Salden
CREATE TABLE public.salden_monat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kontonummer TEXT NOT NULL REFERENCES public.konten(kontonummer) ON DELETE CASCADE,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL CHECK (monat >= 1 AND monat <= 12),
  saldo_soll_monat NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_haben_monat NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo_monat NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(kontonummer, jahr, monat)
);

-- Importierte Dateien (Tracking)
CREATE TABLE public.import_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  jahr INTEGER NOT NULL,
  monat INTEGER NOT NULL,
  anzahl_konten INTEGER NOT NULL DEFAULT 0,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(jahr, monat)
);

-- Enable RLS
ALTER TABLE public.konten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salden_monat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

-- Öffentlicher Lesezugriff (keine Auth erforderlich für Finanzanalyse-Tool)
CREATE POLICY "Öffentlicher Lesezugriff auf Konten" 
  ON public.konten FOR SELECT USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Konten" 
  ON public.konten FOR INSERT WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Konten" 
  ON public.konten FOR UPDATE USING (true);

CREATE POLICY "Öffentlicher Lesezugriff auf Salden" 
  ON public.salden_monat FOR SELECT USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Salden" 
  ON public.salden_monat FOR INSERT WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Salden" 
  ON public.salden_monat FOR UPDATE USING (true);

CREATE POLICY "Öffentlicher Lesezugriff auf Imports" 
  ON public.import_files FOR SELECT USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Imports" 
  ON public.import_files FOR INSERT WITH CHECK (true);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_konten_updated_at
  BEFORE UPDATE ON public.konten
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
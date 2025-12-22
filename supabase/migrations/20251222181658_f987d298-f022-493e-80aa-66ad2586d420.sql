-- ═══════════════════════════════════════════════════════════════════════════════
-- ERWEITERUNG DES KPI-SYSTEMS FÜR HOTEL MIT AYURVEDA/WELLNESS-SCHWERPUNKT
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Neue Spalte für KPI-Kategorie in der Konten-Tabelle
ALTER TABLE public.konten 
ADD COLUMN IF NOT EXISTS kpi_kategorie text NOT NULL DEFAULT 'Sonstiges';

-- 2. Neue Tabelle für aggregierte Abteilungs-KPIs auf Monatsebene
CREATE TABLE IF NOT EXISTS public.abteilung_kpi_monat (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  abteilung text NOT NULL,
  jahr integer NOT NULL,
  monat integer NOT NULL,
  
  -- Operative KPIs
  umsatz numeric NOT NULL DEFAULT 0,
  wareneinsatz numeric NOT NULL DEFAULT 0,
  personal numeric NOT NULL DEFAULT 0,
  
  -- Berechnete Deckungsbeiträge
  db1 numeric NOT NULL DEFAULT 0,  -- Deckungsbeitrag I = Umsatz - Wareneinsatz
  db2 numeric NOT NULL DEFAULT 0,  -- Deckungsbeitrag II = DB I - Personal
  
  -- Kostenarten
  energie numeric NOT NULL DEFAULT 0,
  marketing numeric NOT NULL DEFAULT 0,
  betriebsaufwand numeric NOT NULL DEFAULT 0,
  abschreibung numeric NOT NULL DEFAULT 0,
  zins numeric NOT NULL DEFAULT 0,
  
  -- Vorjahresvergleich (wird bei Berechnung gefüllt)
  umsatz_vorjahr numeric,
  umsatz_diff numeric,
  umsatz_diff_prozent numeric,
  db1_vorjahr numeric,
  db1_diff numeric,
  db1_diff_prozent numeric,
  db2_vorjahr numeric,
  db2_diff numeric,
  db2_diff_prozent numeric,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint für Abteilung + Periode
  UNIQUE(abteilung, jahr, monat)
);

-- 3. RLS für abteilung_kpi_monat aktivieren
ALTER TABLE public.abteilung_kpi_monat ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies für abteilung_kpi_monat
CREATE POLICY "Öffentlicher Lesezugriff auf Abteilungs-KPIs"
ON public.abteilung_kpi_monat
FOR SELECT
USING (true);

CREATE POLICY "Öffentlicher Schreibzugriff auf Abteilungs-KPIs"
ON public.abteilung_kpi_monat
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Öffentlicher Update auf Abteilungs-KPIs"
ON public.abteilung_kpi_monat
FOR UPDATE
USING (true);

CREATE POLICY "Öffentlicher Delete auf Abteilungs-KPIs"
ON public.abteilung_kpi_monat
FOR DELETE
USING (true);

-- 5. Trigger für updated_at auf abteilung_kpi_monat
CREATE TRIGGER update_abteilung_kpi_monat_updated_at
BEFORE UPDATE ON public.abteilung_kpi_monat
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_abteilung_kpi_monat_periode 
ON public.abteilung_kpi_monat(jahr, monat);

CREATE INDEX IF NOT EXISTS idx_abteilung_kpi_monat_abteilung 
ON public.abteilung_kpi_monat(abteilung);

-- 7. Index für konten.kpi_kategorie
CREATE INDEX IF NOT EXISTS idx_konten_kpi_kategorie 
ON public.konten(kpi_kategorie);
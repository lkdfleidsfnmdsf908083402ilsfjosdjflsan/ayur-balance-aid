-- =============================================
-- GÄSTEVERWALTUNG: Komplette Tabellen-Struktur
-- =============================================

-- Enum für Gasttyp
CREATE TYPE public.guest_type AS ENUM (
  'Wellness',
  'Kurgast',
  'Retreat',
  'Tagesgast',
  'Geschäftsreisend',
  'Privat'
);

-- Enum für Buchungskanal
CREATE TYPE public.booking_channel AS ENUM (
  'Website',
  'Telefon',
  'Email',
  'Booking.com',
  'Expedia',
  'HRS',
  'Reisebüro',
  'Empfehlung',
  'Stammgast',
  'Kooperation',
  'Sonstige'
);

-- Enum für Kurtyp
CREATE TYPE public.cure_type AS ENUM (
  'Fastenkur',
  'Basenkur',
  'Detox',
  'Ayurveda',
  'TCM',
  'Physiotherapie',
  'Rehabilitation',
  'Mental Wellness',
  'Gewichtsmanagement',
  'Burnout-Prävention',
  'Keine'
);

-- Enum für Verpflegungsart
CREATE TYPE public.meal_plan AS ENUM (
  'Vollpension',
  'Halbpension',
  'Frühstück',
  'Ohne Verpflegung',
  'Spezialdiät'
);

-- Haupttabelle Gäste
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Stammdaten
  gast_nummer TEXT NOT NULL UNIQUE,
  anrede TEXT,
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  geburtsdatum DATE,
  
  -- Kontaktdaten
  email TEXT,
  telefon TEXT,
  mobil TEXT,
  
  -- Adresse
  strasse TEXT,
  plz TEXT,
  ort TEXT,
  land TEXT DEFAULT 'Deutschland',
  
  -- Marketing
  newsletter_optin BOOLEAN DEFAULT false,
  marketing_optin BOOLEAN DEFAULT false,
  herkunftsland TEXT,
  sprache TEXT DEFAULT 'Deutsch',
  
  -- Präferenzen
  allergien TEXT[],
  ernaehrungshinweise TEXT,
  zimmerpraeferenz TEXT,
  sonderwuensche TEXT,
  
  -- Medizinisch (für Kurgäste)
  arzt_freigabe BOOLEAN DEFAULT false,
  medizinische_hinweise TEXT,
  
  -- Metadaten
  erstbesuch_datum DATE,
  letzter_besuch DATE,
  anzahl_aufenthalte INTEGER DEFAULT 0,
  gesamtumsatz NUMERIC DEFAULT 0,
  vip_status BOOLEAN DEFAULT false,
  notizen TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Aufenthalte/Buchungen
CREATE TABLE public.guest_stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  
  -- Aufenthaltsdaten
  anreise DATE NOT NULL,
  abreise DATE NOT NULL,
  naechte INTEGER GENERATED ALWAYS AS (abreise - anreise) STORED,
  
  -- Buchungsdetails
  buchungskanal booking_channel DEFAULT 'Website',
  gasttyp guest_type NOT NULL DEFAULT 'Wellness',
  kurtyp cure_type DEFAULT 'Keine',
  verpflegung meal_plan DEFAULT 'Halbpension',
  
  -- Zimmer
  zimmer_nummer TEXT,
  zimmer_kategorie TEXT,
  
  -- Preise
  zimmerpreis_nacht NUMERIC DEFAULT 0,
  gesamtpreis NUMERIC DEFAULT 0,
  spa_umsatz NUMERIC DEFAULT 0,
  fb_umsatz NUMERIC DEFAULT 0,
  sonstige_umsaetze NUMERIC DEFAULT 0,
  
  -- Bewertung
  bewertung_gesamt INTEGER CHECK (bewertung_gesamt BETWEEN 1 AND 5),
  bewertung_zimmer INTEGER CHECK (bewertung_zimmer BETWEEN 1 AND 5),
  bewertung_service INTEGER CHECK (bewertung_service BETWEEN 1 AND 5),
  bewertung_spa INTEGER CHECK (bewertung_spa BETWEEN 1 AND 5),
  bewertung_fb INTEGER CHECK (bewertung_fb BETWEEN 1 AND 5),
  feedback TEXT,
  
  -- Status
  status TEXT DEFAULT 'Gebucht' CHECK (status IN ('Angefragt', 'Gebucht', 'CheckedIn', 'CheckedOut', 'Storniert', 'NoShow')),
  stornierungsgrund TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Guest Statistics Tabelle
CREATE TABLE public.guest_daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- Gästezahlen
  gaeste_anreise INTEGER DEFAULT 0,
  gaeste_abreise INTEGER DEFAULT 0,
  gaeste_inhouse INTEGER DEFAULT 0,
  gaeste_tagesgaeste INTEGER DEFAULT 0,
  
  -- Nach Gasttyp
  gaeste_wellness INTEGER DEFAULT 0,
  gaeste_kurgast INTEGER DEFAULT 0,
  gaeste_retreat INTEGER DEFAULT 0,
  gaeste_geschaeft INTEGER DEFAULT 0,
  
  -- Auslastung
  zimmer_verfuegbar INTEGER DEFAULT 0,
  zimmer_belegt INTEGER DEFAULT 0,
  belegungsrate_pct NUMERIC,
  
  -- Umsätze
  tagesumsatz_logis NUMERIC DEFAULT 0,
  tagesumsatz_spa NUMERIC DEFAULT 0,
  tagesumsatz_fb NUMERIC DEFAULT 0,
  tagesumsatz_sonstige NUMERIC DEFAULT 0,
  tagesumsatz_gesamt NUMERIC DEFAULT 0,
  
  -- Durchschnittswerte
  adr NUMERIC,  -- Average Daily Rate
  revpar NUMERIC,  -- Revenue per Available Room
  umsatz_pro_gast NUMERIC,
  aufenthaltsdauer_avg NUMERIC,
  
  -- Bewertungen
  bewertungen_anzahl INTEGER DEFAULT 0,
  bewertungen_summe INTEGER DEFAULT 0,
  bewertung_durchschnitt NUMERIC,
  
  -- Marketing
  buchungen_neu INTEGER DEFAULT 0,
  stornierungen INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  wiederkehrende_gaeste INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indizes für Performance
CREATE INDEX idx_guests_email ON public.guests(email);
CREATE INDEX idx_guests_nachname ON public.guests(nachname);
CREATE INDEX idx_guests_gast_nummer ON public.guests(gast_nummer);
CREATE INDEX idx_guest_stays_guest_id ON public.guest_stays(guest_id);
CREATE INDEX idx_guest_stays_anreise ON public.guest_stays(anreise);
CREATE INDEX idx_guest_stays_abreise ON public.guest_stays(abreise);
CREATE INDEX idx_guest_stays_gasttyp ON public.guest_stays(gasttyp);
CREATE INDEX idx_guest_daily_reports_date ON public.guest_daily_reports(report_date);

-- RLS aktivieren
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Öffentlicher Lesezugriff auf Gäste" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Gäste" ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Gäste" ON public.guests FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Gäste" ON public.guests FOR DELETE USING (true);

CREATE POLICY "Öffentlicher Lesezugriff auf Aufenthalte" ON public.guest_stays FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Aufenthalte" ON public.guest_stays FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Aufenthalte" ON public.guest_stays FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Aufenthalte" ON public.guest_stays FOR DELETE USING (true);

CREATE POLICY "Öffentlicher Lesezugriff auf Guest Reports" ON public.guest_daily_reports FOR SELECT USING (true);
CREATE POLICY "Öffentlicher Schreibzugriff auf Guest Reports" ON public.guest_daily_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Öffentlicher Update auf Guest Reports" ON public.guest_daily_reports FOR UPDATE USING (true);
CREATE POLICY "Öffentlicher Delete auf Guest Reports" ON public.guest_daily_reports FOR DELETE USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_stays_updated_at BEFORE UPDATE ON public.guest_stays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_daily_reports_updated_at BEFORE UPDATE ON public.guest_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger für berechnete KPIs bei Guest Daily Reports
CREATE OR REPLACE FUNCTION public.calculate_guest_kpis()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Belegungsrate
  IF NEW.zimmer_verfuegbar > 0 THEN
    NEW.belegungsrate_pct := (NEW.zimmer_belegt::NUMERIC / NEW.zimmer_verfuegbar) * 100;
  END IF;
  
  -- ADR (Average Daily Rate)
  IF NEW.zimmer_belegt > 0 THEN
    NEW.adr := NEW.tagesumsatz_logis / NEW.zimmer_belegt;
  END IF;
  
  -- RevPAR
  IF NEW.zimmer_verfuegbar > 0 THEN
    NEW.revpar := NEW.tagesumsatz_logis / NEW.zimmer_verfuegbar;
  END IF;
  
  -- Gesamtumsatz
  NEW.tagesumsatz_gesamt := COALESCE(NEW.tagesumsatz_logis, 0) + 
                            COALESCE(NEW.tagesumsatz_spa, 0) + 
                            COALESCE(NEW.tagesumsatz_fb, 0) + 
                            COALESCE(NEW.tagesumsatz_sonstige, 0);
  
  -- Umsatz pro Gast
  IF NEW.gaeste_inhouse > 0 THEN
    NEW.umsatz_pro_gast := NEW.tagesumsatz_gesamt / NEW.gaeste_inhouse;
  END IF;
  
  -- Durchschnittsbewertung
  IF NEW.bewertungen_anzahl > 0 THEN
    NEW.bewertung_durchschnitt := NEW.bewertungen_summe::NUMERIC / NEW.bewertungen_anzahl;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_guest_kpis_trigger
  BEFORE INSERT OR UPDATE ON public.guest_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.calculate_guest_kpis();

-- =============================================
-- EMPFOHLENE KPI SCHWELLENWERTE
-- Basierend auf Branchenstandards für Health Resorts
-- =============================================

-- Lösche bestehende Schwellenwerte für Clean Start
DELETE FROM public.kpi_schwellenwerte;

-- Finanz-KPIs (Gesamt)
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
-- Ihr Ziel: 420.000€/Jahr = 35.000€/Monat
('Gesamt', 'umsatz', 35000, NULL, true),
('Gesamt', 'db1_marge', 65, NULL, true),  -- Mind. 65% Rohertragsmarge
('Gesamt', 'db2_marge', 35, NULL, true),  -- Mind. 35% nach Personal
('Gesamt', 'wareneinsatz_pct', NULL, 25, true),  -- Max 25% Wareneinsatz
('Gesamt', 'personal_pct', NULL, 35, true);  -- Max 35% Personalkosten

-- Housekeeping KPIs
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Housekeeping', 'hk_rooms_per_attendant', 12, 16, true),
('Housekeeping', 'hk_inspection_pass_rate', 95, NULL, true),
('Housekeeping', 'hk_complaint_rate', NULL, 1, true),
('Housekeeping', 'hk_avg_minutes_per_room', 20, 35, true);

-- Kitchen KPIs (für gesundheitsorientierte Küche strenger)
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Kitchen', 'kitchen_food_cost_pct', 25, 32, true),  -- Höherer Range wg. Bio/Qualität
('Kitchen', 'kitchen_labour_pct', NULL, 35, true),
('Kitchen', 'kitchen_prime_cost_pct', NULL, 65, true),
('Kitchen', 'kitchen_complaint_rate', NULL, 0.5, true),  -- Strenger für Retreat
('Kitchen', 'kitchen_order_accuracy', 98, NULL, true),
('Kitchen', 'kitchen_food_waste_pct', NULL, 3, true);

-- Service KPIs
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Service', 'service_sales_per_cover', 28, NULL, true),  -- Ihr Ziel ~28€ pro Gast
('Service', 'service_complaint_rate', NULL, 1, true),
('Service', 'service_error_rate', NULL, 2, true),
('Service', 'service_avg_rating', 4.2, NULL, true),
('Service', 'service_table_turnover', 1.5, 2.5, true);

-- Spa KPIs (Kernbereich für Wellness-Resort)
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Spa', 'spa_room_utilization', 70, NULL, true),
('Spa', 'spa_therapist_utilization', 75, 90, true),
('Spa', 'spa_revenue_per_guest', 45, NULL, true),  -- Spa-Umsatz pro Gast
('Spa', 'spa_no_show_rate', NULL, 5, true),
('Spa', 'spa_complaint_rate', NULL, 0.5, true),
('Spa', 'spa_avg_rating', 4.5, NULL, true);  -- Höherer Standard für Spa

-- Front Office KPIs
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('FrontOffice', 'fo_avg_checkin_time', NULL, 180, true),  -- Max 3 Min Check-in
('FrontOffice', 'fo_complaint_rate', NULL, 1, true),
('FrontOffice', 'fo_upsell_conversion', 15, NULL, true),
('FrontOffice', 'fo_fcr_rate', 85, NULL, true),
('FrontOffice', 'fo_avg_rating', 4.3, NULL, true);

-- Technical KPIs
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Technical', 'tech_ticket_backlog', NULL, 15, true),
('Technical', 'tech_same_day_resolution', 70, NULL, true),
('Technical', 'tech_preventive_maintenance', 90, NULL, true),
('Technical', 'tech_emergency_rate', NULL, 10, true),
('Technical', 'tech_energy_per_room', NULL, 25, true);  -- kWh pro Zimmer

-- Admin/HR KPIs
INSERT INTO public.kpi_schwellenwerte (abteilung, kpi_typ, schwellenwert_min, schwellenwert_max, alarm_aktiv) VALUES
('Admin', 'admin_sick_rate', NULL, 5, true),
('Admin', 'admin_open_positions_rate', NULL, 8, true),
('Admin', 'admin_turnover_rate', NULL, 12, true),  -- Max 12% Jahresfluktuation
('Admin', 'admin_it_availability', 99, NULL, true),
('Admin', 'admin_payment_compliance', 95, NULL, true);
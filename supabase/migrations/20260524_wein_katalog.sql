-- ─── wein_katalog: Stammdaten-Tabelle für bekannte Weine ───
--
-- Trennung von Inventar (wein_lager) und Katalog (wein_katalog):
--   - wein_lager: physische Flaschen in Lagerorten, mit Mengen
--   - wein_katalog: Wein-Stammdaten (Name, Weingut, Jahrgang, ...) ohne Bestand
--
-- Befüllung des Katalogs:
--   1. CSV-Import aus Vivino-Cellar (initiale Bestandsaufnahme)
--   2. Automatischer Eintrag bei erfolgreicher KI-Erkennung (Claude/Vivino)
--   3. Manuelle Erfassung
--
-- Barcode-Spalte ist nullable: der Barcode wird beim ersten Match eines
-- gescannten Barcodes auf einen Namens-Treffer zurückgeschrieben.

CREATE TABLE IF NOT EXISTS public.wein_katalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  weingut       TEXT,
  jahrgang      TEXT,
  rebsorte      TEXT,
  region        TEXT,
  land          TEXT,
  beschreibung  TEXT,
  bild_url      TEXT,
  barcode       TEXT,
  vivino_id     TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  hinzugefuegt_am  TIMESTAMPTZ NOT NULL DEFAULT now(),
  aktualisiert_am  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Verhindert exakte Duplikate beim wiederholten Import derselben CSV
  CONSTRAINT wein_katalog_uniq UNIQUE (name, weingut, jahrgang),
  CONSTRAINT wein_katalog_source_check
    CHECK (source IN ('vivino_cellar', 'vivino_api', 'claude', 'off', 'manual'))
);

CREATE INDEX IF NOT EXISTS idx_wein_katalog_barcode
  ON public.wein_katalog (barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wein_katalog_name_lower
  ON public.wein_katalog (lower(name));

CREATE INDEX IF NOT EXISTS idx_wein_katalog_weingut_lower
  ON public.wein_katalog (lower(weingut))
  WHERE weingut IS NOT NULL;

-- Trigger: aktualisiert_am automatisch setzen
CREATE OR REPLACE FUNCTION public.update_wein_katalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wein_katalog_updated_at ON public.wein_katalog;
CREATE TRIGGER trg_wein_katalog_updated_at
  BEFORE UPDATE ON public.wein_katalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wein_katalog_updated_at();

COMMENT ON TABLE public.wein_katalog IS
  'Stammdaten-Katalog bekannter Weine. Wird als Lookup-Quelle vor externen APIs befragt.';
COMMENT ON COLUMN public.wein_katalog.barcode IS
  'Wird beim ersten Match eines gescannten Barcodes auf einen Katalog-Eintrag gesetzt.';
COMMENT ON COLUMN public.wein_katalog.source IS
  'Wie der Eintrag entstand: vivino_cellar (CSV-Import), claude (KI-Erkennung), manual, …';

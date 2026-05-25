-- ─── wein_lager: Schema-Reparatur + Barcode-Cache ───
--
-- 1. kuehlhaus_nr: KRITISCHER FIX. Diese Spalte fehlte in der Tabelle,
--    der Code hat sie aber bei jeder Einlagerung gesetzt. Supabase hat den
--    Wert still verworfen → bisher eingelagerte KH1/KH2-Weine sind nicht
--    unterscheidbar. Ohne diesen Fix ist die Bestandsübersicht falsch.
--
-- 2. barcode: Neue Spalte für Cache-Lookup. Beim Einlagern wird der
--    gescannte/eingegebene Barcode mitgespeichert. Beim nächsten Scan
--    derselben Flasche → instant erkannt aus eigenem Bestand, kein
--    externer API-Call nötig.

ALTER TABLE public.wein_lager
  ADD COLUMN IF NOT EXISTS kuehlhaus_nr INT,
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Constraint: kuehlhaus_nr darf nur 1 oder 2 sein, wenn lagerort = 'kuehlhaus'
ALTER TABLE public.wein_lager
  DROP CONSTRAINT IF EXISTS wein_lager_kuehlhaus_nr_check;
ALTER TABLE public.wein_lager
  ADD CONSTRAINT wein_lager_kuehlhaus_nr_check
  CHECK (kuehlhaus_nr IS NULL OR kuehlhaus_nr IN (1, 2));

-- Index für schnellen Barcode-Lookup. Nicht UNIQUE: derselbe Wein kann
-- in mehreren Lagerorten mehrfach erfasst sein.
CREATE INDEX IF NOT EXISTS idx_wein_lager_barcode
  ON public.wein_lager (barcode)
  WHERE barcode IS NOT NULL;

-- Index auf Lagerort-Position für die Bestandsübersicht
CREATE INDEX IF NOT EXISTS idx_wein_lager_position
  ON public.wein_lager (lagerort, kuehlhaus_nr, reihe, fach);

COMMENT ON COLUMN public.wein_lager.kuehlhaus_nr IS
  'Nur belegt wenn lagerort = ''kuehlhaus''. Werte: 1 oder 2.';
COMMENT ON COLUMN public.wein_lager.barcode IS
  'EAN-13/EAN-8/UPC vom Etikett. Genutzt als Cache-Key bei wiederholten Scans.';

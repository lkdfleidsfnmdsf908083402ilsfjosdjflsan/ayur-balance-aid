-- SCHICHTPLAN ABLEHNUNGS-TRACKING
CREATE TABLE IF NOT EXISTS public.shift_suggestion_rejections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  abteilungsleiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  begruendung TEXT NOT NULL,
  ueberstunden_aktuell NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, datum, abteilungsleiter_id)
);

CREATE OR REPLACE VIEW public.v_employee_rejection_count AS
SELECT 
  employee_id,
  COUNT(*) as ablehnungen_gesamt,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as ablehnungen_letzter_monat
FROM public.shift_suggestion_rejections
GROUP BY employee_id;

ALTER TABLE public.shift_suggestion_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Öffentlicher Lesezugriff auf Ablehnungen" ON public.shift_suggestion_rejections;
CREATE POLICY "Öffentlicher Lesezugriff auf Ablehnungen" 
  ON public.shift_suggestion_rejections FOR SELECT USING (true);
  
DROP POLICY IF EXISTS "Öffentlicher Schreibzugriff auf Ablehnungen" ON public.shift_suggestion_rejections;
CREATE POLICY "Öffentlicher Schreibzugriff auf Ablehnungen" 
  ON public.shift_suggestion_rejections FOR INSERT WITH CHECK (true);
  
DROP POLICY IF EXISTS "Öffentlicher Update auf Ablehnungen" ON public.shift_suggestion_rejections;
CREATE POLICY "Öffentlicher Update auf Ablehnungen" 
  ON public.shift_suggestion_rejections FOR UPDATE USING (true);
  
DROP POLICY IF EXISTS "Öffentlicher Delete auf Ablehnungen" ON public.shift_suggestion_rejections;
CREATE POLICY "Öffentlicher Delete auf Ablehnungen" 
  ON public.shift_suggestion_rejections FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_rejection_employee_date 
  ON public.shift_suggestion_rejections(employee_id, datum DESC);

ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS vormittag_beginn TIME;
ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS vormittag_ende TIME;
ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS nachmittag_beginn TIME;
ALTER TABLE public.employee_shifts ADD COLUMN IF NOT EXISTS nachmittag_ende TIME;

COMMENT ON TABLE public.shift_suggestion_rejections IS 
  'Tracking von abgelehnten Schichtvorschlägen für Mitarbeiter mit hohen Überstunden';

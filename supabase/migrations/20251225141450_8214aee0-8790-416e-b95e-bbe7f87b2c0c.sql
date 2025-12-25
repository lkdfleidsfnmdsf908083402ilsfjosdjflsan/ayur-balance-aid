-- Add morning and afternoon shift fields to employee_shifts
ALTER TABLE public.employee_shifts
  ADD COLUMN IF NOT EXISTS vormittag_beginn TIME,
  ADD COLUMN IF NOT EXISTS vormittag_ende TIME,
  ADD COLUMN IF NOT EXISTS nachmittag_beginn TIME,
  ADD COLUMN IF NOT EXISTS nachmittag_ende TIME;

-- Add comments for documentation
COMMENT ON COLUMN public.employee_shifts.vormittag_beginn IS 'Start time of morning shift';
COMMENT ON COLUMN public.employee_shifts.vormittag_ende IS 'End time of morning shift';
COMMENT ON COLUMN public.employee_shifts.nachmittag_beginn IS 'Start time of afternoon shift';
COMMENT ON COLUMN public.employee_shifts.nachmittag_ende IS 'End time of afternoon shift';
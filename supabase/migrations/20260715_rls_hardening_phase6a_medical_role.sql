-- ══════════════════════════════════════════════════════════════════════════
--  RLS-Härtung · Phase 6a · Neue Rolle 'medical' (Gesundheitsdaten)
--
--  Fügt die Rolle 'medical' zum app_role-Enum hinzu. MUSS in einem EIGENEN
--  Lauf VOR Phase 6b ausgeführt werden: ein neu hinzugefügter Enum-Wert kann
--  in PostgreSQL nicht in derselben Transaktion verwendet werden, in der er
--  angelegt wurde ("unsafe use of new value").
-- ══════════════════════════════════════════════════════════════════════════

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'medical';

-- Update Kontoklassen-Bezeichnungen basierend auf Kontonummern
-- Kontoklasse 10 (10xx) = Sachanlagen
UPDATE public.konten 
SET kontoklasse = 'Sachanlagen'
WHERE kontonummer ~ '^10[0-9]{2}$';

-- Kontoklasse 0 (0xxx) = Sachanlagen
UPDATE public.konten 
SET kontoklasse = 'Sachanlagen'
WHERE kontonummer ~ '^0[0-9]{3}$';

-- Kontoklasse 1 (1xxx außer 10xx) = Warenvorräte
UPDATE public.konten 
SET kontoklasse = 'Warenvorräte'
WHERE kontonummer ~ '^1[1-9][0-9]{2}$';

-- Kontoklasse 2 (2xxx) = Finanzanlagen
UPDATE public.konten 
SET kontoklasse = 'Finanzanlagen'
WHERE kontonummer ~ '^2[0-9]{3}$';

-- Kontoklasse 3 (3xxx) = Verbindlichkeiten
UPDATE public.konten 
SET kontoklasse = 'Verbindlichkeiten'
WHERE kontonummer ~ '^3[0-9]{3}$';

-- Kontoklasse 4 (4xxx) = Erlöse
UPDATE public.konten 
SET kontoklasse = 'Erlöse'
WHERE kontonummer ~ '^4[0-9]{3}$';

-- Kontoklasse 5 (5xxx) = Wareneinsatz
UPDATE public.konten 
SET kontoklasse = 'Wareneinsatz'
WHERE kontonummer ~ '^5[0-9]{3}$';

-- Kontoklasse 6 (6xxx) = Personalkosten
UPDATE public.konten 
SET kontoklasse = 'Personalkosten'
WHERE kontonummer ~ '^6[0-9]{3}$';

-- Kontoklasse 7 (7xxx) = Sonstiger Aufwand
UPDATE public.konten 
SET kontoklasse = 'Sonstiger Aufwand'
WHERE kontonummer ~ '^7[0-9]{3}$';

-- Kontoklasse 8 (8xxx) = Finanzergebnis
UPDATE public.konten 
SET kontoklasse = 'Finanzergebnis'
WHERE kontonummer ~ '^8[0-9]{3}$';

-- Kontoklasse 9 (9xxx) = Abschlusskonten
UPDATE public.konten 
SET kontoklasse = 'Abschlusskonten'
WHERE kontonummer ~ '^9[0-9]{3}$';
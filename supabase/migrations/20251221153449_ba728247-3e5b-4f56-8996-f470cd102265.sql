-- Update Kontoklassen basierend auf erster Ziffer der Kontonummer
UPDATE public.konten SET kontoklasse = 'Kontoklasse 0' WHERE kontonummer ~ '^0';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 1' WHERE kontonummer ~ '^1';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 2' WHERE kontonummer ~ '^2';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 3' WHERE kontonummer ~ '^3';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 4' WHERE kontonummer ~ '^4';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 5' WHERE kontonummer ~ '^5';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 6' WHERE kontonummer ~ '^6';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 7' WHERE kontonummer ~ '^7';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 8' WHERE kontonummer ~ '^8';
UPDATE public.konten SET kontoklasse = 'Kontoklasse 9' WHERE kontonummer ~ '^9';

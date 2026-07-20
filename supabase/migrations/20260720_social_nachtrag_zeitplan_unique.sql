-- ============================================================================
-- NACHTRAG zu 20260719_social_zeitplan.sql (bereits eingespielt — daher neue Datei)
--
-- Problem: Ein Post konnte mehrfach mit status 'geplant' im Zeitplan stehen
-- (zwei Tabs, zwei Admins — die Prüfung in postEinplanen ist rein clientseitig).
-- Werden beide Einträge im selben Worker-Lauf fällig, stößt der Cron-Job
-- social-publish zweimal an und derselbe Post geht zweimal an die Plattform raus.
--
-- Lösung: Pro Post ist ab jetzt höchstens EIN Eintrag mit status 'geplant'
-- erlaubt. Das erzwingt die Datenbank selbst — egal aus wie vielen Tabs
-- gleichzeitig geplant wird. Bereits ausgespielte, fehlgeschlagene oder
-- abgebrochene Einträge bleiben unbegrenzt (Historie).
-- ============================================================================

-- Schritt 1: Bestehende Doppelplanungen bereinigen, sonst scheitert der
-- Index-Aufbau. Pro Post bleibt der FRÜHESTE geplante Eintrag bestehen,
-- alle späteren Doppel werden auf 'abgebrochen' gesetzt (nichts wird gelöscht,
-- die Historie bleibt nachvollziehbar).
update public.social_zeitplan
set status = 'abgebrochen'
where status = 'geplant'
  and id not in (
    select distinct on (post_id) id
    from public.social_zeitplan
    where status = 'geplant'
    order by post_id, geplant_fuer asc, erstellt_am asc
  );

-- Schritt 2: Serverseitige Sperre — höchstens ein offener ('geplant')
-- Zeitplan-Eintrag pro Post. Ein zweiter Einplan-Versuch schlägt mit
-- Fehlercode 23505 fehl; das Frontend (postEinplanen in socialAgent.ts)
-- übersetzt das in eine verständliche Meldung.
create unique index if not exists social_zeitplan_ein_geplanter_pro_post
  on public.social_zeitplan (post_id)
  where status = 'geplant';

comment on index public.social_zeitplan_ein_geplanter_pro_post is
  'Verhindert doppelte Einplanung: pro Post höchstens ein Eintrag mit status geplant — sonst würde derselbe Post zweimal veröffentlicht.';

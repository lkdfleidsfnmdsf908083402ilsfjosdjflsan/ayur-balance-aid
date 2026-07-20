-- Automatik & Planung für den Social-Media-Agent
--
-- Zwei Cron-Jobs (pg_cron + pg_net):
--   1. Täglich 05:30 UTC: Edge Function social-trend-scan (ausgeloest_von 'zeitplan')
--   2. Alle 15 Minuten: fällige Einträge aus social_zeitplan an social-publish übergeben
--
-- Ehrlichkeits-Regeln, die hier im SQL verankert sind:
--   - Der Service-Role-Key steht NICHT in dieser Datei, sondern in Supabase Vault.
--     Fehlt der Vault-Eintrag, tun die Jobs bewusst nichts (Warnung im Log) statt zu scheitern.
--   - Der Zeitplan-Job setzt NIE status='ausgespielt'. Er stößt social-publish nur an;
--     erst diese Function darf den Status ändern — nach bestätigter Antwort der Plattform.
--   - Abgearbeitet werden ausschließlich Posts mit social_posts.status = 'freigegeben'
--     (siehe explizite Bedingung im Worker) — nie Entwürfe, nie Abgelehnte.
--
-- Diese Migration definiert fremde Tabellen nicht neu, sie referenziert nur
-- social_posts (20260719_social_agent.sql) und social_publish_attempts
-- (20260719_social_kanaele.sql, läuft alphabetisch davor).

-- ─── Extensions ────────────────────────────────────────────────────────────────
-- pg_cron ist nicht relozierbar und gehört fest nach pg_catalog (Schema 'cron'
-- entsteht automatisch); pg_net wird wie üblich im extensions-Schema registriert
-- und legt seine Funktionen im eigenen Schema 'net' an.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ─── Zeitplan-Tabelle ──────────────────────────────────────────────────────────
create table if not exists public.social_zeitplan (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.social_posts(id) on delete cascade,
  geplant_fuer  timestamptz not null,
  plattform     text,
  status        text not null default 'geplant'
                  check (status in ('geplant', 'ausgespielt', 'fehlgeschlagen', 'abgebrochen')),
  -- Doppel-Anstoß-Schutz: gesetzt, sobald der Worker social-publish angestoßen hat.
  -- Bewusst KEINE Verknüpfung zum Protokoll — das leistet erst versuch_id.
  angestossen_marker uuid,
  -- ECHTE Versuchs-ID: schreibt social-publish beim Abschluss zurück (Zeile in social_publish_attempts).
  versuch_id    uuid references public.social_publish_attempts(id) on delete set null,
  erstellt_am   timestamptz not null default now()
);

comment on table public.social_zeitplan is
  'Geplante Ausspielungen. status wandert nur durch social-publish auf ausgespielt/fehlgeschlagen — nie durch den Cron-Job selbst. angestossen_marker gesetzt + status geplant = angestoßen, aber ohne bestätigte Antwort. versuch_id verweist auf den echten Protokoll-Eintrag, sobald social-publish geantwortet hat.';

create index if not exists social_zeitplan_faellig_idx
  on public.social_zeitplan (status, geplant_fuer);

-- ─── RLS (analog zu 20260719_social_agent.sql: nur angemeldete Nutzer) ─────────
alter table public.social_zeitplan enable row level security;

do $$
begin
  create policy "Lesezugriff fuer angemeldete Nutzer"
    on public.social_zeitplan for select to authenticated using (true);
  create policy "Schreibzugriff fuer angemeldete Nutzer"
    on public.social_zeitplan for insert to authenticated with check (true);
  create policy "Aenderung fuer angemeldete Nutzer"
    on public.social_zeitplan for update to authenticated using (true) with check (true);
  create policy "Loeschen fuer angemeldete Nutzer"
    on public.social_zeitplan for delete to authenticated using (true);
exception when duplicate_object then null;
end $$;

-- Anon-Rechte explizit entziehen (Default-Privileges wuerden sie sonst gewaehren).
revoke all on public.social_zeitplan from anon;

-- ─── Cron-Helfer ───────────────────────────────────────────────────────────────
-- VORAUSSETZUNG (einmalig, im SQL-Editor des Dashboards, NICHT in einer Migration):
--
--   select vault.create_secret(
--     '<SERVICE_ROLE_KEY aus Projekt-Einstellungen -> API>',
--     'social_agent_service_role_key',
--     'Service-Role-Key, mit dem die Social-Agent-Cron-Jobs Edge Functions aufrufen'
--   );
--
-- Fehlt dieser Vault-Eintrag, kehren beide Funktionen mit einer Warnung im
-- Postgres-Log zurück, ohne etwas zu tun — die Jobs "scheitern" dann nicht,
-- sie laufen nur sichtbar leer. Details: supabase/functions/README-ZEITPLAN.md

create or replace function public.social_cron_trend_scan()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_key text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'social_agent_service_role_key';
  if v_key is null then
    raise warning 'social_cron_trend_scan: Vault-Eintrag social_agent_service_role_key fehlt — Scan nicht ausgelöst.';
    return;
  end if;

  -- Projekt-URL ist kein Geheimnis (siehe supabase/config.toml: zxyvfdvmyftefrkoaave)
  perform net.http_post(
    url     := 'https://zxyvfdvmyftefrkoaave.supabase.co/functions/v1/social-trend-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('ausgeloest_von', 'zeitplan')
  );
end;
$$;

create or replace function public.social_cron_zeitplan_abarbeiten()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_key    text;
  eintrag  record;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'social_agent_service_role_key';
  if v_key is null then
    raise warning 'social_cron_zeitplan_abarbeiten: Vault-Eintrag social_agent_service_role_key fehlt — keine Ausspielung angestoßen.';
    return;
  end if;

  for eintrag in
    select z.id, z.post_id, z.plattform
    from public.social_zeitplan z
    join public.social_posts p on p.id = z.post_id
    where z.status = 'geplant'
      and z.geplant_fuer <= now()
      and z.angestossen_marker is null    -- jeder Eintrag wird genau einmal angestoßen (kein Doppel-Post)
      and p.status = 'freigegeben'        -- NUR freigegebene Posts — nie Entwürfe, Abgelehnte oder bereits Veröffentlichte
      -- Ohne verbundenen Kanal wird der Eintrag NICHT angestoßen und nicht auf
      -- 'fehlgeschlagen' gesetzt: er bleibt 'geplant' und dient als Erinnerung,
      -- bis der Kanal eingerichtet ist (siehe 20260719_social_kanaele.sql).
      and exists (
        select 1 from public.social_channels k
        where k.plattform = p.plattform and k.verbunden
      )
    order by z.geplant_fuer
    limit 10
  loop
    update public.social_zeitplan set angestossen_marker = gen_random_uuid() where id = eintrag.id;

    -- Bewusst KEIN Statuswechsel hier: 'ausgespielt'/'fehlgeschlagen' setzt allein
    -- die Edge Function social-publish, nachdem die Plattform geantwortet hat —
    -- sie schreibt dabei auch die echte versuch_id zurück. angestossen_marker
    -- gesetzt + status 'geplant' heißt danach ehrlich: angestoßen, aber (noch)
    -- ohne bestätigtes Ergebnis.
    perform net.http_post(
      url     := 'https://zxyvfdvmyftefrkoaave.supabase.co/functions/v1/social-publish',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body    := jsonb_build_object(
        'zeitplan_id', eintrag.id,
        'post_id', eintrag.post_id,
        'plattform', eintrag.plattform,
        'ausgeloest_von', 'zeitplan'
      ),
      -- Instagram-Video kann minutenlang verarbeiten — großzügiges Timeout,
      -- damit pg_net die Verbindung nicht vorzeitig kappt.
      timeout_milliseconds := 120000
    );
  end loop;
end;
$$;

-- Die Helfer lesen Vault-Geheimnisse — kein Aufruf über die Data API:
revoke execute on function public.social_cron_trend_scan() from public, anon, authenticated;
revoke execute on function public.social_cron_zeitplan_abarbeiten() from public, anon, authenticated;

-- ─── Cron-Jobs ─────────────────────────────────────────────────────────────────
-- cron.schedule mit Jobnamen ist idempotent (bestehender Job wird aktualisiert).

-- Täglicher Quellen-Scan, 05:30 UTC
select cron.schedule(
  'social-trend-scan-taeglich',
  '30 5 * * *',
  $$select public.social_cron_trend_scan()$$
);

-- Fällige Zeitplan-Einträge alle 15 Minuten abarbeiten
select cron.schedule(
  'social-zeitplan-abarbeiten',
  '*/15 * * * *',
  $$select public.social_cron_zeitplan_abarbeiten()$$
);

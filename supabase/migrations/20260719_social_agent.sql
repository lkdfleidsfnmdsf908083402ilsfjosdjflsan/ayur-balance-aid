-- Social-Media-Agent für Mandira Ayurveda Resort
--
-- Kette: Quellen-Scan (echte Artikel) -> Themen-Destillation -> Post-Entwurf -> menschliche Freigabe.
--
-- Zwei Konstruktionsregeln, die aus dem Review des Prototyps stammen und hier
-- im Schema verankert sind:
--   1) PROVENIENZ: Jedes Thema kennt seine Quell-Artikel (social_topic_sources),
--      jeder Post erbt die Quell-URLs. Ein Post ohne Quelle ist als solcher erkennbar.
--   2) KEIN AUTO-PUBLISH: social_posts.status wandert nur über 'freigegeben'
--      nach 'veroeffentlicht'; freigegeben_von/freigegeben_am sind dabei Pflicht
--      (Constraint post_freigabe_vollstaendig).

-- ─── Scan-Läufe (Protokoll, damit ein stiller Quellen-Ausfall sichtbar wird) ───
create table if not exists public.social_scans (
  id              uuid primary key default gen_random_uuid(),
  gestartet_am    timestamptz not null default now(),
  beendet_am      timestamptz,
  status          text not null default 'laeuft'
                    check (status in ('laeuft', 'erfolg', 'keine_daten', 'fehler')),
  ausgeloest_von  text not null default 'zeitplan'
                    check (ausgeloest_von in ('zeitplan', 'manuell')),
  quellen_stats   jsonb not null default '{}'::jsonb,  -- {"google_news": 12, "pubmed": 6, "reddit": 0}
  neue_artikel    integer not null default 0,
  neue_themen     integer not null default 0,
  fehlermeldung   text
);

comment on table public.social_scans is
  'Ein Eintrag je Trend-Scan. status=keine_daten bedeutet: Quellen lieferten nichts, es wurde bewusst NICHT generiert.';

-- ─── Rohartikel aus den Quellen ────────────────────────────────────────────────
create table if not exists public.social_trend_items (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid references public.social_scans(id) on delete set null,
  quelle        text not null check (quelle in ('google_news', 'pubmed', 'reddit')),
  quelle_label  text,
  titel         text not null,
  url           text not null,
  zusammenfassung text,
  veroeffentlicht_am timestamptz,
  abgerufen_am  timestamptz not null default now()
);

-- URL ist der Duplikatsschutz: derselbe Artikel wird über Scans hinweg nur einmal gespeichert.
create unique index if not exists social_trend_items_url_uniq
  on public.social_trend_items (url);
create index if not exists social_trend_items_abgerufen_idx
  on public.social_trend_items (abgerufen_am desc);

-- ─── Destillierte Themen ───────────────────────────────────────────────────────
create table if not exists public.social_topics (
  id            uuid primary key default gen_random_uuid(),
  scan_id       uuid references public.social_scans(id) on delete set null,
  thema         text not null,
  aufhaenger    text,                                  -- warum jetzt relevant
  kategorie     text,                                  -- ayurveda | longevity | mental | nutrition | hormones | sleep | thermal | detox
  relevanz      text default 'mittel' check (relevanz in ('hoch', 'mittel', 'niedrig')),
  status        text not null default 'vorgeschlagen'
                  check (status in ('vorgeschlagen', 'geplant', 'bespielt', 'verworfen')),
  dedup_key     text not null,                         -- normalisiertes Thema, verhindert Wiedervorlage
  erstellt_am   timestamptz not null default now()
);

-- Verhindert, dass jeder Scan dieselben Themen erneut vorschlägt.
create unique index if not exists social_topics_dedup_uniq
  on public.social_topics (dedup_key);
create index if not exists social_topics_status_idx
  on public.social_topics (status, erstellt_am desc);

-- ─── Verknüpfung Thema <-> Quell-Artikel (die Provenienz-Kette) ────────────────
create table if not exists public.social_topic_sources (
  topic_id       uuid not null references public.social_topics(id) on delete cascade,
  trend_item_id  uuid not null references public.social_trend_items(id) on delete cascade,
  primary key (topic_id, trend_item_id)
);

-- ─── Post-Entwürfe ─────────────────────────────────────────────────────────────
create table if not exists public.social_posts (
  id               uuid primary key default gen_random_uuid(),
  topic_id         uuid references public.social_topics(id) on delete set null,
  plattform        text not null
                     check (plattform in ('linkedin', 'instagram', 'facebook', 'youtube', 'tiktok', 'threads')),
  tonalitaet       text,
  inhalt           text not null,
  quellen_urls     text[] not null default '{}',       -- aus dem Thema geerbt, im Review sichtbar
  status           text not null default 'entwurf'
                     check (status in ('entwurf', 'freigegeben', 'abgelehnt', 'veroeffentlicht')),
  modell           text,                               -- welches Claude-Modell den Text erzeugt hat
  erstellt_von     uuid references auth.users(id) on delete set null,
  erstellt_am      timestamptz not null default now(),
  freigegeben_von  uuid references auth.users(id) on delete set null,
  freigegeben_am   timestamptz,
  ablehnungsgrund  text,
  veroeffentlicht_am timestamptz,
  geplant_fuer     timestamptz,

  -- Vier-Augen-Prinzip im Schema: kein Post erreicht 'freigegeben'/'veroeffentlicht'
  -- ohne protokollierte Freigabe.
  constraint post_freigabe_vollstaendig check (
    status not in ('freigegeben', 'veroeffentlicht')
    or (freigegeben_von is not null and freigegeben_am is not null)
  )
);

create index if not exists social_posts_status_idx
  on public.social_posts (status, erstellt_am desc);
create index if not exists social_posts_topic_idx
  on public.social_posts (topic_id);

comment on column public.social_posts.quellen_urls is
  'Quell-Links des zugrundeliegenden Themas. Leeres Array = Post ohne Quellenbeleg, im Review kenntlich zu machen.';

-- ─── updated_at-freie Tabellen: bewusst nur Ereigniszeitpunkte, kein Trigger nötig ──

-- ─── RLS ───────────────────────────────────────────────────────────────────────
-- Anders als die älteren Tabellen dieser App NICHT öffentlich: Post-Entwürfe sind
-- unveröffentlichte Markenkommunikation. Lesen/Schreiben darf jeder eingeloggte
-- Nutzer; die Rollentrennung (nur Admin gibt frei, nur Service-Role setzt
-- 'veroeffentlicht') erzwingt der Trigger social_posts_status_wache weiter unten —
-- NICHT der Client. Anonyme Zugriffe sind ausgeschlossen (explizite Revokes unten).
alter table public.social_scans        enable row level security;
alter table public.social_trend_items  enable row level security;
alter table public.social_topics       enable row level security;
alter table public.social_topic_sources enable row level security;
alter table public.social_posts        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'social_scans', 'social_trend_items', 'social_topics',
    'social_topic_sources', 'social_posts'
  ] loop
    execute format(
      'create policy "Lesezugriff fuer angemeldete Nutzer" on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy "Schreibzugriff fuer angemeldete Nutzer" on public.%I for insert to authenticated with check (true)', t);
    execute format(
      'create policy "Aenderung fuer angemeldete Nutzer" on public.%I for update to authenticated using (true)', t);
    execute format(
      'create policy "Loeschen fuer angemeldete Nutzer" on public.%I for delete to authenticated using (true)', t);
  end loop;
exception when duplicate_object then null;
end $$;

-- ─── Rollentrennung serverseitig ───────────────────────────────────────────────

-- Liest die Rolle des aufrufenden Nutzers aus user_profiles. SECURITY DEFINER,
-- damit die Prüfung unabhängig von RLS auf user_profiles funktioniert;
-- search_path fest gesetzt, sonst wäre die Funktion über Schema-Shadowing angreifbar.
--
-- ABHÄNGIGKEIT: public.user_profiles wird von KEINER Migration in diesem Repo angelegt
-- (die Tabelle stammt aus der Lovable-Zeit und existiert nur im Live-Projekt). Gegen eine
-- frische Datenbank — supabase db reset, lokale Entwicklung, CI — bricht diese Migration
-- deshalb ab. Wer das braucht, legt user_profiles(id uuid, role text) vorher an.
-- Die Spalte role ist dieselbe Quelle, aus der useAuth.tsx isAdmin ableitet.
create or replace function public.ist_social_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.ist_social_admin() from public, anon;
grant execute on function public.ist_social_admin() to authenticated, service_role;

create or replace function public.social_posts_status_wache()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  -- OLD existiert nur bei UPDATE; das CASE verhindert den Zugriff bei INSERT.
  alter_status text := case when tg_op = 'UPDATE' then old.status else null end;
begin
  if new.status = 'freigegeben' and new.status is distinct from alter_status then
    if not public.ist_social_admin() then
      raise exception 'Freigabe verweigert: nur Admins duerfen Posts freigeben (Vier-Augen-Prinzip).';
    end if;
    if new.freigegeben_von is not null and new.freigegeben_von is distinct from auth.uid() then
      -- Abweichende Angabe nicht stillschweigend korrigieren, sondern ablehnen.
      raise exception 'Freigabe verweigert: freigegeben_von muss der freigebende Nutzer selbst sein.';
    end if;
    new.freigegeben_von := auth.uid();
    new.freigegeben_am := now();
  end if;

  if new.status = 'veroeffentlicht' and new.status is distinct from alter_status then
    if auth.role() is distinct from 'service_role' then
      raise exception 'Verweigert: veroeffentlicht setzt allein die Edge Function social-publish (Service-Role) nach bestaetigter Plattform-Antwort.';
    end if;
  end if;

  -- INHALTSSPERRE nach der Freigabe.
  -- Ohne sie waere das Vier-Augen-Prinzip wertlos: Ein Admin gibt einen harmlosen
  -- Text frei, danach aendert ein beliebiger angemeldeter Nutzer per Data-API den
  -- Inhalt (Status bleibt 'freigegeben') und der Zeitplan spielt den manipulierten
  -- Text aus. Freigegebenes ist deshalb eingefroren; wer aendern will, zieht die
  -- Freigabe zurueck (-> 'entwurf') und laesst neu freigeben.
  if alter_status in ('freigegeben', 'veroeffentlicht')
     and new.status = alter_status
     and auth.role() is distinct from 'service_role' then
    if new.inhalt        is distinct from old.inhalt
    or new.plattform     is distinct from old.plattform
    or new.quellen_urls  is distinct from old.quellen_urls
    or new.topic_id      is distinct from old.topic_id
    or new.freigegeben_von is distinct from old.freigegeben_von
    or new.freigegeben_am  is distinct from old.freigegeben_am then
      raise exception 'Verweigert: % Posts sind eingefroren. Ziehen Sie die Freigabe zurueck (Status auf entwurf), um den Text zu aendern.', alter_status;
    end if;
  end if;

  -- Rueckzug der Freigabe: Die Freigabe-Spuren muessen mit verschwinden, sonst
  -- traegt ein spaeter erneut freigegebener Post die alte Attribution.
  if tg_op = 'UPDATE'
     and alter_status = 'freigegeben'
     and new.status in ('entwurf', 'abgelehnt') then
    if not public.ist_social_admin() then
      raise exception 'Verweigert: nur Admins duerfen eine erteilte Freigabe zurueckziehen.';
    end if;
    new.freigegeben_von := null;
    new.freigegeben_am := null;
  end if;

  return new;
end;
$$;

drop trigger if exists social_posts_status_wache on public.social_posts;
create trigger social_posts_status_wache
  before insert or update on public.social_posts
  for each row execute function public.social_posts_status_wache();

comment on trigger social_posts_status_wache on public.social_posts is
  'WARUM: Die RLS-Policies erlauben jedem angemeldeten Nutzer Updates — ohne diesen Trigger koennte ein Mitarbeiter seinen eigenen Post per Data-API auf freigegeben setzen und freigegeben_von selbst eintragen. Der Trigger erzwingt das Vier-Augen-Prinzip serverseitig: freigegeben nur durch einen Admin (freigegeben_von = auth.uid()), veroeffentlicht nur durch die Service-Role (social-publish nach bestaetigter Plattform-Antwort).';

-- ─── Bequemlichkeits-View für die Freigabe-Oberfläche ──────────────────────────
-- security_invoker: Die View läuft mit den Rechten des Aufrufers, sonst würde
-- sie als Owner-View die RLS der zugrunde liegenden Tabellen umgehen.
create or replace view public.v_social_posts_review
with (security_invoker = true) as
select
  p.id,
  p.plattform,
  p.tonalitaet,
  p.inhalt,
  p.status,
  p.quellen_urls,
  p.geplant_fuer,
  p.erstellt_am,
  p.freigegeben_am,
  t.thema,
  t.aufhaenger,
  t.kategorie,
  t.relevanz,
  coalesce(array_length(p.quellen_urls, 1), 0) > 0 as hat_quellenbeleg
from public.social_posts p
left join public.social_topics t on t.id = p.topic_id;

-- ─── Anon-Rechte explizit entziehen ────────────────────────────────────────────
-- Supabase-Default-Privileges geben anon SELECT auf neue Relationen in public.
-- RLS ohne anon-Policy blockt zwar die Tabellen, aber nicht die View — und
-- Defense-in-Depth kostet hier nichts: anon hat auf keiner dieser Relationen
-- etwas zu suchen.
revoke all on public.social_scans          from anon;
revoke all on public.social_trend_items    from anon;
revoke all on public.social_topics         from anon;
revoke all on public.social_topic_sources  from anon;
revoke all on public.social_posts          from anon;
revoke all on public.v_social_posts_review from anon;

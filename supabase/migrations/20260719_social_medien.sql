-- Medien-Bibliothek für den Social-Media-Agent
--
-- Idee: Christina wird einmal in verschiedenen Outfits/Kulissen gefilmt,
-- die Clips (und Bilder) landen verschlagwortet im privaten Bucket
-- 'social-medien' und werden von dort immer wieder Posts zugeordnet.
--
-- Konstruktionsregeln (analog 20260719_social_agent.sql):
--   - Kein Löschen von Dateien aus der Oberfläche, nur aktiv=false (Deaktivieren) —
--     ein Asset, das schon in Posts steckt, bleibt nachvollziehbar.
--   - verwendet_zaehler zählt Zuordnungen, damit die Vorschlags-Heuristik
--     nicht immer denselben Clip liefert.

-- ─── Assets (Videos & Bilder) ──────────────────────────────────────────────────
create table if not exists public.social_assets (
  id                uuid primary key default gen_random_uuid(),
  dateiname         text not null,
  storage_pfad      text not null,
  typ               text not null check (typ in ('video', 'bild')),
  mime_type         text not null,
  groesse_bytes     bigint not null,
  dauer_sekunden    numeric,
  breite            integer,
  hoehe             integer,
  titel             text not null,
  beschreibung      text,
  outfit            text,
  kulisse           text,
  themen            text[] not null default '{}',
  format            text check (format in ('hochkant', 'quer', 'quadrat')),
  verwendet_zaehler integer not null default 0,
  hochgeladen_von   uuid references auth.users(id) on delete set null,
  erstellt_am       timestamptz not null default now(),
  aktiv             boolean not null default true
);

comment on table public.social_assets is
  'Wiederverwendbare Video-Clips und Bilder im privaten Bucket social-medien. Deaktivieren statt löschen.';
comment on column public.social_assets.storage_pfad is
  'Pfad der Datei im Storage-Bucket social-medien (privat — Zugriff nur über signierte URLs).';
comment on column public.social_assets.dauer_sekunden is
  'Nur bei Videos gesetzt; wird clientseitig vor dem Upload ausgelesen.';
comment on column public.social_assets.themen is
  'Freie Schlagworte; Überschneidung mit Thema/Kategorie eines Posts steuert die Vorschlags-Heuristik.';
comment on column public.social_assets.format is
  'Seitenverhältnis-Klasse: hochkant (Instagram/TikTok), quer (LinkedIn/Facebook), quadrat.';
comment on column public.social_assets.verwendet_zaehler is
  'Anzahl bisheriger Post-Zuordnungen; die Vorschlags-Heuristik bevorzugt selten genutzte Assets.';
comment on column public.social_assets.aktiv is
  'false = aus der Bibliothek ausgeblendet, Datei und bestehende Zuordnungen bleiben erhalten.';

create index if not exists social_assets_typ_idx    on public.social_assets (typ);
create index if not exists social_assets_format_idx on public.social_assets (format);
create index if not exists social_assets_aktiv_idx  on public.social_assets (aktiv);
create index if not exists social_assets_themen_gin on public.social_assets using gin (themen);

-- ─── Verknüpfung Post <-> Asset ────────────────────────────────────────────────
create table if not exists public.social_post_assets (
  post_id  uuid not null references public.social_posts(id) on delete cascade,
  asset_id uuid not null references public.social_assets(id) on delete cascade,
  primary key (post_id, asset_id)
);

comment on table public.social_post_assets is
  'Welches Asset ist welchem Post zugeordnet. Zuordnen/Lösen pflegt social_assets.verwendet_zaehler.';

-- Zähler race-frei pflegen (supabase-js kann keine Ausdrücke wie zaehler+1 updaten)
create or replace function public.social_asset_verwendung(p_asset_id uuid, p_delta integer)
returns void
language sql
security invoker
as $$
  update public.social_assets
  set verwendet_zaehler = greatest(0, verwendet_zaehler + p_delta)
  where id = p_asset_id;
$$;

-- ─── RLS (gleiches Muster wie 20260719_social_agent.sql: authenticated alles, anon nichts) ──
alter table public.social_assets      enable row level security;
alter table public.social_post_assets enable row level security;

do $$
declare t text;
begin
  foreach t in array array['social_assets', 'social_post_assets'] loop
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

-- Anon-Rechte explizit entziehen (Default-Privileges wuerden sie sonst gewaehren).
revoke all on public.social_assets      from anon;
revoke all on public.social_post_assets from anon;
revoke execute on function public.social_asset_verwendung(uuid, integer) from public, anon;
grant execute on function public.social_asset_verwendung(uuid, integer) to authenticated, service_role;

-- ─── Storage-Bucket (privat — Auslieferung nur über signierte URLs) ────────────
insert into storage.buckets (id, name, public)
values ('social-medien', 'social-medien', false)
on conflict (id) do nothing;

do $$
begin
  create policy "social-medien lesen fuer angemeldete Nutzer"
    on storage.objects for select to authenticated
    using (bucket_id = 'social-medien');
  create policy "social-medien hochladen fuer angemeldete Nutzer"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'social-medien');
  create policy "social-medien aendern fuer angemeldete Nutzer"
    on storage.objects for update to authenticated
    using (bucket_id = 'social-medien');
  create policy "social-medien loeschen fuer angemeldete Nutzer"
    on storage.objects for delete to authenticated
    using (bucket_id = 'social-medien');
exception when duplicate_object then null;
end $$;

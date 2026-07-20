-- Ausspielungs-Schicht für den Social-Media-Agent
--
-- Zwei Tabellen:
--   social_channels          — welcher Plattform-Zugang existiert und ob er verbunden ist
--   social_publish_attempts  — Protokoll JEDES Ausspielversuchs, erfolgreich oder nicht
--
-- Konstruktionsregeln (analog 20260719_social_agent.sql):
--   - EHRLICHKEIT: Solange kein Kanal verbunden ist, sagt die Oberfläche das klar.
--     Es gibt keinen Status "gesendet" ohne bestätigte Antwort der Plattform.
--   - KEINE TOKENS IN DER DB: social_channels trägt nur den NAMEN des
--     Supabase-Secrets (token_secret_name). Das Token selbst liegt ausschließlich
--     in den Edge-Function-Secrets (supabase secrets set ...).

-- ─── Plattform-Kanäle ──────────────────────────────────────────────────────────
create table if not exists public.social_channels (
  id                 uuid primary key default gen_random_uuid(),
  plattform          text not null
                       check (plattform in ('linkedin', 'instagram', 'facebook', 'youtube', 'tiktok', 'threads')),
  anzeigename        text,
  konto_id           text,                -- z.B. IG-Business-Account-ID, LinkedIn-URN, Facebook-Page-ID, YouTube-Channel-ID
  verbunden          boolean not null default false,
  token_secret_name  text,
  token_gueltig_bis  timestamptz,
  letzter_check      timestamptz,
  letzter_fehler     text,
  erstellt_am        timestamptz not null default now(),
  aktualisiert_am    timestamptz not null default now()
);

-- Genau ein Kanal-Eintrag je Plattform.
create unique index if not exists social_channels_plattform_uniq
  on public.social_channels (plattform);

comment on table public.social_channels is
  'Ein Eintrag je Plattform. verbunden=false heißt: Ausspielen ist nicht möglich und die Oberfläche sagt das ehrlich.';
comment on column public.social_channels.token_secret_name is
  'AUSSCHLIESSLICH der Name des Supabase-Secrets (z.B. META_PAGE_TOKEN), unter dem das Zugangstoken per "supabase secrets set" hinterlegt ist. Das Token selbst darf NIEMALS in dieser Tabelle oder sonst irgendwo in der Datenbank stehen.';
comment on column public.social_channels.konto_id is
  'Plattform-Kennung des Kontos: Facebook-Page-ID, Instagram-Business-Account-ID, LinkedIn-Organisations-URN (urn:li:organization:...), YouTube-Channel-ID, TikTok-Open-ID.';

-- ─── Ausspiel-Protokoll ────────────────────────────────────────────────────────
-- Jeder Versuch wird festgehalten — erfolgreich oder nicht. Ein Post gilt nur
-- dann als veröffentlicht, wenn hier ein Eintrag mit erfolg=true und einer
-- externen Post-ID der Plattform steht.
create table if not exists public.social_publish_attempts (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid not null references public.social_posts(id) on delete cascade,
  plattform      text not null
                   check (plattform in ('linkedin', 'instagram', 'facebook', 'youtube', 'tiktok', 'threads')),
  versucht_am    timestamptz not null default now(),
  -- Wer/was hat ausgelöst: bei 'manuell' die aus dem JWT verifizierte Nutzer-ID,
  -- bei 'zeitplan' null (die Freigabe-Identität steht in social_posts.freigegeben_von).
  ausgeloest_von uuid references auth.users(id) on delete set null,
  ausloeser_art  text not null
                   check (ausloeser_art in ('manuell', 'zeitplan')),
  erfolg         boolean not null,
  externe_id     text,                 -- Post-ID der Plattform, nur bei bestätigtem Erfolg
  externe_url    text,
  http_status    integer,
  fehlermeldung  text,
  antwort_auszug text                  -- gekürzte Rohantwort der Plattform, für Diagnose
);

create index if not exists social_publish_attempts_post_idx
  on public.social_publish_attempts (post_id, versucht_am desc);

comment on table public.social_publish_attempts is
  'Protokoll jedes Ausspielversuchs. Auch erwartete Abbrüche (Kanal nicht verbunden, Token fehlt) werden mit erfolg=false festgehalten.';
comment on column public.social_publish_attempts.externe_id is
  'Von der Plattform bestätigte Post-ID. Ohne diese ID gilt ein Versuch nie als Erfolg.';
comment on column public.social_publish_attempts.ausgeloest_von is
  'Aus dem JWT verifizierte Nutzer-ID des Auslösers (nur bei ausloeser_art=manuell). NIEMALS ein ungeprüfter Body-Parameter.';

-- ─── RLS (gleiches Muster wie 20260719_social_agent.sql: authenticated alles, anon nichts) ──
alter table public.social_channels         enable row level security;
alter table public.social_publish_attempts enable row level security;

-- Diese beiden Tabellen sind BEWUSST enger gefasst als die uebrigen social_*-Tabellen.
--
-- social_publish_attempts ist das Beweisstueck: Es belegt, was wann wirklich nach
-- aussen ging. Duerfte jeder angemeldete Nutzer es aendern oder loeschen, koennte er
-- einen Fehlschlag wegwischen oder mit erfundener externe_id einen Erfolg vortaeuschen
-- — die Oberflaeche wuerde den gefaelschten Eintrag anzeigen. Geschrieben wird deshalb
-- ausschliesslich von der Edge Function social-publish (Service-Role, umgeht RLS).
--
-- social_channels bestimmt das Ausspielziel (konto_id) und ob ein Kanal als verbunden
-- gilt. Wer das aendern kann, lenkt die Veroeffentlichung um — das bleibt Admins vorbehalten.
do $$
begin
  -- Lesen: jeder angemeldete Nutzer.
  create policy "Lesezugriff fuer angemeldete Nutzer"
    on public.social_publish_attempts for select to authenticated using (true);
  create policy "Lesezugriff fuer angemeldete Nutzer"
    on public.social_channels for select to authenticated using (true);

  -- Schreiben auf das Protokoll: niemand ausser der Service-Role. Bewusst KEINE
  -- insert/update/delete-Policy fuer authenticated — fehlende Policy heisst verboten.

  -- Kanaele pflegen: nur Admins.
  create policy "Kanalpflege nur durch Admins"
    on public.social_channels for insert to authenticated
    with check (public.ist_social_admin());
  create policy "Kanalaenderung nur durch Admins"
    on public.social_channels for update to authenticated
    using (public.ist_social_admin()) with check (public.ist_social_admin());
  create policy "Kanalloeschung nur durch Admins"
    on public.social_channels for delete to authenticated
    using (public.ist_social_admin());
exception when duplicate_object then null;
end $$;

-- Anon-Rechte explizit entziehen (Default-Privileges wuerden sie sonst gewaehren).
revoke all on public.social_channels         from anon;
revoke all on public.social_publish_attempts from anon;

-- ─── Die sechs Plattformen anlegen, alle unverbunden ───────────────────────────
-- Damit die Kanal-Übersicht von Tag eins an vollständig und ehrlich ist:
-- sechs Zeilen, alle verbunden=false, bis echte Zugänge eingerichtet sind.
insert into public.social_channels (plattform, anzeigename)
values
  ('linkedin',  'Mandira Ayurveda Resort'),
  ('instagram', 'Mandira Ayurveda Resort'),
  ('facebook',  'Mandira Ayurveda Resort'),
  ('youtube',   'Mandira Ayurveda Resort'),
  ('tiktok',    'Mandira Ayurveda Resort'),
  ('threads',   'Mandira Ayurveda Resort')
on conflict (plattform) do nothing;

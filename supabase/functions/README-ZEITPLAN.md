# Zeitplan-Automatik des Social-Media-Agents

Die Migration `supabase/migrations/20260719_social_zeitplan.sql` legt zwei Cron-Jobs an
(pg_cron + pg_net, beides in Supabase verfügbar):

| Job | Rhythmus | Was er tut |
| --- | --- | --- |
| `social-trend-scan-taeglich` | täglich 05:30 UTC | ruft die Edge Function `social-trend-scan` auf (`ausgeloest_von: 'zeitplan'`) |
| `social-zeitplan-abarbeiten` | alle 15 Minuten | übergibt fällige Einträge aus `social_zeitplan` an `social-publish` — nur für Posts mit Status `freigegeben` und nur, wenn der Kanal verbunden ist |

Wichtig zum Verständnis: Der Cron-Job markiert nie selbst etwas als „ausgespielt".
Diesen Status setzt allein `social-publish`, nachdem die Plattform mit einer Post-ID
geantwortet hat. Ohne verbundenen Kanal bleiben Einträge als Erinnerung auf `geplant`.

## 1. Vault-Eintrag setzen (einmalig, Pflicht)

Die Jobs brauchen den Service-Role-Key, um die Edge Functions aufzurufen. Er steht
bewusst **nicht** im Migrations-SQL, sondern in Supabase Vault. Ohne diesen Eintrag
laufen die Jobs sichtbar leer (Warnung im Postgres-Log), sie scheitern nicht.

Im SQL-Editor des Dashboards (Projekt `zxyvfdvmyftefrkoaave`) ausführen:

```sql
select vault.create_secret(
  '<SERVICE_ROLE_KEY>',                  -- Dashboard: Projekt-Einstellungen -> API -> service_role
  'social_agent_service_role_key',
  'Service-Role-Key, mit dem die Social-Agent-Cron-Jobs Edge Functions aufrufen'
);
```

Prüfen, ob er da ist (zeigt nur den Namen, nicht den Wert):

```sql
select name, created_at from vault.secrets where name = 'social_agent_service_role_key';
```

Key rotieren: erst `select vault.update_secret(id, '<NEUER_KEY>')` mit der id aus
`vault.secrets`, oder Eintrag löschen und neu anlegen.

## 2. Prüfen, ob die Cron-Jobs laufen

```sql
-- Sind die Jobs registriert und aktiv?
select jobid, jobname, schedule, active from cron.job;

-- Letzte Läufe mit Status und Meldung (neueste zuerst)
select jobname, status, return_message, start_time
from cron.job_run_details d
join cron.job j using (jobid)
order by start_time desc
limit 20;
```

`status = 'succeeded'` heißt nur: das SQL lief durch. Ob der Scan bzw. das Ausspielen
inhaltlich funktioniert hat, zeigen `social_scans` (Spalten `status`, `fehlermeldung`)
und `social_zeitplan` / `social_publish_attempts`. Lief der Job leer, weil der
Vault-Eintrag fehlt, steht die Warnung im Postgres-Log (Dashboard -> Logs -> Postgres).

Die HTTP-Aufrufe selbst protokolliert pg_net kurzzeitig in `net._http_response`:

```sql
select id, status_code, error_msg, created from net._http_response order by created desc limit 10;
```

## 3. Jobs vorübergehend abschalten / wieder einschalten

```sql
-- Abschalten (Job bleibt registriert, läuft aber nicht)
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'social-trend-scan-taeglich';
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'social-zeitplan-abarbeiten';

-- Wieder einschalten
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'social-trend-scan-taeglich';
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'social-zeitplan-abarbeiten';
```

Dauerhaft entfernen: `select cron.unschedule('<jobname>');`

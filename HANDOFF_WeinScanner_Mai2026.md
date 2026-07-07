# Weinscanner — Handoff Mai 2026

Vollständige Dokumentation der Weinscanner-Komponente im Ayur-Balance-Aid Projekt
(Mandira KPI Dashboard, ausgeliefert unter `https://kpi.ecomarine-group.com`).

**Stand:** 24. Mai 2026 — Initialer produktiver Rollout
**Author:** Andreas Drexler + Claude

---

## 1. Was die Komponente macht

Ein Wein-Erfassungs-Tool für das Hotel mit:
- **Barcode-Scanner** (live per Kamera, ZXing-basiert) + manuelle Eingabe als Fallback
- **Wein-Erkennung in Stufen** (Cache → Katalog → Open Food Facts → Vivino → Foto+KI)
- **Foto-basierte Etiketten-Erkennung** über Claude Vision (Anthropic)
- **Lagerverwaltung** mit Hierarchie: Kühlhaus 1/2 (Reihe/Fach), Küche Kühlfach (Reihe/Schublade),
  Bar, Restaurant
- **Bestandsübersicht** mit Belegungs-Heatmap pro Fach
- **Vivino-CSV-Import** für initialen Stammdaten-Aufbau

Datenfluss: jeder gescannte Wein wird mit Barcode + Lagerort in der DB gespeichert →
beim nächsten Scan desselben Barcodes Instant-Treffer aus dem eigenen Bestand.

---

## 2. Aktueller Lookup-Chain bei Barcode-Scan

```
Eigener Bestand (wein_lager.barcode)
       ↓ kein Treffer
Wein-Katalog (wein_katalog.barcode)
       ↓ kein Treffer
Open Food Facts (öffentliche Lebensmittel-DB)
       ↓ kein Treffer
Vivino (Volltext-Suche mit Barcode als Query, Long-Shot)
       ↓ kein Treffer
"Wein noch nicht bekannt"-Screen → Foto vorschlagen
       ↓ Nutzer wählt Foto
Claude Vision (Edge Function recognize-wine)
       ↓ Erkennung erfolgreich
Katalog-Match-Versuch + ggf. Vivino-Anreicherung (Edge Function vivino-search)
       ↓
Speichern in wein_lager mit Barcode → Cache-Treffer beim nächsten Scan
```

**Wichtig:** Bei Foto-Erkennung mit vorher gescanntem Barcode wird der Barcode an
den erkannten Wein gehängt und sowohl in `wein_lager` als auch (falls Katalog-Match)
an den Katalog-Eintrag zurückgeschrieben. Das System lernt sich selbst.

---

## 3. Datei-Inventar

### Neu erstellte Files (`src/`)

| Datei | Zweck |
|---|---|
| `hooks/useBarcodeScanner.ts` | ZXing-basierter Live-Scanner mit Callback-Ref, Vibration, Torch-Toggle, Debug-Logs |
| `lib/wineLookup.ts` | Komplette Lookup-Kette + EAN-Validierung + Name-Similarity |
| `lib/csvImport.ts` | CSV-Parser mit Quoting/BOM-Handling + Vivino-Spalten-Erkennung |
| `components/wein/StorageOverview.tsx` | Bestandsübersicht mit Tab-Navigation und Heatmap-Grid |
| `components/wein/VivinoCellarImport.tsx` | CSV-Import-Dialog für Vivino-Cellar-Exports |
| `components/views/WeinScannerView.tsx` | Hauptview (ersetzte vorherige 891-Zeilen-Version) |

### Backups vorhandener Files

| Datei | Was geändert |
|---|---|
| `components/MandiraLogo.tsx` | `style`-Prop hinzugefügt |
| `components/ui/badge.tsx` | `warning`-Variante hinzugefügt |
| `components/views/HousekeepingKpiView.tsx` | Doppel-Import entfernt |
| `components/views/KitchenKpiView.tsx` | Doppel-Import entfernt |
| `components/views/ServiceKpiView.tsx` | Doppel-Import entfernt |
| `components/views/TechnicalKpiView.tsx` | Doppel-Import entfernt |
| `components/views/WeinScannerView.tsx.bak.20260519-204604` | Backup der alten Version, falls Rollback nötig |

### Supabase

| Datei | Zweck |
|---|---|
| `supabase/functions/recognize-wine/index.ts` | Claude Vision Proxy (Anthropic API) |
| `supabase/functions/vivino-search/index.ts` | CORS-Proxy für Vivinos `/api/explore` |
| `supabase/migrations/20260524_wein_lager_barcode.sql` | Fügt `barcode` + `kuehlhaus_nr` zu wein_lager hinzu |
| `supabase/migrations/20260524_wein_katalog.sql` | Neue Tabelle für Wein-Stammdaten |

---

## 4. Datenbank-Schema

### `wein_lager` (Inventar — physische Flaschen)

```sql
CREATE TABLE public.wein_lager (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  weingut         TEXT,
  jahrgang        TEXT,
  rebsorte        TEXT,
  region          TEXT,
  lagerort        TEXT NOT NULL,       -- 'kuehlhaus' | 'kueche' | 'bar' | 'restaurant'
  kuehlhaus_nr    INT,                 -- nur 1 oder 2, nur bei lagerort='kuehlhaus'
  reihe           INT,
  fach            INT,                 -- bei Küche: Schubladennummer
  anzahl_flaschen INT,
  einkaufspreis   NUMERIC,
  barcode         TEXT,                -- NEU: Cache-Key für wiederholte Scans
  erfasst_am      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_wein_lager_barcode ON wein_lager(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_wein_lager_position ON wein_lager(lagerort, kuehlhaus_nr, reihe, fach);
```

**Kühlhaus-Struktur** (hardcoded im Frontend, `KUEHLHAUS_REIHEN`):
- Reihen 1–4: 9 Fächer
- Reihe 5: 5 Fächer
- Reihe 6: 6 Fächer
- Reihen 7–9: 5 Fächer

**Küche-Struktur** (hardcoded im Frontend, `KUECHE_REIHEN`):
- Reihen 1–3: 2 Schubladen
- Reihen 4–6: 3 Schubladen

### `wein_katalog` (Stammdaten — bekannte Weine)

```sql
CREATE TABLE public.wein_katalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  weingut         TEXT,
  jahrgang        TEXT,
  rebsorte        TEXT,
  region          TEXT,
  land            TEXT,
  beschreibung    TEXT,
  bild_url        TEXT,
  barcode         TEXT,                          -- erst gesetzt nach erstem Scan
  vivino_id       TEXT,                          -- für Re-Imports
  source          TEXT DEFAULT 'manual',         -- 'vivino_cellar' | 'claude' | 'manual' | ...
  hinzugefuegt_am  TIMESTAMPTZ DEFAULT now(),
  aktualisiert_am  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, weingut, jahrgang)
);
```

---

## 5. Infrastruktur

### Server
- **Provider:** Hetzner Cloud
- **IP:** `157.90.21.134`
- **SSH-Port:** `2264` (nicht Standard 22!)
- **SSH-User:** `root`
- **Webroot für KPI-App:** `/var/www/kpi/`
- **nginx-Config:** `/etc/nginx/sites-available/kpi`
- **Hostname auf Server:** `website` (interner Hostname)

### DNS / CDN
- **Domain:** `ecomarine-group.com` (provider unbekannt)
- **Subdomain:** `kpi.ecomarine-group.com` → A-Record `157.90.21.134`
- **CDN:** Cloudflare (proxied, orange Wolke)
- Folge: HTTPS-Traffic geht über Cloudflare, SSH muss direkt über die IP+Port 2264 laufen

### Supabase
- **Projekt-ID:** `zxyvfdvmyftefrkoaave`
- **Dashboard:** https://supabase.com/dashboard/project/zxyvfdvmyftefrkoaave
- **Edge Functions:** `recognize-wine`, `vivino-search` (deployed mit `--no-verify-jwt`)
- **Secret:** `ANTHROPIC_API_KEY` (für Claude Vision)

### GitHub
- **Repo:** `lkdfleidsfnmdsf908083402ilsfjosdjflsan/ayur-balance-aid`
- **Branch:** `main`

---

## 6. Deploy-Workflow

### Voraussetzung — SSH-Config (einmalig)

Datei `~/.ssh/config` auf dem Mac:

```
Host website kpi
  HostName 157.90.21.134
  Port 2264
  User root
  ServerAliveInterval 60
```

Danach geht `ssh website` und `rsync ... website:...` ohne IP-Wissen.

### Standard-Deploy (nach Code-Änderungen)

```bash
cd ~/Developer/ayur-balance-aid

# 1. Commit + Push
git add <geänderte-files>
git commit -m "..."
git push origin main

# 2. Production-Build
npm run build

# 3. Auf Server schieben (überschreibt /var/www/kpi/ komplett)
rsync -avz --delete dist/ website:/var/www/kpi/

# Falls SSH-Config nicht eingerichtet:
rsync -avz --delete -e "ssh -p 2264" dist/ root@157.90.21.134:/var/www/kpi/
```

### Edge-Functions deployen (nach Function-Änderungen)

```bash
cd ~/Developer/ayur-balance-aid

# Secret aktualisieren (nur bei Bedarf):
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Functions deployen:
npx supabase functions deploy recognize-wine --no-verify-jwt
npx supabase functions deploy vivino-search --no-verify-jwt
```

### Migrations anwenden

**⚠️ `supabase db push` läuft NICHT durch** weil alte Migrations Konflikte mit dem
Remote-DB-Stand haben (Tabellen wurden früher außerhalb der CLI angelegt).

**Stattdessen:** Migrations via Supabase Dashboard ausführen:
1. https://supabase.com/dashboard/project/zxyvfdvmyftefrkoaave/sql/new
2. Inhalt der Migration-Datei reinpasten
3. "Run" klicken

Alle eigenen Migrations sind mit `IF NOT EXISTS` geschrieben, also mehrfach ausführbar.

### Types neu generieren (nach Schema-Änderungen)

```bash
cd ~/Developer/ayur-balance-aid
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

---

## 7. Vivino-CSV-Import-Workflow

So baust du den initialen Wein-Katalog auf:

1. **Vivino-App** auf dem Handy öffnen
2. Mit Scanner durch das Lager — jede Flasche kommt in "My Wines"
3. **Vivino Web** (https://www.vivino.com) → Login → My Wines → "Export Wine List"
4. CSV-Datei herunterladen
5. **In der KPI-App:** Weinscanner → Weinlager-Tab → **Import**-Sub-Tab
6. CSV wählen → Vorschau prüfen → Bestätigen
7. Duplikate werden über `UNIQUE(name, weingut, jahrgang)` automatisch übersprungen

**Was die CSV enthält:** Wein-Name, Weingut, Jahrgang, Region, Rebsorte, Notes —
diese werden auf `wein_katalog`-Spalten gemappt. Der Barcode ist in der CSV **NICHT**
enthalten und wird beim ersten Match nach Foto-Scan zurückgeschrieben.

**Re-Import sicher:** kann beliebig oft laufen, Duplikate werden ignoriert.

---

## 8. Bekannte Probleme / Offene Punkte

### Verbleibende TypeScript-Fehler (~157)
**Problem:** 13 Tabellen werden im Code referenziert, existieren aber nicht in der DB:

```
abteilungsleiter, profiles, invitations, guests, guest_stays,
admin_daily_reports, frontoffice_daily_reports, hk_daily_reports,
technical_daily_reports, abteilung_kpi_monat,
technik_aktuelles_monatsbudget,
v_department_monthly_staff_kpis, v_department_staff_kpis
```

Betroffene UI-Views: `AdminKpiView`, `BenutzerVerwaltungView`, `GaesteVerwaltungView`,
`GastAnalyticsView`, `AbteilungKpiView`, `TechnikBestellungenView`, u.a.

**Heißt:** Diese Features sind im Code, aber die Backend-Tabellen sind nicht angelegt.
Bei Aufruf der Views passieren Runtime-Fehler oder leere Listen.

**Folgen:** Build läuft (Vite ignoriert TS-Fehler), Production funktioniert für nicht
betroffene Features. Die TS-Fehler sind aber IDE-Lärm und maskieren echte Probleme.

**Lösungswege** (für spätere Session):
1. **Tabellen anlegen** — falls die Features wirklich gebraucht werden, SQL-Migrations
   schreiben für die 13 Tabellen
2. **Code entfernen** — falls die Features nicht mehr gebraucht werden, betroffene
   Views löschen
3. **Stub-Types hinzufügen** — pragmatisch, macht TS still, lässt aber kaputten
   Code im Bundle

### Live-Kamera-Scanner — Status unklar
Hook wurde mit Callback-Ref und Debug-Logs neu gebaut, aber bisher kein End-to-End-Test
auf realem Mobile-Device (iPad). Beim Testen:

1. DevTools öffnen
2. Console-Tab
3. Filtern nach `[BarcodeScanner]`
4. Beim Aufruf der Barcode-Scan-Seite müssen erscheinen:
   - `videoRef callback: attached`
   - `starte Scanner …`
   - `decodeFromConstraints aufrufen …`
   - `Scanner läuft`

**Falls Fehler:** Logs zeigen exakte Ursache (Permission, Security, oder ZXing-Fehler).

### Service-Worker-Cache (PWA)
Die App hat Workbox-basierten Service-Worker. Nach Deploy zeigen User-Geräte zunächst
die alte Version, bis der SW die neue lädt und das Tab geschlossen+wieder geöffnet wird.

**Bei Testing:** DevTools → Application → Service Workers → "Unregister" + Storage
"Clear site data" + Hard Reload.

### `supabase db push` funktioniert nicht
Mischmasch aus alten Migrations und Direkt-DB-Änderungen führt zu Konflikten beim Push.
**Workaround:** Migrations via Dashboard-SQL-Editor anwenden (siehe Sektion 6).

**Langfristige Lösung (nicht heute):** `supabase migration repair --status applied <version>`
für alle alten Migrations, um die Migration-History zu reparieren.

---

## 9. Wichtige Konfigurationen

### `capacitor.config.ts`
Verweist noch auf Lovable-Preview-URL — relikt aus Lovable-Scaffolding-Zeit.
Hat keinen Effekt auf die Web-Auslieferung (nur relevant für Capacitor-iOS/Android-Builds,
die aktuell nicht existieren).

```ts
server: {
  url: 'https://7fbe91ad-e9da-48de-9a3d-e33a3f1ae0c3.lovableproject.com',
  cleartext: true
}
```

Sollte für eine echte iOS/Android-App durch eine richtige Setup-URL ersetzt werden.

### `tsconfig.json`
Hat **`strictNullChecks: false`** und **`noImplicitAny: false`** — sehr nachsichtig.
Das ist warum so viele TS-Fehler nicht den Build blockieren.

### Lucide-Icons
Verwendet `lucide-react@^0.462.0`. Alle genutzten Icons (inkl. `Flashlight`,
`FlashlightOff`, `LayoutGrid`, `Upload`) sind in dieser Version vorhanden.

---

## 10. Typische Aufgaben — Wie tu ich…?

### …einen neuen Lagerort hinzufügen?
In `WeinScannerView.tsx`:
1. `KUEHLHAUS_REIHEN` oder `KUECHE_REIHEN` erweitern (oder neue Struktur)
2. `Step`-Type um neuen Schritt erweitern
3. `storage_type`-Render-Block um neuen Button
4. Render-Blocks für Reihe/Fach hinzufügen
5. In `StorageOverview.tsx`: Tab-Bar + Renderer erweitern

### …die Lookup-Reihenfolge ändern?
In `lib/wineLookup.ts`, Funktion `lookupBarcode()` — die Stufen sind klar
hintereinander, einfach umsortieren oder eine rausnehmen.

### …eine weitere Wein-Quelle integrieren (z.B. Wine-Searcher API)?
1. Neue Edge Function `wine-searcher.ts` mit deren API-Aufruf + CORS-Header
2. In `lib/wineLookup.ts` neue Funktion `searchWineSearcher()` analog zu `searchVivino()`
3. In `lookupBarcode()` als Stufe einbauen
4. UI-Source-Badge in `WeinScannerView.tsx` ergänzen

### …die Bestandsübersicht erweitern (z.B. Stockwerk/Etage)?
`StorageOverview.tsx` hat klare Section-Renderer (`renderKuehlhaus`, `renderKueche`,
`renderFlat`). Analog erweitern.

### …Bestand bearbeiten (Flaschen entnehmen)?
**Aktuell nicht implementiert!** Nur Anlegen und Löschen. Für später:
- UI im Detail-Modal der Bestandsübersicht: Plus/Minus-Buttons
- Backend: einfach `anzahl_flaschen` updaten
- Audit-Log via neue Tabelle `wein_bewegung` (id, wein_lager_id, delta, grund, user_id, datum)

### …Anthropic-Modell wechseln?
In `supabase/functions/recognize-wine/index.ts` ist das Model `claude-sonnet-4-5`
hardcoded. Ändern und `supabase functions deploy recognize-wine --no-verify-jwt`.

---

## 11. Troubleshooting

| Symptom | Ursache | Lösung |
|---|---|---|
| Kamera startet nicht | Permission verweigert, HTTP statt HTTPS, oder ZXing-Fehler | Console-Logs `[BarcodeScanner]` prüfen |
| "Wein nicht gefunden" bei jedem Scan | Cache leer, OFF kennt keine Weine, Vivino blockiert | CSV-Import durchführen (Vivino-Cellar) |
| Edge Function 500 | `ANTHROPIC_API_KEY` nicht gesetzt | `supabase secrets set ANTHROPIC_API_KEY=…` |
| Edge Function CORS-Fehler | Function nicht deployed | `supabase functions deploy <name> --no-verify-jwt` |
| Build-Output nicht auf Server sichtbar | Service-Worker-Cache | Application → SW unregister + Clear site data + Hard Reload |
| `rsync: Connection refused` | SSH-Port nicht Standard | `-e "ssh -p 2264"` oder SSH-Config-Alias nutzen |
| `git push: Authentication failed` | GitHub akzeptiert kein Password mehr | `gh auth login` (GitHub CLI) oder Personal Access Token |
| `supabase db push: relation already exists` | Migrations-Konflikt mit Live-DB | Migration manuell via Dashboard SQL-Editor ausführen |

---

## 12. Dependencies (was im package.json dazukam)

```json
"@zxing/browser": "^0.1.5",   // installiert als 0.2.0
"@zxing/library": "^0.21.3"   // installiert als 0.22.0
```

Wichtig: **ZXing-API in v0.2.0 anders als in v0.1.x** — `decodeFromConstraints` ist
da, aber Konstruktor und Modul-Layout sind verschoben. Bei späteren Upgrades immer
die API gegen Doku abgleichen.

---

## 13. Wenn du das wieder aufgreifst — Quick-Start

1. **Code-State holen:**
   ```bash
   cd ~/Developer/ayur-balance-aid
   git pull origin main
   npm install   # falls neue Dependencies dazugekommen sind
   ```

2. **Lokal starten:**
   ```bash
   npm run dev
   # → http://localhost:8080/
   ```

3. **Schema prüfen:**
   - Supabase Dashboard → Table Editor → `wein_lager` und `wein_katalog` müssen
     existieren mit den Spalten aus Sektion 4

4. **Edge Functions prüfen:**
   - Supabase Dashboard → Edge Functions → `recognize-wine` und `vivino-search`
     müssen "Deployed" sein
   - Secret `ANTHROPIC_API_KEY` muss gesetzt sein

5. **Deploy nach Änderung:**
   - Siehe Sektion 6

---

## 14. Kontakt-Punkt für später

Bei Fragen zu dieser Implementierung sind die Schlüsseldateien:
- **Lookup-Logik:** `src/lib/wineLookup.ts` — komplette Suchstrategie
- **Scanner-Implementation:** `src/hooks/useBarcodeScanner.ts` — ZXing-Wrapper
- **UI-Hauptview:** `src/components/views/WeinScannerView.tsx` — State-Machine
- **Datenbank:** beide Migration-Dateien in `supabase/migrations/2026-05-24_*`
- **Backend-Proxies:** beide Edge-Functions in `supabase/functions/`

Alle Files haben oben ausführliche Header-Kommentare die das Was/Warum erklären.

---

**Ende des Handoffs.**

Falls dieser Stand mal nicht mehr passt: das alte WeinScannerView ist in
`src/components/views/WeinScannerView.tsx.bak.20260519-204604` als Rollback verfügbar.

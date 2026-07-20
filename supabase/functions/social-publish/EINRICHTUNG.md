# Einrichtung der Plattform-Zugänge für das automatische Ausspielen

Diese Anleitung beschreibt, was bei Meta (Facebook/Instagram), LinkedIn, YouTube und
TikTok beantragt werden muss, damit die App freigegebene Posts per Knopfdruck
ausspielen kann. Bis das erledigt ist, zeigt die App ehrlich „Kanal nicht verbunden"
— der Weg nach draußen ist dann „Text kopieren" und manuelles Posten.

**Ehrliche Vorbemerkung zum Aufwand:** Jede Plattform verlangt einen eigenen
Entwickler-Account, einen Antrag mit Begründung und eine Prüfung, die Tage bis
Wochen dauern kann. Rechnen Sie insgesamt mit mehreren Stunden Einrichtungsarbeit
verteilt über 2–6 Wochen Wartezeit. Das ist normal und kein Fehler der App.

---

## Grundprinzip: Wo liegen die Zugangsdaten?

- **Tokens liegen NIE in der Datenbank.** Sie werden als „Secrets" beim
  Server-Dienst Supabase hinterlegt (Kommandozeile: `supabase secrets set NAME=wert`,
  oder im Supabase-Dashboard unter *Edge Functions → Secrets*).
- Die Tabelle `social_channels` in der App speichert nur den **Namen** des Secrets
  (z. B. `META_PAGE_TOKEN`) und die Konto-Kennung der Plattform.
- Ein Kanal gilt erst als „verbunden", wenn in `social_channels` das Feld
  `verbunden` auf `true` gesetzt, die `konto_id` eingetragen und das zugehörige
  Secret gesetzt ist.

Nach jeder Einrichtung eines Kanals sind also drei Schritte nötig:

1. Secret setzen: `supabase secrets set <SECRET_NAME>=<token>`
2. In `social_channels` die Zeile der Plattform pflegen:
   `konto_id`, `token_secret_name` (= der Secret-Name aus Schritt 1),
   `token_gueltig_bis` (falls bekannt) und `verbunden = true`.
3. Einen Testpost freigeben und ausspielen. Erst wenn im Protokoll
   (`social_publish_attempts`) ein Eintrag mit `erfolg = true` und einer
   Plattform-Post-ID steht, funktioniert der Kanal wirklich.

---

## 1. Meta (Facebook-Seite + Instagram)

Facebook und Instagram laufen beide über die „Meta Business App". Ein Antrag
deckt beide ab.

**Voraussetzungen:**
- Ein Meta-Business-Portfolio (business.facebook.com) mit der Facebook-Seite
  des Resorts.
- Das Instagram-Konto muss ein **Business-Konto** sein und mit der
  Facebook-Seite verknüpft werden (Instagram-App → Einstellungen → Konto →
  in Business-Konto umwandeln → Seite verknüpfen).

**Schritte:**
1. Auf developers.facebook.com einen Entwickler-Account anlegen und eine App
   vom Typ „Business" erstellen.
2. Der App die Produkte „Facebook Login for Business" und „Instagram Graph API"
   hinzufügen.
3. Folgende Berechtigungen (Scopes) beantragen:
   - `pages_manage_posts` — Posts auf der Facebook-Seite erstellen
   - `pages_read_engagement` — Seiten-Grunddaten lesen
   - `instagram_basic` — Instagram-Kontodaten lesen
   - `instagram_content_publish` — Instagram-Posts veröffentlichen
4. **App Review durchlaufen:** Meta verlangt für diese Berechtigungen eine
   Prüfung mit Bildschirmvideo, das den Anwendungsfall zeigt, sowie meist eine
   **Business-Verifizierung** (Handelsregisterauszug o. ä.).
   Übliche Dauer: **1–3 Wochen**, Nachfragen sind häufig.
5. Nach der Freigabe: ein **langlebiges Page-Access-Token** erzeugen
   (Kurzzeit-Token über den Graph API Explorer holen, dann gegen ein
   Langzeit-Token tauschen; Anleitung: „Long-Lived Page Access Token" in der
   Meta-Doku). Page-Tokens aus einem Langzeit-User-Token laufen nicht ab,
   solange die Verknüpfung besteht — trotzdem `token_gueltig_bis` pflegen,
   falls ein Ablauf angezeigt wird.
6. Kennungen notieren:
   - **Facebook-Page-ID** (Seite → Info) → `konto_id` des Kanals `facebook`
   - **Instagram-Business-Account-ID** (über Graph API:
     `GET /me/accounts` → `GET /{page-id}?fields=instagram_business_account`)
     → `konto_id` des Kanals `instagram`

**Secrets setzen:**
```
supabase secrets set META_PAGE_TOKEN=<langlebiges Page-Token>
supabase secrets set META_IG_TOKEN=<dasselbe oder eigenes Token mit IG-Scopes>
```
Dann in `social_channels`: bei `facebook` → `token_secret_name = 'META_PAGE_TOKEN'`,
bei `instagram` → `token_secret_name = 'META_IG_TOKEN'`, jeweils `konto_id` und
`verbunden = true`.

**Wichtig für Instagram:** Instagram akzeptiert nur Posts **mit Bild oder Video**.
Dem Post muss in der App ein Medien-Asset zugeordnet sein, sonst bricht das
Ausspielen mit einer klaren Meldung ab.

**Threads:** hat inzwischen eine eigene API, ist in der App aber noch nicht
implementiert — der Kanal bleibt vorerst auf „nicht verbunden".

---

## 2. LinkedIn

**Voraussetzungen:**
- Eine LinkedIn-Unternehmensseite des Resorts, bei der Sie Admin sind.

**Schritte:**
1. Auf developer.linkedin.com eine App anlegen und mit der Unternehmensseite
   verknüpfen (die Seite muss die Verknüpfung bestätigen).
2. Zugriff auf das Programm **„Community Management API"** beantragen.
   Das ist ein Formular-Antrag mit Begründung des Anwendungsfalls.
   Übliche Dauer: **1–4 Wochen**; LinkedIn ist bei der Vergabe restriktiv.
3. Benötigte Berechtigung (Scope): `w_organization_social`
   (Posts im Namen der Organisation erstellen). Zum Verifizieren zusätzlich
   `r_organization_social` (lesen).
4. Nach der Freigabe per OAuth ein Access-Token für die Organisation erzeugen.
   **Achtung: LinkedIn-Tokens laufen nach 60 Tagen ab** (Refresh-Tokens nach
   365 Tagen, nur im Programm enthalten wenn bewilligt). Das Ablaufdatum in
   `token_gueltig_bis` eintragen und rechtzeitig erneuern — die App warnt
   nicht von selbst.
5. Die **Organisations-URN** notieren: `urn:li:organization:<zahl>`
   (die Zahl steht in der URL der Unternehmensseite im Admin-Bereich)
   → `konto_id` des Kanals `linkedin`.

**Secret setzen:**
```
supabase secrets set LINKEDIN_TOKEN=<access token>
```
Dann in `social_channels` bei `linkedin`: `token_secret_name = 'LINKEDIN_TOKEN'`,
`konto_id = 'urn:li:organization:…'`, `token_gueltig_bis` setzen, `verbunden = true`.

---

## 3. YouTube

**Stand der App: noch nicht implementiert.** Das Ausspielen auf YouTube bricht
derzeit bewusst mit „Plattform nicht implementiert" ab. Die Beantragung kann
trotzdem schon vorbereitet werden:

1. In der Google Cloud Console (console.cloud.google.com) ein Projekt anlegen
   und die **YouTube Data API v3** aktivieren.
2. OAuth-Zustimmungsbildschirm einrichten; benötigter Scope:
   `https://www.googleapis.com/auth/youtube` (Upload und Verwaltung).
3. Für den produktiven Betrieb ist eine **OAuth-Verifizierung durch Google**
   nötig (sensibler Scope): Prüfung mit Video-Demo, übliche Dauer
   **2–6 Wochen**.
4. Zu beachten: Community-Posts (reine Text-Posts) sind über die offizielle
   API **nicht** verfügbar — die API kann Videos hochladen, aber keine
   Community-Beiträge erstellen. Realistisch ist YouTube daher der Kanal mit
   dem geringsten Nutzen für Text-Posts aus dieser App.
5. Die **Channel-ID** (YouTube Studio → Einstellungen → Kanal → erweiterte
   Einstellungen) kann schon jetzt in `konto_id` eingetragen werden —
   `verbunden` bleibt aber `false`, bis die App YouTube unterstützt.

Geplanter Secret-Name, sobald implementiert: `YOUTUBE_TOKEN`.

---

## 4. TikTok

**Stand der App: noch nicht implementiert.** Auch hier bricht das Ausspielen
bewusst ab. Vorbereitung:

1. Auf developers.tiktok.com einen Entwickler-Account anlegen und eine App
   registrieren.
2. Zugriff auf die **Content Posting API** beantragen; benötigte Scopes:
   `video.publish` (bzw. `video.upload` für den Entwurfsmodus).
3. TikTok prüft den Anwendungsfall („App Review"); übliche Dauer **1–2 Wochen**.
   Wichtig: Ohne bestandenes „Audit" der App bleiben über die API erstellte
   Posts **privat** (nur für das eigene Konto sichtbar) — erst das Audit
   schaltet öffentliches Posten frei. Das Audit ist ein eigener Schritt nach
   dem App Review.
4. TikTok-Tokens laufen nach 24 Stunden ab und müssen per Refresh-Token
   erneuert werden — das erfordert bei der Implementierung einen
   Token-Refresh in der App, nicht nur ein statisches Secret.

Geplanter Secret-Name, sobald implementiert: `TIKTOK_TOKEN`.

---

## Zusammenfassung

| Plattform | Antrag bei | Scopes | Prüfdauer (üblich) | Secret-Name | Status in der App |
|---|---|---|---|---|---|
| Facebook-Seite | developers.facebook.com (App Review + Business-Verifizierung) | `pages_manage_posts`, `pages_read_engagement` | 1–3 Wochen | `META_PAGE_TOKEN` | implementiert |
| Instagram | dieselbe Meta-App | `instagram_basic`, `instagram_content_publish` | 1–3 Wochen | `META_IG_TOKEN` | implementiert (braucht Bild/Video) |
| LinkedIn | developer.linkedin.com (Community Management API) | `w_organization_social` | 1–4 Wochen | `LINKEDIN_TOKEN` | implementiert (Token läuft nach 60 Tagen ab) |
| YouTube | Google Cloud Console (OAuth-Verifizierung) | `…/auth/youtube` | 2–6 Wochen | `YOUTUBE_TOKEN` | noch nicht implementiert |
| TikTok | developers.tiktok.com (Review + Audit) | `video.publish` | 1–2 Wochen + Audit | `TIKTOK_TOKEN` | noch nicht implementiert |
| Threads | Meta (eigene Threads-API) | — | — | — | noch nicht implementiert |

Erst wenn ein Testpost im Protokoll `social_publish_attempts` mit `erfolg = true`
und einer echten Plattform-Post-ID steht, ist ein Kanal wirklich einsatzbereit.

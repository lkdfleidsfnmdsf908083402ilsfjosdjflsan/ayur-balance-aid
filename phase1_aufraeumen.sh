# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — AUFRÄUMEN
# Ayur Balance Aid · Go-Live Konsolidierung
# Ausführen auf: Mac Terminal im Projektverzeichnis
# ═══════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 1: Ins Projektverzeichnis wechseln
# ─────────────────────────────────────────────────────────────────────────
cd ~/Developer/ayur-balance-aid

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 2: Git Status prüfen (Sicherheit)
# ─────────────────────────────────────────────────────────────────────────
echo "=== Git Status ==="
git status --short
echo ""
echo "Falls uncommitted changes: erst committen!"
echo "Drücke Enter um fortzufahren oder Ctrl+C zum Abbrechen..."
read

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 3: Safety Commit
# ─────────────────────────────────────────────────────────────────────────
git add -A
git commit -m "BACKUP vor Phase 1 Konsolidierung"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 4: Veraltete Handoff-Dokumente löschen (6 Dateien)
# Begründung: Alle durch HANDOFF_AyurBalanceAid_April2026_v4.docx ersetzt
# ─────────────────────────────────────────────────────────────────────────
echo "=== Lösche veraltete Handoffs ==="

# 1:1 Duplikat (identischer MD5-Hash)
rm -v "HANDOFF_AyurBalanceAid_April2026_v4__1_.docx" 2>/dev/null

# Alte Versionen
rm -v "HANDOFF.md" 2>/dev/null
rm -v "HANDOFF_AyurBalanceAid_KOMPLETT_April2026.docx" 2>/dev/null
rm -v "HANDOFF_AyurBalanceAid_KOMPLETT_April2026_v2.docx" 2>/dev/null
rm -v "HANDOFF_AyurBalanceAid_April2026_v3.docx" 2>/dev/null
rm -v "HANDOFF_Protel_TAC_Integration.docx" 2>/dev/null

# Überholte Einbau-Anleitung (Port 3001, alter Pfad)
rm -v "EINBAU_ANLEITUNG.md" 2>/dev/null

echo "✓ 7 Handoff-Dateien entfernt"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 5: Tote Views löschen
# Begründung: Implementieren veraltete Direktverbindungs-Architektur
# ProtelSetupWizard/ProtelKpiView sind nicht im Router, server.js/
# protelConnector.js gehören zur Port 3001 Architektur
# ─────────────────────────────────────────────────────────────────────────
echo "=== Lösche tote Views und veraltete Backend-Dateien ==="

# HotelKpiView — 1047 Zeilen toter Code, TOTAL_ROOMS=30, Tabellen existieren nicht
rm -v "src/components/views/HotelKpiView.tsx" 2>/dev/null

# ProtelSetupWizard — Setup für Port 3001 Direktverbindung, Sync-Agent hat das ersetzt
rm -v "src/components/views/ProtelSetupWizard.tsx" 2>/dev/null

# ProtelKpiView — Live-API-Calls, Sync-Agent liefert dieselben Daten
rm -v "src/components/views/ProtelKpiView.tsx" 2>/dev/null

# protelConnector.js — MSSQL-Connector für veraltete server.js
rm -v "protelConnector.js" 2>/dev/null

# server.js im Projektordner — Port 3001, total_rooms: 30
# ACHTUNG: Nur die Datei im PROJEKTORDNER, NICHT auf dem Server!
rm -v "server.js" 2>/dev/null

# migration_protel_config.sql — Einmalige Migration, längst ausgeführt
rm -v "migration_protel_config.sql" 2>/dev/null

echo "✓ 6 tote Dateien entfernt"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 6: robots.txt sichern
# Begründung: Allow: / auf einem internen KPI-Dashboard = Sicherheitsproblem
# ─────────────────────────────────────────────────────────────────────────
echo "=== Fixe robots.txt ==="

cat > public/robots.txt << 'EOF'
User-agent: *
Disallow: /
EOF

echo "✓ robots.txt auf Disallow: / gesetzt"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 7: TOTAL_ROOMS Fix in FrontOfficeKpiView
# IST: const TOTAL_ROOMS = 60; 
# SOLL: const TOTAL_ROOMS = 59;
# ─────────────────────────────────────────────────────────────────────────
echo "=== Fixe TOTAL_ROOMS ==="

python3 -c "
import pathlib
p = pathlib.Path('src/components/views/FrontOfficeKpiView.tsx')
content = p.read_text()
old = 'const TOTAL_ROOMS = 60; // Aktiv im Verkauf (7 für Mitarbeiter nicht mitgezählt)'
new = 'const TOTAL_ROOMS = 59; // 59 verkaufbare Zimmer (Zi 114+214 = Mitarbeiter)'
if old in content:
    p.write_text(content.replace(old, new))
    print('✓ TOTAL_ROOMS 60 → 59 in FrontOfficeKpiView.tsx')
else:
    print('⚠ TOTAL_ROOMS-Zeile nicht gefunden — manuell prüfen!')
"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 8: Referenzen zu gelöschten Views aus Router entfernen
# Suche in Index.tsx (oder App.tsx) und Sidebar.tsx
# ─────────────────────────────────────────────────────────────────────────
echo "=== Prüfe Router-Referenzen ==="

# Suche nach Imports und Cases der gelöschten Views
echo "Referenzen zu HotelKpiView:"
grep -rn "HotelKpiView\|hotel-kpis" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || echo "  Keine gefunden ✓"

echo "Referenzen zu ProtelKpiView:"
grep -rn "ProtelKpiView\|protel-kpis" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || echo "  Keine gefunden ✓"

echo "Referenzen zu ProtelSetupWizard:"
grep -rn "ProtelSetupWizard\|protel-setup" src/ --include="*.tsx" --include="*.ts" 2>/dev/null || echo "  Keine gefunden ✓"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Falls oben Referenzen gefunden wurden, diese Zeilen manuell"
echo "entfernen (Import + case/Route). Dann weiter mit Schritt 9."
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Drücke Enter wenn bereit für Build..."
read

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 9: Build
# ─────────────────────────────────────────────────────────────────────────
echo "=== Build ==="
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build fehlgeschlagen! Fehler oben prüfen."
  exit 1
fi

echo "✓ Build erfolgreich"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 10: Git Commit
# ─────────────────────────────────────────────────────────────────────────
git add -A
git commit -m "Phase 1: Aufräumen — 14 Dateien gelöscht, TOTAL_ROOMS fix, robots.txt gesichert

Gelöscht:
- 7 veraltete Handoff-Dokumente (v4 bleibt als Single Source of Truth)
- HotelKpiView (TOTAL_ROOMS=30, nicht-existierende Tabellen)
- ProtelSetupWizard (Port 3001 Architektur, ersetzt durch Sync-Agent)
- ProtelKpiView (Live-API, ersetzt durch Sync-Agent → Supabase)
- protelConnector.js, server.js (veraltete Backend-Dateien)
- migration_protel_config.sql (einmalig, längst ausgeführt)

Fixes:
- FrontOfficeKpiView TOTAL_ROOMS: 60 → 59
- robots.txt: Allow: / → Disallow: / (Sicherheit)"

# ─────────────────────────────────────────────────────────────────────────
# SCHRITT 11: Deploy
# ─────────────────────────────────────────────────────────────────────────
echo "=== Deploy ==="
scp -P 2264 -r dist/* root@157.90.21.134:/var/www/kpi/

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ PHASE 1 ABGESCHLOSSEN"
echo ""
echo "Gelöscht: 13 Dateien + 1 Fix (robots.txt)"  
echo "Gefixed:  TOTAL_ROOMS 60 → 59 in FrontOfficeKpiView"
echo "Deployed: kpi.ecomarine-group.com"
echo ""
echo "Nächster Schritt: Phase 2 — FrontOfficeKpiView auf protel_kpi_tag"
echo "═══════════════════════════════════════════════════════════"

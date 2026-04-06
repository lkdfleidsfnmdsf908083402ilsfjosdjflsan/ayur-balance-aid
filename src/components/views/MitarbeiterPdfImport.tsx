/**
 * MitarbeiterPdfImport.tsx
 * PDF Import Feature für Lohnkostenlisten
 * 
 * Einbinden in: MitarbeiterView.tsx oder als eigene Route
 * Abhängigkeiten: pdfjs-dist (npm install pdfjs-dist)
 */

import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Loader2, Users, Euro, Calendar, RefreshCw
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedMitarbeiter {
  personalnummer: string;
  nachname: string;
  vorname: string;
  abteilung: string;
  position: string;
  gesamtaufwand_monat: number;
  aktiv: boolean;
}

interface ImportResult {
  inserted: number;
  updated: number;
  errors: string[];
  gesamtaufwand: number;
}

const DOPPELGEHALTS_MONATE = [6, 11]; // Juni & November

// ─────────────────────────────────────────────────────────────────────────────
// PDF Parser (läuft im Browser)
// ─────────────────────────────────────────────────────────────────────────────

async function parseLohnkostenPDF(file: File): Promise<ParsedMitarbeiter[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const mitarbeiter: ParsedMitarbeiter[] = [];
  let currentAbteilung = '';
  
  // Regex: Name, NR Position 100,00 netto abzüge brutto sv db dz ga zulagen aufwand pct
  const pattern = /^(.+?),\s*(\d*)\s+(.+?)\s+100,00\s+[\d\.,\-]+\s+[\d\.,\-]+\s+[\d\.,]+\s+[\d\.,]+\s+[\d\.,]+\s+[\d\.,]+\s+[\d\.,]+\s+[\d\.,]+\s+([\d\.,]+)\s+[\d\.,]+\s*$/;
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Text zusammenbauen
    const lines: string[] = [];
    let currentLine = '';
    let lastY = -1;
    
    for (const item of textContent.items as any[]) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 3) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += item.str;
      lastY = item.transform[5];
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    
    for (const line of lines) {
      // Abteilung erkennen
      if (line.includes('Kostenstelle:')) {
        const abt = line
          .replace('Kostenstelle:', '')
          .replace(/Ayurveda-Resort.*|Mandira.*/g, '')
          .trim();
        if (abt) currentAbteilung = abt;
        continue;
      }
      
      // Mitarbeiterzeile parsen
      const match = line.match(pattern);
      if (match) {
        const nameRaw = match[1].trim();
        const personalnummer = match[2].trim() || '998';
        const position = match[3].trim();
        const gesamtaufwandStr = match[4].replace(/\./g, '').replace(',', '.');
        const gesamtaufwand = parseFloat(gesamtaufwandStr) || 0;
        
        const nameParts = nameRaw.split(' ');
        const nachname = nameParts[0];
        const vorname = nameParts.slice(1).join(' ');
        
        mitarbeiter.push({
          personalnummer,
          nachname,
          vorname,
          abteilung: currentAbteilung,
          position,
          gesamtaufwand_monat: gesamtaufwand,
          aktiv: gesamtaufwand > 0,
        });
      }
    }
  }
  
  return mitarbeiter;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Import
// ─────────────────────────────────────────────────────────────────────────────

async function importToSupabase(
  mitarbeiter: ParsedMitarbeiter[],
  jahr: number,
  monat: number
): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, updated: 0, errors: [], gesamtaufwand: 0 };
  const isDoppelmonat = DOPPELGEHALTS_MONATE.includes(monat);
  
  for (const ma of mitarbeiter) {
    result.gesamtaufwand += ma.gesamtaufwand_monat;
    
    try {
      // 1. employees Tabelle aktualisieren (aktueller Stand)
      const { error: empError } = await supabase
        .from('employees')
        .upsert({
          personalnummer: ma.personalnummer,
          vorname: ma.vorname,
          nachname: ma.nachname,
          abteilung: ma.abteilung,
          position: ma.position,
          brutto_monat: ma.gesamtaufwand_monat,
          gesamtaufwand_monat: ma.gesamtaufwand_monat,
          aktiv: ma.aktiv,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'personalnummer' });
      
      if (empError) {
        result.errors.push(`${ma.nachname}: ${empError.message}`);
        continue;
      }
      
      // 2. employees_history eintragen
      const normalisiertAufwand = isDoppelmonat
        ? ma.gesamtaufwand_monat / 2
        : ma.gesamtaufwand_monat;
      
      const { error: histError } = await supabase
        .from('employees_history')
        .upsert({
          personalnummer: ma.personalnummer,
          vorname: ma.vorname,
          nachname: ma.nachname,
          abteilung: ma.abteilung,
          position: ma.position,
          jahr,
          monat,
          brutto_monat: ma.gesamtaufwand_monat,
          gesamtaufwand_monat: ma.gesamtaufwand_monat,
          ist_doppelmonat: isDoppelmonat,
          gesamtaufwand_normalisiert: normalisiertAufwand,
          aktiv: ma.aktiv,
        }, { onConflict: 'personalnummer,jahr,monat' });
      
      if (histError) {
        result.errors.push(`History ${ma.nachname}: ${histError.message}`);
      } else {
        result.inserted++;
      }
      
    } catch (err: any) {
      result.errors.push(`${ma.nachname}: ${err.message}`);
    }
  }
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────

export function MitarbeiterPdfImport() {
  const [file, setFile] = useState<File | null>(null);
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [monat, setMonat] = useState(new Date().getMonth() + 1);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedMitarbeiter[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const isDoppelmonat = DOPPELGEHALTS_MONATE.includes(monat);
  
  const jahre = Array.from({ length: 5 }, (_, i) => 2022 + i);
  const monate = [
    'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.pdf')) {
      setError('Bitte eine PDF-Datei auswählen');
      return;
    }
    setFile(f);
    setParsed(null);
    setResult(null);
    setError(null);
    setParsing(true);
    
    try {
      const mitarbeiter = await parseLohnkostenPDF(f);
      if (mitarbeiter.length === 0) {
        setError('Keine Mitarbeiter gefunden — bitte prüfe das PDF Format');
      } else {
        setParsed(mitarbeiter);
      }
    } catch (err: any) {
      setError('PDF konnte nicht gelesen werden: ' + err.message);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setError(null);
    
    try {
      const res = await importToSupabase(parsed, jahr, monat);
      setResult(res);
    } catch (err: any) {
      setError('Import fehlgeschlagen: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Lohnkostenliste importieren
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          PDF aus dem Lohnprogramm hochladen — Mitarbeiter und Kosten werden automatisch erkannt
        </p>
      </div>

      {/* Zeitraum auswählen */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Zeitraum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Jahr</label>
              <select
                value={jahr}
                onChange={e => setJahr(parseInt(e.target.value))}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
              >
                {jahre.map(j => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Monat</label>
              <select
                value={monat}
                onChange={e => setMonat(parseInt(e.target.value))}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
              >
                {monate.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          {isDoppelmonat && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {monate[monat - 1]} = Doppelgehalt (Urlaubs-/Weihnachtsgeld). 
              Normalisierter Wert wird automatisch berechnet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Upload */}
      {!result && (
        <Card className="glass-card border-border">
          <CardContent className="p-6">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => document.getElementById('pdf-input')?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">PDF hierher ziehen oder klicken</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kostenaufteilung nach Mitarbeiter (AYM_MaKo_MM-YYYY.pdf)
                </p>
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                {parsing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fehler */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Vorschau */}
      {parsed && !result && (
        <Card className="glass-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Erkannte Mitarbeiter
              </span>
              <Badge variant="secondary">{parsed.length} Personen</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Zusammenfassung nach Abteilung */}
            <div className="space-y-1.5 mb-4">
              {Object.entries(
                parsed.reduce((acc, ma) => {
                  if (!acc[ma.abteilung]) acc[ma.abteilung] = { count: 0, kosten: 0 };
                  acc[ma.abteilung].count++;
                  acc[ma.abteilung].kosten += ma.gesamtaufwand_monat;
                  return acc;
                }, {} as Record<string, { count: number; kosten: number }>)
              ).map(([abt, data]) => (
                <div key={abt} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{abt}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{data.count} MA</span>
                    <span className="font-medium tabular-nums">
                      € {data.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Euro className="h-4 w-4 text-muted-foreground" />
                Gesamtaufwand
              </span>
              <span className="text-lg font-semibold font-mono">
                € {parsed.reduce((s, m) => s + m.gesamtaufwand_monat, 0)
                   .toLocaleString('de-DE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full mt-4"
            >
              {importing
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importiere...</>
                : `${parsed.length} Mitarbeiter für ${monate[monat - 1]} ${jahr} importieren`
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ergebnis */}
      {result && (
        <Card className="glass-card border-border border-success/20 bg-success/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium">Import erfolgreich!</p>
                <p className="text-sm text-muted-foreground">
                  {monate[monat - 1]} {jahr}
                  {isDoppelmonat && ' · Doppelgehalt normalisiert'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{result.inserted}</p>
                <p className="text-xs text-muted-foreground">Einträge importiert</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold font-mono">
                  € {result.gesamtaufwand.toLocaleString('de-DE', { minimumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-muted-foreground">Gesamtaufwand</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-3 mb-4">
                <p className="text-xs font-medium text-destructive mb-1">
                  {result.errors.length} Fehler:
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive/80">{e}</p>
                ))}
              </div>
            )}

            <Button variant="outline" onClick={reset} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Weiteres PDF importieren
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

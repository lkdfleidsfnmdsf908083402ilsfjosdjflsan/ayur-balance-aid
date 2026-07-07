/**
 * MenueWeinbegleitungView.tsx
 * Menü & Weinbegleitung — Mandira Ayurveda Hotel
 *
 * Features:
 *  - Menü-Gänge eingeben (Vorspeise, Suppe, Hauptgang, Dessert, etc.)
 *  - Menü-Import aus Tagesvorlage (Text mit +++ Trennern)
 *  - Claude API generiert Weinempfehlungen NUR aus der Mandira-Weinkarte
 *  - Menü + Weinbegleitung in Supabase speichern
 *  - Gespeicherte Menüs laden / bearbeiten
 *  - Druckfertige PDF-Vorschau (Gourmetmenü + Weinempfehlung)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wine, Plus, Trash2, Sparkles, Save, Loader2,
  FileText, ChevronDown, ChevronUp, Printer, RefreshCw,
  Calendar, Clock, AlertTriangle, Check, Copy, Eye,
  Upload, FileUp
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// pdfjs Worker — Version 3.11.174 (5.x = Worker-Fehler!)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ─────────────────────────────────────────────────────────────────────────────
// MANDIRA WEINKARTE — Eingebettet (178 Weine, 19 Kategorien)
// Quelle: Weinkarte_vom_07042026.pdf · NUR diese Weine dürfen empfohlen werden!
// ─────────────────────────────────────────────────────────────────────────────

import MANDIRA_WEINKARTE from '@/data/mandira_weinkarte.json';

// Flache Liste aller Weine für den Claude API Prompt
function getWeinkarteAlsText(): string {
  const lines: string[] = [];
  for (const kat of MANDIRA_WEINKARTE) {
    lines.push(`\n### ${kat.kategorie}`);
    for (const w of kat.weine) {
      const preise = w.groessen.map((g: any) => `${g.menge} € ${g.preis.toFixed(2).replace('.', ',')}`).join(' / ');
      lines.push(`- ${w.name} | ${w.weingut} | ${preise}`);
    }
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface MenuGang {
  id: string;
  position: number;
  gang_typ: string;
  name: string;
  beschreibung: string;
  wein_empfehlung: string;
  wein_weingut: string;
  wein_preis: string;
  wein_begruendung: string;
}

interface GespeichertesMenu {
  id: string;
  titel: string;
  datum: string;
  anlass: string;
  gaenge: MenuGang[];
  created_at: string;
  updated_at: string;
}

const GANG_TYPEN = [
  'Amuse-Bouche',
  'Vorspeise',
  'Suppe',
  'Zwischengang',
  'Hauptgang',
  'Käsegang',
  'Dessert',
  'Petit Four',
];

const generateId = () => Math.random().toString(36).substring(2, 10);

// ─────────────────────────────────────────────────────────────────────────────
// PDF Parser — Extrahiert Text aus Menü-PDF (pdfjs-dist 3.11.174)
// ─────────────────────────────────────────────────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allText: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Y-Koordinaten-Gruppierung (wie im Mitarbeiter-Import)
    const items = content.items as any[];
    const lineMap = new Map<number, { x: number; text: string }[]>();

    for (const item of items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]); // Y-Koordinate gerundet
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x: item.transform[4], text: item.str });
    }

    // Zeilen sortiert nach Y (absteigend = oben nach unten), X (links nach rechts)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      const lineText = parts.map(p => p.text).join(' ').trim();
      if (lineText) allText.push(lineText);
    }
  }

  return allText.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Menü-Text Parser (aus PDF-Text oder manuellem Input)
// Erkennt +++ Trenner, Abendmenü-Sektion, Gang-Typen automatisch
// ─────────────────────────────────────────────────────────────────────────────

function parseMenuText(text: string): MenuGang[] {
  // Gänge durch +++ getrennt
  const blocks = text.split(/\+{3,}/).map(b => b.trim()).filter(Boolean);

  // Fallback: Zeilen-basiert wenn keine +++ Trenner
  const items = blocks.length > 1 ? blocks : text.split('\n').map(l => l.trim()).filter(Boolean);

  const gaenge: MenuGang[] = [];
  let position = 1;

  for (const item of items) {
    // Gang-Typ automatisch erkennen
    const lower = item.toLowerCase();
    let gang_typ = 'Zwischengang';

    if (lower.includes('brot') || lower.includes('amuse') || lower.includes('gruß aus der küche'))
      gang_typ = 'Amuse-Bouche';
    else if (lower.includes('salat') || lower.includes('vorspeise') || lower.includes('carpaccio') || lower.includes('tartar'))
      gang_typ = 'Vorspeise';
    else if (lower.includes('suppe') || lower.includes('consommé') || lower.includes('crème'))
      gang_typ = 'Suppe';
    else if (lower.includes('ayurveda') || lower.includes('fisch') || lower.includes('fleisch') ||
             lower.includes('filet') || lower.includes('lamm') || lower.includes('rind') ||
             lower.includes('huhn') || lower.includes('lachs') || lower.includes('zander') ||
             lower.includes('hauptgang') || lower.includes('hauptspeise'))
      gang_typ = 'Hauptgang';
    else if (lower.includes('käse') || lower.includes('fromage'))
      gang_typ = 'Käsegang';
    else if (lower.includes('dessert') || lower.includes('mousse') || lower.includes('sorbet') ||
             lower.includes('parfait') || lower.includes('crème brûlée') || lower.includes('panna cotta') ||
             lower.includes('kuchen') || lower.includes('torte') || lower.includes('eis'))
      gang_typ = 'Dessert';
    else if (lower.includes('petit four') || lower.includes('praline') || lower.includes('konfekt'))
      gang_typ = 'Petit Four';

    // Erste Zeile = Name, Rest = Beschreibung
    const lines = item.split('\n').map(l => l.trim()).filter(Boolean);
    const name = lines[0] || item;
    const beschreibung = lines.slice(1).join(', ');

    gaenge.push({
      id: generateId(),
      position: position++,
      gang_typ,
      name,
      beschreibung,
      wein_empfehlung: '',
      wein_weingut: '',
      wein_preis: '',
      wein_begruendung: '',
    });
  }

  return gaenge;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude API Call — NUR aus der Mandira-Weinkarte
// ─────────────────────────────────────────────────────────────────────────────

async function generiereWeinbegleitung(gaenge: MenuGang[]): Promise<MenuGang[]> {
  const gangBeschreibungen = gaenge.map((g, i) =>
    `${i + 1}. ${g.gang_typ}: "${g.name}" — ${g.beschreibung || 'keine weitere Beschreibung'}`
  ).join('\n');

  const weinkarteText = getWeinkarteAlsText();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `Du bist der Sommelier im Mandira Ayurveda Hotel in Bad Waltersdorf, Steiermark.

KRITISCHE REGEL: Du darfst AUSSCHLIESSLICH Weine aus der folgenden Mandira-Weinkarte empfehlen.
Erfinde NIEMALS Weine! Jeder empfohlene Wein MUSS exakt in dieser Liste stehen — Name, Weingut und Preis müssen übereinstimmen.

=== MANDIRA WEINKARTE ===
${weinkarteText}
=== ENDE WEINKARTE ===

EMPFEHLUNGSFORMAT (wie im Hotel üblich):
1. Als Aperitif: 1 Sekt/Champagner + 1 alkoholfreie Alternative (falls vorhanden)
2. Zu Fisch-Gängen: Weißwein (bevorzugt steirisch) mit 0,75l UND 1/8l Preis (falls vorhanden)
3. Zu Fleisch-Gängen: Rotwein mit 0,75l UND 1/8l Preis (falls vorhanden)
4. Zum Dessert: Süßwein oder edler Dessertwein
5. Zu ayurvedischen Gängen: leichter Weißwein oder alkoholfreie Alternative

MENÜ:
${gangBeschreibungen}

Antworte NUR mit einem JSON-Array. Jedes Element hat:
- "position": Gangnummer (1-basiert)
- "wein_empfehlung": Exakter Name des Weins aus der Weinkarte
- "wein_weingut": Exaktes Weingut aus der Weinkarte
- "wein_preis": Preise als String, z.B. "0,75l € 39,00 / 1/8l € 5,90"
- "wein_begruendung": Kurze Begründung (max 2 Sätze, auf Deutsch)

Antwort muss gültiges JSON sein, kein Markdown, keine Erklärung davor oder danach.`
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '[]';

  // Parse JSON — strip markdown fences if present
  const clean = text.replace(/```json|```/g, '').trim();
  const empfehlungen = JSON.parse(clean);

  return gaenge.map((gang, i) => {
    const empf = empfehlungen.find((e: any) => e.position === i + 1);
    return {
      ...gang,
      wein_empfehlung: empf?.wein_empfehlung || gang.wein_empfehlung,
      wein_weingut: empf?.wein_weingut || gang.wein_weingut,
      wein_preis: empf?.wein_preis || gang.wein_preis,
      wein_begruendung: empf?.wein_begruendung || gang.wein_begruendung,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Ornament SVG für Trenner im Hotel-Stil
// ─────────────────────────────────────────────────────────────────────────────

const OrnamentDivider = () => (
  <div className="flex items-center justify-center my-4 print:my-3">
    <div className="h-px bg-[#3d5a40]/20 flex-1" />
    <svg className="mx-3 text-[#3d5a40]/40" width="24" height="16" viewBox="0 0 24 16" fill="currentColor">
      <path d="M12 2C8 2 6 6 2 6c0 0 2 4 6 4s4-4 4-4 0 4 4 4 6-4 6-4c-4 0-6-4-10-4z" />
      <path d="M12 14C8 14 6 10 2 10c0 0 2-4 6-4s4 4 4 4 0-4 4-4 6 4 6 4c-4 0-6 4-10 4z" opacity="0.5" />
    </svg>
    <div className="h-px bg-[#3d5a40]/20 flex-1" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Komponente
// ─────────────────────────────────────────────────────────────────────────────

export function MenueWeinbegleitungView() {
  const [titel, setTitel] = useState('');
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [anlass, setAnlass] = useState('');
  const [gaenge, setGaenge] = useState<MenuGang[]>([
    { id: generateId(), position: 1, gang_typ: 'Vorspeise', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
    { id: generateId(), position: 2, gang_typ: 'Suppe', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
    { id: generateId(), position: 3, gang_typ: 'Hauptgang', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
    { id: generateId(), position: 4, gang_typ: 'Dessert', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
  ]);

  const [gespeicherteMenus, setGespeicherteMenus] = useState<GespeichertesMenu[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Gespeicherte Menüs laden ──────────────────────────────────────────────

  const loadMenus = useCallback(async () => {
    const { data, error } = await supabase
      .from('menue_weinbegleitung')
      .select('*')
      .order('datum', { ascending: false })
      .limit(20);

    if (!error && data) {
      setGespeicherteMenus(data.map(d => ({
        ...d,
        gaenge: typeof d.gaenge === 'string' ? JSON.parse(d.gaenge) : (d.gaenge || []),
      })));
    }
  }, []);

  useEffect(() => { loadMenus(); }, [loadMenus]);

  // ── Gang hinzufügen / entfernen ───────────────────────────────────────────

  const addGang = () => {
    setGaenge(prev => [
      ...prev,
      {
        id: generateId(),
        position: prev.length + 1,
        gang_typ: GANG_TYPEN[Math.min(prev.length, GANG_TYPEN.length - 1)],
        name: '',
        beschreibung: '',
        wein_empfehlung: '',
        wein_weingut: '',
        wein_preis: '',
        wein_begruendung: '',
      },
    ]);
  };

  const removeGang = (id: string) => {
    setGaenge(prev => prev.filter(g => g.id !== id).map((g, i) => ({ ...g, position: i + 1 })));
  };

  const updateGang = (id: string, field: keyof MenuGang, value: string) => {
    setGaenge(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const moveGang = (id: string, direction: 'up' | 'down') => {
    setGaenge(prev => {
      const idx = prev.findIndex(g => g.id === id);
      if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === prev.length - 1)) return prev;
      const newArr = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr.map((g, i) => ({ ...g, position: i + 1 }));
    });
  };

  // ── Menü-Import (PDF Drag & Drop + Text-Fallback) ──────────────────────────

  const handlePdfImport = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Bitte eine PDF-Datei hochladen.');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setError('PDF konnte nicht gelesen werden — keine Textinhalte gefunden.');
        return;
      }

      const parsed = parseMenuText(text);
      if (parsed.length === 0) {
        // Fallback: Text anzeigen zur manuellen Kontrolle
        setImportText(text);
        setError('Keine Gänge automatisch erkannt. Der extrahierte Text ist unten sichtbar — bitte manuell korrigieren.');
        return;
      }

      setGaenge(parsed);
      setShowImport(false);
      setImportText('');

      // Datum aus Dateiname extrahieren falls möglich (Menu_Donnerstag.pdf etc.)
      const dateMatch = file.name.match(/(\d{1,2})[\._-](\d{1,2})[\._-](\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        setDatum(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      }

      // Titel aus Dateiname
      const titelClean = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      if (!titel) setTitel(titelClean);

      setSuccess(`${parsed.length} Gänge aus "${file.name}" importiert!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(`PDF-Import Fehler: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePdfImport(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfImport(file);
    if (e.target) e.target.value = '';
  };

  const handleTextImport = () => {
    if (!importText.trim()) {
      setError('Bitte Menütext eingeben oder PDF hochladen.');
      return;
    }
    const parsed = parseMenuText(importText);
    if (parsed.length === 0) {
      setError('Keine Gänge erkannt.');
      return;
    }
    setGaenge(parsed);
    setShowImport(false);
    setImportText('');
    setSuccess(`${parsed.length} Gänge importiert!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── KI-Weinbegleitung generieren ──────────────────────────────────────────

  const handleGenerate = async () => {
    const filledGaenge = gaenge.filter(g => g.name.trim());
    if (filledGaenge.length === 0) {
      setError('Bitte mindestens einen Gang mit Namen eingeben.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const updated = await generiereWeinbegleitung(gaenge);
      setGaenge(updated);
      setSuccess('Weinbegleitung erfolgreich generiert! (nur Mandira-Weine)');
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(`Fehler bei der Generierung: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // ── Speichern ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!titel.trim()) {
      setError('Bitte einen Menütitel eingeben.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        titel: titel.trim(),
        datum,
        anlass: anlass.trim(),
        gaenge: JSON.stringify(gaenge),
        updated_at: new Date().toISOString(),
      };

      if (activeMenuId) {
        const { error } = await supabase
          .from('menue_weinbegleitung')
          .update(payload)
          .eq('id', activeMenuId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('menue_weinbegleitung')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setActiveMenuId(data.id);
      }

      setSuccess('Menü gespeichert!');
      setTimeout(() => setSuccess(null), 3000);
      loadMenus();
    } catch (e: any) {
      setError(`Fehler beim Speichern: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Gespeichertes Menü laden ──────────────────────────────────────────────

  const loadMenu = (menu: GespeichertesMenu) => {
    setTitel(menu.titel);
    setDatum(menu.datum);
    setAnlass(menu.anlass || '');
    setGaenge(menu.gaenge);
    setActiveMenuId(menu.id);
    setShowHistory(false);
  };

  // ── Neues Menü ────────────────────────────────────────────────────────────

  const handleNew = () => {
    setTitel('');
    setDatum(new Date().toISOString().split('T')[0]);
    setAnlass('');
    setGaenge([
      { id: generateId(), position: 1, gang_typ: 'Vorspeise', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
      { id: generateId(), position: 2, gang_typ: 'Suppe', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
      { id: generateId(), position: 3, gang_typ: 'Hauptgang', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
      { id: generateId(), position: 4, gang_typ: 'Dessert', name: '', beschreibung: '', wein_empfehlung: '', wein_weingut: '', wein_preis: '', wein_begruendung: '' },
    ]);
    setActiveMenuId(null);
  };

  // ── Drucken ───────────────────────────────────────────────────────────────

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  const hasWeinempfehlungen = gaenge.some(g => g.wein_empfehlung);

  const datumFormatiert = new Date(datum).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 space-y-6 animate-slide-up">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Wine className="h-5 w-5 text-primary" />
              Menü & Weinbegleitung
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menü zusammenstellen · KI-Weinempfehlung (nur Mandira-Weinkarte) · Druckfertig
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleNew} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Neues Menü
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)} className="gap-1.5">
              <FileUp className="h-3.5 w-3.5" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Gespeicherte ({gespeicherteMenus.length})
            </Button>
            {hasWeinempfehlungen && (
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Vorschau
              </Button>
            )}
            {hasWeinempfehlungen && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Drucken
              </Button>
            )}
          </div>
        </div>

        {/* Status-Meldungen */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-xs underline">×</button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600">
            <Check className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {/* Menü-Import — PDF Drag & Drop + Text-Fallback */}
        {showImport && (
          <Card className="border-amber-300/50 bg-amber-50/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileUp className="h-4 w-4 text-amber-600" />
                Tagesmenü importieren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-amber-500 bg-amber-100/30 scale-[1.01]'
                    : 'border-border hover:border-amber-400 hover:bg-amber-50/20'
                } ${importing ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {importing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                    <p className="text-sm font-medium text-amber-700">PDF wird geparst…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileUp className="h-8 w-8 text-amber-500" />
                    <p className="text-sm font-medium text-foreground">
                      Menü-PDF hierher ziehen
                    </p>
                    <p className="text-xs text-muted-foreground">
                      oder klicken zum Auswählen · Gänge werden automatisch erkannt
                    </p>
                  </div>
                )}
              </div>

              {/* Text-Fallback */}
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  Alternativ: Text manuell eingeben ▸
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Gänge mit <code className="bg-muted px-1 rounded">+++</code> trennen.
                  </p>
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder={`Hausbrot mit Kräuterbutter\n+++\nBlattsalat mit Kürbiskernöl-Dressing\n+++\nSteirische Kürbiscremesuppe\n+++\nAyurveda: Dhal mit Basmatireis\n+++\nFisch: Zanderfilet auf Kartoffelpüree\n+++\nFleisch: Rosa gebratenes Rinderfilet\n+++\nTopfenmousse mit Beerenspiegel`}
                    rows={8}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  />
                  <Button size="sm" onClick={handleTextImport} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
                    <Upload className="h-3.5 w-3.5" /> Gänge übernehmen
                  </Button>
                </div>
              </details>

              <Button size="sm" variant="outline" onClick={() => { setShowImport(false); setImportText(''); }}>
                Abbrechen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Gespeicherte Menüs */}
        {showHistory && gespeicherteMenus.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gespeicherte Menüs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {gespeicherteMenus.map(menu => (
                  <button
                    key={menu.id}
                    onClick={() => loadMenu(menu)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors ${
                      activeMenuId === menu.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{menu.titel}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(menu.datum).toLocaleDateString('de-DE')}
                          {menu.anlass && ` · ${menu.anlass}`}
                          {` · ${menu.gaenge.length} Gänge`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {menu.gaenge.some(g => g.wein_empfehlung) ? 'Mit Wein' : 'Ohne Wein'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menü-Kopfdaten */}
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Menütitel *</label>
                <input
                  type="text"
                  value={titel}
                  onChange={e => setTitel(e.target.value)}
                  placeholder="z.B. Ayurveda Gala-Dinner"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Datum</label>
                <input
                  type="date"
                  value={datum}
                  onChange={e => setDatum(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Anlass</label>
                <input
                  type="text"
                  value={anlass}
                  onChange={e => setAnlass(e.target.value)}
                  placeholder="z.B. Vollmond-Dinner, Retreat-Abschluss"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gänge */}
        <div className="space-y-3">
          {gaenge.map((gang, idx) => (
            <Card key={gang.id} className="border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {/* Position & Controls */}
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full h-6 w-6 flex items-center justify-center">
                      {gang.position}
                    </span>
                    <button onClick={() => moveGang(gang.id, 'up')} disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveGang(gang.id, 'down')} disabled={idx === gaenge.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Gang-Daten */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={gang.gang_typ}
                          onChange={e => updateGang(gang.id, 'gang_typ', e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {GANG_TYPEN.map(typ => (
                            <option key={typ} value={typ}>{typ}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={gang.name}
                          onChange={e => updateGang(gang.id, 'name', e.target.value)}
                          placeholder="Name des Gangs"
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <textarea
                        value={gang.beschreibung}
                        onChange={e => updateGang(gang.id, 'beschreibung', e.target.value)}
                        placeholder="Beschreibung / Zutaten (optional)"
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    {/* Weinempfehlung */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Wine className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-muted-foreground">Weinbegleitung</span>
                      </div>
                      <input
                        type="text"
                        value={gang.wein_empfehlung}
                        onChange={e => updateGang(gang.id, 'wein_empfehlung', e.target.value)}
                        placeholder="Wird automatisch generiert oder manuell eingeben"
                        className={`w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                          gang.wein_empfehlung ? 'border-amber-300 bg-amber-50/30' : 'border-border bg-background'
                        }`}
                      />
                      {gang.wein_weingut && (
                        <p className="text-xs text-muted-foreground">{gang.wein_weingut}</p>
                      )}
                      {gang.wein_preis && (
                        <p className="text-xs font-medium text-amber-700">{gang.wein_preis}</p>
                      )}
                      <textarea
                        value={gang.wein_begruendung}
                        onChange={e => updateGang(gang.id, 'wein_begruendung', e.target.value)}
                        placeholder="Begründung der Weinwahl"
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>

                  {/* Löschen */}
                  <button
                    onClick={() => removeGang(gang.id)}
                    disabled={gaenge.length <= 1}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-20 transition-colors mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" size="sm" onClick={addGang} className="gap-1.5 w-full border-dashed">
            <Plus className="h-3.5 w-3.5" /> Gang hinzufügen
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleGenerate}
            disabled={generating || !gaenge.some(g => g.name.trim())}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generiere Weinbegleitung…' : 'KI-Weinbegleitung generieren'}
          </Button>

          <Button onClick={handleSave} disabled={saving || !titel.trim()} variant="outline" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {activeMenuId ? 'Aktualisieren' : 'Speichern'}
          </Button>

          <span className="text-xs text-muted-foreground ml-2">
            Weinkarte: {MANDIRA_WEINKARTE.reduce((acc: number, k: any) => acc + k.weine.length, 0)} Weine geladen
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            DRUCKVORSCHAU — Hotel-Stil (2 Seiten: Gourmetmenü + Weinempfehlung)
            ══════════════════════════════════════════════════════════════════════ */}
        {showPreview && hasWeinempfehlungen && (
          <div className="space-y-6">
            {/* SEITE 1: Gourmetmenü */}
            <Card className="border-[#3d5a40]/20 print:border-none print:shadow-none">
              <CardContent className="p-8 print:p-0">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-serif italic text-[#3d5a40]" style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>
                      Gourmetmenü
                    </h2>
                    <div className="w-48 h-px bg-[#3d5a40]/30 mx-auto" />
                    <p className="text-sm text-[#3d5a40]/70">{datumFormatiert}</p>
                    {anlass && <p className="text-sm italic text-[#3d5a40]/50">{anlass}</p>}
                  </div>

                  {gaenge.filter(g => g.name).map((gang, idx, arr) => (
                    <React.Fragment key={gang.id}>
                      <div className="text-center space-y-1">
                        <p className="text-xs tracking-[0.25em] uppercase text-[#3d5a40]/50 font-medium">
                          {gang.gang_typ}
                        </p>
                        <p className="text-base font-medium text-[#3d5a40]" style={{ fontFamily: "'Georgia', serif" }}>
                          {gang.name}
                        </p>
                        {gang.beschreibung && (
                          <p className="text-xs text-[#3d5a40]/60 italic leading-relaxed">{gang.beschreibung}</p>
                        )}
                      </div>
                      {idx < arr.length - 1 && <OrnamentDivider />}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SEITE 2: Weinempfehlung */}
            <Card className="border-[#3d5a40]/20 print:border-none print:shadow-none print:break-before-page">
              <CardContent className="p-8 print:p-0">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-serif italic text-[#3d5a40]" style={{ fontFamily: "'Georgia', 'Palatino', serif" }}>
                      Weinempfehlung
                    </h2>
                    <div className="w-48 h-px bg-[#3d5a40]/30 mx-auto" />
                  </div>

                  {gaenge.filter(g => g.wein_empfehlung).map((gang, idx, arr) => (
                    <React.Fragment key={gang.id}>
                      <div className="space-y-1.5">
                        <p className="text-xs text-[#3d5a40]/50 italic">
                          {gang.gang_typ === 'Vorspeise' || gang.gang_typ === 'Suppe'
                            ? `Zum ${gang.gang_typ.toLowerCase()} empfehlen wir:`
                            : gang.gang_typ === 'Hauptgang'
                            ? gang.name.toLowerCase().includes('fisch')
                              ? 'Zum Fisch empfehlen wir:'
                              : 'Zum Fleisch empfehlen wir:'
                            : gang.gang_typ === 'Dessert'
                            ? 'Zum Dessert empfehlen wir:'
                            : gang.gang_typ === 'Amuse-Bouche'
                            ? 'Als Aperitif empfehlen wir:'
                            : `Zu ${gang.gang_typ} empfehlen wir:`}
                        </p>
                        <p className="text-base font-semibold text-[#3d5a40]" style={{ fontFamily: "'Georgia', serif" }}>
                          {gang.wein_empfehlung}
                        </p>
                        {gang.wein_weingut && (
                          <p className="text-sm text-[#3d5a40]/70">{gang.wein_weingut}</p>
                        )}
                        {gang.wein_preis && (
                          <p className="text-sm text-[#3d5a40]/80">{gang.wein_preis}</p>
                        )}
                      </div>
                      {idx < arr.length - 1 && <OrnamentDivider />}
                    </React.Fragment>
                  ))}

                  <OrnamentDivider />
                  <p className="text-center text-xs text-[#3d5a40]/50 italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Für alle Freunde edlen Weines, verlangen Sie bitte unsere große Weinkarte.
                    <br />Wir beraten Sie gerne.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

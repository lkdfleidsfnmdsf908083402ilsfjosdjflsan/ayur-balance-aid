import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Users, Building2, Clock, Euro, Info, Search,
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Calendar
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  abteilung: string;
  position: string | null;
  anstellungsart: 'Vollzeit' | 'Teilzeit' | 'Mini-Job' | 'Aushilfe' | 'Praktikant' | 'Azubi';
  wochenstunden_soll: number;
  stundenlohn: number;
  eintrittsdatum: string;
  austrittsdatum: string | null;
  aktiv: boolean;
}

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
  errors: string[];
  gesamtaufwand: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────

const ABTEILUNGEN = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop',
  'Verwaltung', 'Technik', 'Energie', 'Marketing',
  'Personal', 'Finanzierung', 'Sonstiges',
  'Housekeeping', 'Küche', 'Service', 'Rezeption'
];

const ANSTELLUNGSARTEN: Employee['anstellungsart'][] = [
  'Vollzeit', 'Teilzeit', 'Mini-Job', 'Aushilfe', 'Praktikant', 'Azubi'
];

const MONATE = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const DOPPELGEHALTS_MONATE = [6, 11];

const initialFormData: Omit<Employee, 'id'> = {
  personalnummer: '',
  vorname: '',
  nachname: '',
  email: '',
  telefon: '',
  abteilung: 'Logis',
  position: '',
  anstellungsart: 'Vollzeit',
  wochenstunden_soll: 40,
  stundenlohn: 0,
  eintrittsdatum: format(new Date(), 'yyyy-MM-dd'),
  austrittsdatum: null,
  aktiv: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF Parser
// ─────────────────────────────────────────────────────────────────────────────

async function parseLohnkostenPDF(file: File): Promise<ParsedMitarbeiter[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const mitarbeiter: ParsedMitarbeiter[] = [];
  let currentAbteilung = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Alle Items sammeln mit X/Y Koordinaten
    const items = (textContent.items as any[])
      .filter(item => item.str.trim())
      .map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      }));

    // Nach Y gruppieren (gleiche Zeile = Y-Differenz < 4)
    const rowMap = new Map<number, { text: string; x: number }[]>();
    for (const item of items) {
      // Finde passende Y-Gruppe
      let foundY = -1;
      for (const [y] of rowMap) {
        if (Math.abs(y - item.y) <= 4) { foundY = y; break; }
      }
      if (foundY === -1) {
        rowMap.set(item.y, [{ text: item.text, x: item.x }]);
      } else {
        rowMap.get(foundY)!.push({ text: item.text, x: item.x });
      }
    }

    // Zeilen sortiert nach Y (absteigend = oben nach unten)
    const rows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, cells]) => ({
        // Zelle nach X sortieren = links nach rechts
        cells: cells.sort((a, b) => a.x - b.x),
        // Volltext der Zeile
        text: cells.sort((a, b) => a.x - b.x).map(c => c.text).join(' '),
      }));

    if (pageNum === 1) {
      console.log('Erste 15 Zeilen:', rows.slice(0, 15).map(r => r.text));
    }

    for (const row of rows) {
      const line = row.text;

      // Abteilung erkennen
      if (line.includes('Kostenstelle:')) {
        const abt = line
          .replace('Kostenstelle:', '')
          .replace(/Ayurveda-Resort.*|Mandira.*/gi, '')
          .trim();
        if (abt) currentAbteilung = abt;
        continue;
      }

   // Mitarbeiterzeile erkennen: enthält "100,00" und Name mit Komma
      if (!line.includes('100,00')) continue;
      if (line.startsWith('Summen') || line.startsWith('%') || line.startsWith('Mitarbeiter')) continue;

      // Name,Nr Pattern am Anfang
      const nameMatch = line.match(/^([A-ZÄÖÜa-zäöüß][^,]+),\s*(\d+)\s+(.+?)\s+100,00\s+(.+)$/);
      if (!nameMatch) continue;

      const nameRaw = nameMatch[1].trim();
      const personalnummer = nameMatch[2].trim();
      const rest = nameMatch[4].trim();

      // Position: alles bis zur ersten Zahl in nameMatch[3]
      const position = nameMatch[3].trim();

      // Gesamtaufwand: vorletzte Zahl in der Zeile
      const zahlen = rest.match(/[\d\.]+,\d{2}/g);
      if (!zahlen || zahlen.length < 2) continue;
      const gesamtaufwandStr = zahlen[zahlen.length - 2].replace(/\./g, '').replace(',', '.');
      const gesamtaufwand = parseFloat(gesamtaufwandStr) || 0;
      if (gesamtaufwand === 0) continue;

      const nameParts = nameRaw.trim().split(' ');
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

  return mitarbeiter;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Import Dialog
// ─────────────────────────────────────────────────────────────────────────────

function PdfImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
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
      const ma = await parseLohnkostenPDF(f);
      if (ma.length === 0) {
        setError('Keine Mitarbeiter gefunden — bitte prüfe das PDF Format');
      } else {
        setParsed(ma);
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

    const res: ImportResult = { inserted: 0, errors: [], gesamtaufwand: 0 };
    const isDoppel = DOPPELGEHALTS_MONATE.includes(monat);

    for (const ma of parsed) {
      res.gesamtaufwand += ma.gesamtaufwand_monat;

      try {
        // employees aktualisieren
        await supabase.from('employees').upsert({
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

        // employees_history eintragen
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
            ist_doppelmonat: isDoppel,
            gesamtaufwand_normalisiert: isDoppel
              ? ma.gesamtaufwand_monat / 2
              : ma.gesamtaufwand_monat,
            aktiv: ma.aktiv,
          }, { onConflict: 'personalnummer,jahr,monat' });

        if (histError) {
          res.errors.push(`${ma.nachname}: ${histError.message}`);
        } else {
          res.inserted++;
        }
      } catch (err: any) {
        res.errors.push(`${ma.nachname}: ${err.message}`);
      }
    }

    setResult(res);
    setImporting(false);
    if (res.inserted > 0) {
      toast.success(`${res.inserted} Mitarbeiter importiert`);
      onSuccess();
    }
  };

  const reset = () => {
    setFile(null);
    setParsed(null);
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          PDF importieren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lohnkostenliste importieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Zeitraum */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Zeitraum
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Jahr</Label>
                <select
                  value={jahr}
                  onChange={e => setJahr(parseInt(e.target.value))}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
                >
                  {jahre.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Monat</Label>
                <select
                  value={monat}
                  onChange={e => setMonat(parseInt(e.target.value))}
                  className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
                >
                  {MONATE.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            {isDoppelmonat && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {MONATE[monat - 1]} = Doppelgehalt — normalisierter Wert wird berechnet
              </div>
            )}
          </div>

          {/* Upload */}
          {!result && (
            !file ? (
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
                  AYM_MaKo_MM-YYYY.pdf
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
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                {parsing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            )
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Erkannte Mitarbeiter
                </p>
                <Badge variant="secondary">{parsed.length} Personen</Badge>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {Object.entries(
                  parsed.reduce((acc, ma) => {
                    if (!acc[ma.abteilung]) acc[ma.abteilung] = { count: 0, kosten: 0 };
                    acc[ma.abteilung].count++;
                    acc[ma.abteilung].kosten += ma.gesamtaufwand_monat;
                    return acc;
                  }, {} as Record<string, { count: number; kosten: number }>)
                ).map(([abt, data]) => (
                  <div key={abt} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
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

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-sm font-medium">Gesamtaufwand</span>
                <span className="text-lg font-semibold font-mono">
                  € {parsed.reduce((s, m) => s + m.gesamtaufwand_monat, 0)
                    .toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Button onClick={handleImport} disabled={importing} className="w-full">
                {importing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importiere...</>
                  : `${parsed.length} Mitarbeiter für ${MONATE[monat - 1]} ${jahr} importieren`
                }
              </Button>
            </div>
          )}

          {/* Ergebnis */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                <div>
                  <p className="font-medium">Import erfolgreich!</p>
                  <p className="text-sm text-muted-foreground">
                    {MONATE[monat - 1]} {jahr}
                    {isDoppelmonat && ' · Doppelgehalt normalisiert'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{result.inserted}</p>
                  <p className="text-xs text-muted-foreground">Importiert</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono">
                    € {result.gesamtaufwand.toLocaleString('de-DE', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-muted-foreground">Gesamtaufwand</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3">
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────

export function MitarbeiterStammdatenView() {
  const { t, language } = useLanguage();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>(initialFormData);
  const [filter, setFilter] = useState({ abteilung: 'alle', aktiv: 'alle', suche: '' });
  const [lohnaufwandMonat, setLohnaufwandMonat] = useState<number>(0);

  const dateLocale = language === 'de' ? de : enUS;

  const berechneStundenlohn = (monatslohn: number, wochenstunden: number): number => {
    if (wochenstunden <= 0) return 0;
    const jahresbrutto = monatslohn * 14;
    const jahresstunden = wochenstunden * 52;
    return jahresbrutto / jahresstunden;
  };

  const berechneLohnaufwand = (stundenlohn: number, wochenstunden: number): number => {
    const jahresstunden = wochenstunden * 52;
    const jahresbrutto = stundenlohn * jahresstunden;
    return jahresbrutto / 14;
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nachname', { ascending: true });

    if (error) {
      toast.error(t('common.error'));
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.personalnummer || !formData.vorname || !formData.nachname) {
      toast.error(t('common.error'));
      return;
    }

    const payload = {
      ...formData,
      email: formData.email || null,
      telefon: formData.telefon || null,
      position: formData.position || null,
    };

    if (editingEmployee) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployee.id);
      if (error) { toast.error(t('common.error')); } else { toast.success(t('common.success')); loadEmployees(); }
    } else {
      const { error } = await supabase.from('employees').insert([payload]);
      if (error) { toast.error(t('common.error')); } else { toast.success(t('common.success')); loadEmployees(); }
    }

    setDialogOpen(false);
    setEditingEmployee(null);
    setFormData(initialFormData);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      personalnummer: employee.personalnummer,
      vorname: employee.vorname,
      nachname: employee.nachname,
      email: employee.email || '',
      telefon: employee.telefon || '',
      abteilung: employee.abteilung,
      position: employee.position || '',
      anstellungsart: employee.anstellungsart,
      wochenstunden_soll: employee.wochenstunden_soll,
      stundenlohn: employee.stundenlohn,
      eintrittsdatum: employee.eintrittsdatum,
      austrittsdatum: employee.austrittsdatum,
      aktiv: employee.aktiv,
    });
    setLohnaufwandMonat(berechneLohnaufwand(employee.stundenlohn, employee.wochenstunden_soll));
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('upload.confirmDelete'))) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { toast.error(t('common.error')); } else { toast.success(t('common.success')); loadEmployees(); }
  };

  const filteredEmployees = employees.filter((e) => {
    if (filter.abteilung !== 'alle' && e.abteilung !== filter.abteilung) return false;
    if (filter.aktiv === 'aktiv' && !e.aktiv) return false;
    if (filter.aktiv === 'inaktiv' && e.aktiv) return false;
    if (filter.suche) {
      const s = filter.suche.toLowerCase();
      const vollName = `${e.vorname} ${e.nachname}`.toLowerCase();
      if (!vollName.includes(s) && !e.personalnummer.toLowerCase().includes(s) && !e.email?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stats = {
    gesamt: employees.length,
    aktiv: employees.filter(e => e.aktiv).length,
    vollzeit: employees.filter(e => e.aktiv && e.anstellungsart === 'Vollzeit').length,
    teilzeit: employees.filter(e => e.aktiv && e.anstellungsart === 'Teilzeit').length,
    gesamtStunden: employees.filter(e => e.aktiv).reduce((sum, e) => sum + e.wochenstunden_soll, 0),
    durchschnittLohn: employees.filter(e => e.aktiv).length > 0
      ? employees.filter(e => e.aktiv).reduce((sum, e) => sum + e.stundenlohn, 0) / employees.filter(e => e.aktiv).length
      : 0,
  };

  return (
    <div className="space-y-6">

      {/* Header mit beiden Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">{t('employees.title')}</h2>
        <div className="flex items-center gap-2">

          {/* PDF Import Button */}
          <PdfImportDialog onSuccess={loadEmployees} />

          {/* Neuer Mitarbeiter Button */}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingEmployee(null);
              setFormData(initialFormData);
              setLohnaufwandMonat(0);
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> {t('employees.addNew')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? t('common.edit') : t('employees.addNew')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="personalnummer">{t('employees.personnelNumber')} *</Label>
                  <Input
                    id="personalnummer"
                    value={formData.personalnummer}
                    onChange={(e) => setFormData({ ...formData, personalnummer: e.target.value })}
                    placeholder="z.B. MA001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abteilung">{t('employees.department')} *</Label>
                  <Select value={formData.abteilung} onValueChange={(v) => setFormData({ ...formData, abteilung: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ABTEILUNGEN.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.firstName')} *</Label>
                  <Input value={formData.vorname} onChange={(e) => setFormData({ ...formData, vorname: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.lastName')} *</Label>
                  <Input value={formData.nachname} onChange={(e) => setFormData({ ...formData, nachname: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('guests.phone')}</Label>
                  <Input value={formData.telefon || ''} onChange={(e) => setFormData({ ...formData, telefon: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.position')}</Label>
                  <Input value={formData.position || ''} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.employmentType')} *</Label>
                  <Select value={formData.anstellungsart} onValueChange={(v) => setFormData({ ...formData, anstellungsart: v as Employee['anstellungsart'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANSTELLUNGSARTEN.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.weeklyHours')} *</Label>
                  <Input
                    type="number" min={0} max={60}
                    value={formData.wochenstunden_soll}
                    onChange={(e) => {
                      const neueStunden = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, wochenstunden_soll: neueStunden, stundenlohn: Math.round(berechneStundenlohn(lohnaufwandMonat, neueStunden) * 100) / 100 });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Lohnaufwand p.m. (€) *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent><p>14 Gehälter pro Jahr</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number" min={0} step={0.01}
                    value={lohnaufwandMonat}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setLohnaufwandMonat(v);
                      setFormData({ ...formData, stundenlohn: Math.round(berechneStundenlohn(v, formData.wochenstunden_soll) * 100) / 100 });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jahresbrutto (€)</Label>
                  <Input value={(lohnaufwandMonat * 14).toLocaleString('de-AT', { minimumFractionDigits: 2 })} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.hourlyRate')} (€)</Label>
                  <Input value={formData.stundenlohn.toFixed(2)} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t('employees.entryDate')} *</Label>
                  <Input type="date" value={formData.eintrittsdatum} onChange={(e) => setFormData({ ...formData, eintrittsdatum: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Austrittsdatum</Label>
                  <Input type="date" value={formData.austrittsdatum || ''} onChange={(e) => setFormData({ ...formData, austrittsdatum: e.target.value || null })} />
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <Switch id="aktiv" checked={formData.aktiv} onCheckedChange={(checked) => setFormData({ ...formData, aktiv: checked })} />
                  <Label htmlFor="aktiv">{t('employees.active')}</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSubmit}>{editingEmployee ? t('common.save') : t('common.add')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistik-Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">{t('common.total')}</span></div><p className="text-2xl font-bold">{stats.gesamt}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-green-500" /><span className="text-sm text-muted-foreground">{t('employees.active')}</span></div><p className="text-2xl font-bold text-green-600">{stats.aktiv}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" /><span className="text-sm text-muted-foreground">Vollzeit</span></div><p className="text-2xl font-bold">{stats.vollzeit}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-500" /><span className="text-sm text-muted-foreground">Teilzeit</span></div><p className="text-2xl font-bold">{stats.teilzeit}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-purple-500" /><span className="text-sm text-muted-foreground">{t('employees.weeklyHours')}</span></div><p className="text-2xl font-bold">{stats.gesamtStunden.toFixed(0)}h</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Euro className="h-4 w-4 text-yellow-500" /><span className="text-sm text-muted-foreground">Ø {t('employees.hourlyRate')}</span></div><p className="text-2xl font-bold">{stats.durchschnittLohn.toFixed(2)}€</p></CardContent></Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">{t('common.filter')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-end">
            <div className="min-w-[250px] flex-1 max-w-md">
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('employees.search')} value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} className="pl-9" />
              </div>
            </div>
            <div className="min-w-[200px]">
              <Label>{t('employees.department')}</Label>
              <Select value={filter.abteilung} onValueChange={(v) => setFilter({ ...filter, abteilung: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">{t('accounts.all')}</SelectItem>
                  {ABTEILUNGEN.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Label>{t('common.status')}</Label>
              <Select value={filter.aktiv} onValueChange={(v) => setFilter({ ...filter, aktiv: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">{t('accounts.all')}</SelectItem>
                  <SelectItem value="aktiv">{t('employees.active')}</SelectItem>
                  <SelectItem value="inaktiv">{t('employees.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabelle */}
      <Card>
        <CardHeader><CardTitle className="text-lg">{t('nav.employees')} ({filteredEmployees.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground p-6">{t('common.loading')}</p>
          ) : (
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>{t('employees.personnelNumber')}</TableHead>
                    <TableHead>{t('guests.name')}</TableHead>
                    <TableHead>{t('employees.department')}</TableHead>
                    <TableHead>{t('employees.position')}</TableHead>
                    <TableHead>{t('employees.employmentType')}</TableHead>
                    <TableHead className="text-right">{t('employees.weeklyHours')}</TableHead>
                    <TableHead className="text-right">€/h</TableHead>
                    <TableHead className="text-right">Lohnaufwand p.m.</TableHead>
                    <TableHead>{t('employees.entryDate')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => {
                    const lohnaufwandPM = (e.stundenlohn * e.wochenstunden_soll * 52) / 14;
                    return (
                      <TableRow key={e.id} className={!e.aktiv ? 'opacity-50' : ''}>
                        <TableCell className="font-mono">{e.personalnummer}</TableCell>
                        <TableCell className="font-medium">{e.nachname}, {e.vorname}</TableCell>
                        <TableCell>{e.abteilung}</TableCell>
                        <TableCell>{e.position || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={e.anstellungsart === 'Vollzeit' ? 'default' : 'secondary'}>{e.anstellungsart}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{e.wochenstunden_soll}h</TableCell>
                        <TableCell className="text-right">{e.stundenlohn.toFixed(2)}€</TableCell>
                        <TableCell className="text-right font-medium">
                          {lohnaufwandPM.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                        </TableCell>
                        <TableCell>{format(new Date(e.eintrittsdatum), 'dd.MM.yyyy', { locale: dateLocale })}</TableCell>
                        <TableCell>
                          <Badge variant={e.aktiv ? 'default' : 'destructive'}>
                            {e.aktiv ? t('employees.active') : t('employees.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">{t('common.noData')}</TableCell>
                    </TableRow>
                  )}
                  {filteredEmployees.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={5} className="text-right">{t('common.total')} ({filteredEmployees.length})</TableCell>
                      <TableCell className="text-right">{filteredEmployees.reduce((sum, e) => sum + e.wochenstunden_soll, 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right text-primary">
                        {filteredEmployees.reduce((sum, e) => sum + (e.stundenlohn * e.wochenstunden_soll * 52) / 14, 0).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

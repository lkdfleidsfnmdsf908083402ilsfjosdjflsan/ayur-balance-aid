/**
 * VivinoCellarImport
 *
 * Dialog für den einmaligen Bulk-Import einer Vivino-Cellar-CSV in `wein_katalog`.
 * Workflow:
 *   1. CSV-Datei wählen
 *   2. Parser zeigt erkannte Spalten + Anzahl Zeilen + Vorschau (erste 5)
 *   3. Bestätigen → Bulk-Insert in wein_katalog (Conflicts auf (name, weingut, jahrgang) werden ignoriert)
 *   4. Resultat: wie viele neu / wie viele Duplikate
 */

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { parseVivinoCsv, type VivinoCellarRow, type VivinoImportResult } from '@/lib/csvImport';

interface Props {
  onClose: () => void;
  onImported?: (count: number) => void;
}

type Phase = 'pick' | 'preview' | 'importing' | 'done' | 'error';

export function VivinoCellarImport({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<VivinoImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [stats, setStats] = useState<{ inserted: number; duplicates: number; errors: number }>({
    inserted: 0,
    duplicates: 0,
    errors: 0,
  });

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseVivinoCsv(text);
      setParsed(result);
      if (result.rows.length === 0) {
        setErrorMsg(
          result.warnings.join(' ') || 'Keine Weine in der Datei gefunden.'
        );
        setPhase('error');
      } else {
        setPhase('preview');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Datei konnte nicht gelesen werden';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const doImport = async () => {
    if (!parsed) return;
    setPhase('importing');
    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    // Batch-weise, damit Supabase nicht überlastet wird
    const BATCH = 100;
    for (let i = 0; i < parsed.rows.length; i += BATCH) {
      const chunk = parsed.rows.slice(i, i + BATCH);
      const payload = chunk.map((r: VivinoCellarRow) => ({
        name: r.name,
        weingut: r.weingut || null,
        jahrgang: r.jahrgang || null,
        rebsorte: r.rebsorte || null,
        region: r.region || null,
        land: r.land || null,
        beschreibung: r.beschreibung || null,
        vivino_id: r.vivino_id || null,
        source: 'vivino_cellar',
      }));

      try {
        // upsert mit ignoreDuplicates: duplicates landen lautlos im "duplicates"-Bucket
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('wein_katalog')
          .upsert(payload, {
            onConflict: 'name,weingut,jahrgang',
            ignoreDuplicates: true,
          })
          .select('id');
        if (error) {
          console.error('[VivinoImport] batch error:', error);
          errors += chunk.length;
          continue;
        }
        // data enthält nur die wirklich eingefügten Zeilen
        const insertedNow = Array.isArray(data) ? data.length : 0;
        inserted += insertedNow;
        duplicates += chunk.length - insertedNow;
      } catch (e) {
        console.error('[VivinoImport] batch threw:', e);
        errors += chunk.length;
      }
    }

    setStats({ inserted, duplicates, errors });
    setPhase('done');
    onImported?.(inserted);
  };

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Vivino-Cellar importieren
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {phase === 'pick' && (
          <>
            <p className="text-sm text-muted-foreground">
              CSV-Datei aus Vivino → Einstellungen → "Export My Wines" auswählen.
              Wir lesen Name, Weingut, Jahrgang, Region und Rebsorte raus.
            </p>
            <label className="block">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={onFileInput}
                className="hidden"
                id="vivino-csv-input"
              />
              <Button asChild className="w-full h-12" variant="outline">
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV-Datei wählen
                </span>
              </Button>
            </label>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => document.getElementById('vivino-csv-input')?.click()}
            >
              Datei wählen (Alternative)
            </Button>
          </>
        )}

        {phase === 'preview' && parsed && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Datei:</span>
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Erkannte Weine:</span>
                <Badge variant="secondary">{parsed.rows.length}</Badge>
              </div>

              {Object.keys(parsed.detectedColumns).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Erkannte Spalten:</p>
                  <ul className="space-y-0.5 pl-2">
                    {Object.entries(parsed.detectedColumns).map(([key, header]) => (
                      <li key={key}>
                        <span className="text-foreground">{key}</span> ← "{header}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {parsed.warnings.length > 0 && (
                <div className="text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 rounded p-2 flex gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    {parsed.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="border rounded p-2 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Vorschau (erste 5)
                </p>
                <div className="divide-y divide-border">
                  {parsed.rows.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-1.5 text-xs">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-muted-foreground truncate">
                        {[r.weingut, r.jahrgang, r.region].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={doImport}>
                <Check className="h-4 w-4 mr-2" />
                {parsed.rows.length} Weine importieren
              </Button>
              <Button variant="ghost" onClick={() => setPhase('pick')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {phase === 'importing' && (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="text-sm font-medium">Import läuft …</p>
            <p className="text-xs text-muted-foreground">Bitte warten</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="p-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center mx-auto">
              <Check className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="font-semibold">Import abgeschlossen</p>
              <div className="text-sm text-muted-foreground space-y-0.5 mt-2">
                <p>
                  <span className="text-emerald-600 font-medium">{stats.inserted}</span> neu im
                  Katalog
                </p>
                {stats.duplicates > 0 && (
                  <p>
                    <span className="text-muted-foreground">{stats.duplicates}</span> bereits
                    bekannt (übersprungen)
                  </p>
                )}
                {stats.errors > 0 && (
                  <p className="text-destructive">
                    <span className="font-medium">{stats.errors}</span> Fehler
                  </p>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={onClose}>
              Schließen
            </Button>
          </div>
        )}

        {phase === 'error' && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2 items-start text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setPhase('pick')}>
              Andere Datei wählen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

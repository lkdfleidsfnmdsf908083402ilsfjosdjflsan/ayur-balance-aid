/**
 * WeinScannerView.tsx
 *
 * Lookup-Kette:
 *  1. Barcode-Scan (ZXing Live-Kamera) → Open Food Facts API
 *  2. Falls kein Treffer → Foto + Claude Vision (Edge Function)
 *  3. Optional: Vivino-Anreicherung (nur wenn Name-Similarität ausreichend)
 *
 * Lagerorte: Kühlhaus 1/2 (mit Reihen/Fächern), Küche Kühlfach (Reihen/Schubladen),
 * Bar, Restaurant. Lager wird ausschließlich durch Einlagern via Scanner erzeugt.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Camera,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Wine,
  Snowflake,
  CookingPot,
  GlassWater,
  UtensilsCrossed,
  List,
  Trash2,
  ScanLine,
  Search,
  Euro,
  Package,
  Keyboard,
  Flashlight,
  FlashlightOff,
  LayoutGrid,
  Upload,
} from 'lucide-react';

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import {
  lookupBarcode,
  lookupNameInKatalog,
  attachBarcodeToKatalog,
  searchVivino,
  recognizeWithClaude,
  nameSimilarity,
  isValidBarcode,
  type WineInfo,
} from '@/lib/wineLookup';
import { StorageOverview, type WineEntry } from '@/components/wein/StorageOverview';
import { VivinoCellarImport } from '@/components/wein/VivinoCellarImport';

// ─── Lager-Strukturen (Single Source of Truth, auch in StorageOverview) ───
const KUEHLHAUS_REIHEN: Record<number, number> = {
  1: 9, 2: 9, 3: 9, 4: 9, 5: 5, 6: 6, 7: 5, 8: 5, 9: 5,
};
const KUECHE_REIHEN: Record<number, number> = {
  1: 2, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3,
};
// AD (Privatlager Andreas Drexler): Regal mit Reihen/Fächern.
// Standard-Layout wie ein Kühlhaus — hier zentral anpassbar, falls abweichend.
const AD_REIHEN: Record<number, number> = { ...KUEHLHAUS_REIHEN };

type Step =
  | 'scan_choice'
  | 'barcode'
  | 'barcode_manual'
  | 'barcode_searching'
  | 'barcode_not_found'
  | 'camera'
  | 'confirm'
  | 'price_qty'
  | 'storage_type'
  | 'kuehlhaus_nr'
  | 'reihe'
  | 'fach'
  | 'ad_reihe'
  | 'ad_fach'
  | 'kueche_reihe'
  | 'kueche_schublade'
  | 'saving'
  | 'done'
  | 'list';

type ListView = 'list' | 'overview' | 'import';

export function WeinScannerView() {
  const [step, setStep] = useState<Step>('scan_choice');
  const [listView, setListView] = useState<ListView>('list');

  const [capturing, setCapturing] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [wineInfo, setWineInfo] = useState<WineInfo | null>(null);

  const [editName, setEditName] = useState('');
  const [editWeingut, setEditWeingut] = useState('');
  const [editJahrgang, setEditJahrgang] = useState('');
  const [editRebsorte, setEditRebsorte] = useState('');
  const [editRegion, setEditRegion] = useState('');

  const [preis, setPreis] = useState('');
  const [anzahl, setAnzahl] = useState('1');

  const [storageType, setStorageType] = useState<string | null>(null);
  const [kuehlhausNr, setKuehlhausNr] = useState<number | null>(null);
  const [reihe, setReihe] = useState<number | null>(null);
  const [fach, setFach] = useState<number | null>(null);

  const [wines, setWines] = useState<WineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookupStatus, setLookupStatus] = useState('');
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // ─── Lookup-Pipeline für gescannten/eingegebenen Barcode ───
  // useRef-Pattern für die Funktion, weil sie vom Scanner-Callback aufgerufen wird
  // und sonst Stale-Closure-Risiken hätte.
  const handleBarcodeRef = useRef<(code: string) => void>(() => {});

  const handleBarcodeSubmit = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setDetectedBarcode(trimmed);
    setStep('barcode_searching');
    setError(null);

    if (!isValidBarcode(trimmed)) {
      setError(`"${trimmed}" ist keine gültige EAN/UPC-Nummer. Bitte prüfen.`);
      setStep('barcode_not_found');
      return;
    }

    // Vollständige Lookup-Kette: Cache → OFF → Vivino
    const { info, triedSources } = await lookupBarcode(trimmed, (status) =>
      setLookupStatus(status)
    );
    setLookupStatus('');

    if (info) {
      // Treffer! Barcode mitführen für späteres Speichern
      applyWineInfo({ ...info, barcode: trimmed });
      return;
    }

    // Alles durchprobiert, kein Treffer → UI bietet Foto-Pfad an
    console.info('[wineLookup] no hit for', trimmed, 'tried:', triedSources);
    setStep('barcode_not_found');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleBarcodeRef.current = handleBarcodeSubmit;
  }, [handleBarcodeSubmit]);

  // ─── ZXing Barcode Scanner ───
  const {
    videoRef: barcodeVideoRef,
    error: scannerError,
    torchOn,
    torchSupported,
    toggleTorch,
    ready: scannerReady,
  } = useBarcodeScanner({
    active: step === 'barcode',
    onDetected: (code) => {
      setDetectedBarcode(code);
      // Kurz Feedback anzeigen, dann verarbeiten
      window.setTimeout(() => handleBarcodeRef.current(code), 400);
    },
  });

  // Scanner-Fehler in den Haupt-Error-State spiegeln, aber NICHT automatisch
  // zur manuellen Eingabe wechseln – der Nutzer soll den Fehler sehen und
  // selbst entscheiden (Retry, Permission ändern, oder manuell weitermachen).
  useEffect(() => {
    if (scannerError) {
      setError(scannerError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerError]);

  // ─── Error bei Step-Wechsel zurücksetzen (vermeidet stale Errors) ───
  useEffect(() => {
    if (step === 'scan_choice' || step === 'done') setError(null);
  }, [step]);

  // ─── Etiketten-Kamera (für Claude Vision) ───
  const startLabelCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera-API nicht verfügbar (HTTPS erforderlich)');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Kamera-Zugriff verweigert';
      setError(msg);
    }
  }, []);

  const stopLabelCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (step === 'camera') startLabelCamera();
    else stopLabelCamera();
    return () => stopLabelCamera();
  }, [step, startLabelCamera, stopLabelCamera]);

  useEffect(() => {
    if (step === 'barcode_manual') {
      const t = window.setTimeout(() => barcodeInputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [step]);

  // ─── Claude Vision (Foto-Erkennung) ───
  // Wenn vorher ein Barcode gescannt/eingegeben wurde (detectedBarcode), wird er
  // mit dem erkannten Wein zusammen ins WineInfo gehängt, sodass er beim Speichern
  // mit in die DB geht und beim nächsten Scan ein Cache-Hit entsteht.
  const captureAndRecognize = async () => {
    if (!videoRef.current) return;
    setCapturing(true);
    setError(null);

    try {
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar');
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      setImageData(base64);

      setLookupStatus('KI-Erkennung läuft…');
      const claudeResult = await recognizeWithClaude(base64);
      const carriedBarcode = detectedBarcode || undefined;

      if (claudeResult.confidence !== 'none' && claudeResult.name !== 'Nicht erkannt') {
        // Erst gegen den eigenen Katalog matchen — saubere Stammdaten schlagen LLM-Output
        setLookupStatus('Katalog-Match …');
        const katalogHit = await lookupNameInKatalog(claudeResult.name, claudeResult.weingut);
        if (katalogHit) {
          // Barcode an Katalog-Eintrag zurückschreiben (falls noch leer)
          if (carriedBarcode && katalogHit.katalogId && !katalogHit.barcode) {
            await attachBarcodeToKatalog(katalogHit.katalogId, carriedBarcode);
          }
          applyWineInfo({ ...katalogHit, barcode: carriedBarcode || katalogHit.barcode });
          return;
        }

        setLookupStatus('Anreicherung über Vivino…');
        const vivinoResult = await searchVivino(claudeResult.name);

        if (vivinoResult && nameSimilarity(claudeResult.name, vivinoResult.name) >= 0.4) {
          applyWineInfo({
            ...claudeResult,
            ...vivinoResult,
            name:
              vivinoResult.name.length >= claudeResult.name.length
                ? vivinoResult.name
                : claudeResult.name,
            confidence: 'high',
            source: 'vivino',
            barcode: carriedBarcode,
          });
        } else {
          applyWineInfo({ ...claudeResult, barcode: carriedBarcode });
        }
      } else {
        applyWineInfo({ ...claudeResult, barcode: carriedBarcode });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erkennung fehlgeschlagen';
      setError(msg);
      applyWineInfo({
        name: '',
        confidence: 'none',
        source: 'manual',
        barcode: detectedBarcode || undefined,
      });
    } finally {
      setLookupStatus('');
      setCapturing(false);
    }
  };

  const applyWineInfo = (info: WineInfo) => {
    setWineInfo(info);
    setEditName(info.name || '');
    setEditWeingut(info.weingut || '');
    setEditJahrgang(info.jahrgang || '');
    setEditRebsorte(info.rebsorte || '');
    setEditRegion(info.region || '');
    setStep('confirm');
  };

  // ─── Speichern ───
  const buildEntry = (
    lagerort: string,
    extras: Partial<WineEntry> = {}
  ): Omit<WineEntry, 'id'> & { erfasst_am: string } => {
    const parsedPreis = preis ? parseFloat(preis.replace(',', '.')) : null;
    const parsedAnzahl = anzahl ? parseInt(anzahl, 10) : 1;
    // Barcode-Quelle: bevorzugt aus wineInfo (durchgereicht aus Lookup), Fallback detectedBarcode
    const barcode = wineInfo?.barcode || detectedBarcode || null;
    return {
      name: editName,
      weingut: editWeingut || null,
      jahrgang: editJahrgang || null,
      rebsorte: editRebsorte || null,
      region: editRegion || null,
      lagerort,
      kuehlhaus_nr: null,
      reihe: null,
      fach: null,
      einkaufspreis: Number.isFinite(parsedPreis as number) ? (parsedPreis as number) : null,
      anzahl_flaschen: Number.isFinite(parsedAnzahl) && parsedAnzahl > 0 ? parsedAnzahl : 1,
      barcode,
      erfasst_am: new Date().toISOString(),
      ...extras,
    };
  };

  // Supabase-Types kennen `wein_lager` (noch) nicht. Bis die Types neu generiert
  // sind, casten wir den Client an dieser Stelle bewusst. Sobald
  // `supabase gen types typescript` mit der wein_lager-Tabelle gelaufen ist,
  // kann der Cast raus.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weinTable = () => (supabase as any).from('wein_lager');

  const saveEntry = async (entry: Omit<WineEntry, 'id'> & { erfasst_am: string }) => {
    setStep('saving');
    try {
      const { error: err } = await weinTable().insert(entry);
      if (err) throw err;
      setWines((prev) => [entry as WineEntry, ...prev]);
      setStep('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
      setError('Speichern fehlgeschlagen: ' + msg);
      setStep('done');
    }
  };

  const deleteWine = async (id: string, index: number) => {
    try {
      if (id) await weinTable().delete().eq('id', id);
      setWines((prev) => prev.filter((_, i) => i !== index));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Löschen fehlgeschlagen';
      setError('Löschen fehlgeschlagen: ' + msg);
    }
  };

  // Flasche entnehmen (delta -1) oder nachlegen (delta +1). Bei 0 wird der
  // Bestandseintrag gelöscht. Persistiert nach Supabase und aktualisiert den State.
  const adjustBottles = async (wine: WineEntry, delta: number) => {
    if (!wine.id) return;
    const current = wine.anzahl_flaschen ?? 1;
    const next = current + delta;
    try {
      if (next <= 0) {
        await weinTable().delete().eq('id', wine.id);
        setWines((prev) => prev.filter((w) => w.id !== wine.id));
      } else {
        await weinTable().update({ anzahl_flaschen: next }).eq('id', wine.id);
        setWines((prev) =>
          prev.map((w) => (w.id === wine.id ? { ...w, anzahl_flaschen: next } : w))
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Aktualisierung fehlgeschlagen';
      setError('Bestand konnte nicht aktualisiert werden: ' + msg);
    }
  };

  const loadWines = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await weinTable()
        .select('*')
        .order('erfasst_am', { ascending: false })
        .limit(500);
      if (err) throw err;
      setWines((data || []) as WineEntry[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Laden fehlgeschlagen';
      setError(msg);
    } finally {
      setLoading(false);
      setStep('list');
    }
  };

  const reset = () => {
    setImageData(null);
    setWineInfo(null);
    setStorageType(null);
    setKuehlhausNr(null);
    setReihe(null);
    setFach(null);
    setError(null);
    setBarcodeInput('');
    setPreis('');
    setAnzahl('1');
    setLookupStatus('');
    setDetectedBarcode(null);
    setStep('scan_choice');
  };

  // ─── Helpers für Anzeige ───
  const lagerLabel = (w: WineEntry) => {
    if (w.lagerort === 'kuehlhaus') return `KH${w.kuehlhaus_nr ?? '?'} R${w.reihe}/F${w.fach}`;
    if (w.lagerort === 'kueche') return `Küche R${w.reihe}/S${w.fach}`;
    if (w.lagerort === 'ad') return `AD R${w.reihe}/F${w.fach}`;
    if (w.lagerort === 'bar') return 'Bar';
    if (w.lagerort === 'restaurant') return 'Restaurant';
    return w.lagerort || '—';
  };

  const locationSummary = () => {
    if (storageType === 'kuehlhaus') return `Kühlhaus ${kuehlhausNr} · R${reihe} · F${fach}`;
    if (storageType === 'kueche') return `Küche Kühlfach · R${reihe} · S${fach}`;
    if (storageType === 'ad') return `AD · R${reihe} · F${fach}`;
    if (storageType === 'bar') return 'Bar';
    return 'Restaurant';
  };

  const sourceBadge = (source?: string) => {
    if (source === 'cache')
      return <Badge className="bg-emerald-700 text-white">✓ Bestand erkannt</Badge>;
    if (source === 'katalog')
      return <Badge className="bg-indigo-700 text-white">✓ Aus Katalog</Badge>;
    if (source === 'barcode_off')
      return <Badge className="bg-green-700 text-white">✓ Open Food Facts</Badge>;
    if (source === 'vivino')
      return <Badge className="bg-purple-700 text-white">✓ Vivino</Badge>;
    if (source === 'claude')
      return <Badge className="bg-blue-700 text-white">✓ KI-Erkennung</Badge>;
    return <Badge variant="outline">Manuelle Eingabe</Badge>;
  };

  const NumberGrid = ({
    items,
    onSelect,
    label,
  }: {
    items: { value: number; subtitle?: string }[];
    onSelect: (n: number) => void;
    label?: string;
  }) => (
    <>
      {label && <p className="text-sm text-muted-foreground text-center mb-3">{label}</p>}
      <div className="grid grid-cols-3 gap-2">
        {items.map(({ value, subtitle }) => (
          <Button
            key={value}
            variant="outline"
            className="h-16 text-lg font-bold flex flex-col gap-0 hover:bg-primary/10 hover:border-primary"
            onClick={() => onSelect(value)}
          >
            {value}
            {subtitle && (
              <span className="text-[10px] font-normal text-muted-foreground">{subtitle}</span>
            )}
          </Button>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header title="Weinscanner" description="Wein scannen & einlagern" />
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        {/* Haupt-Toggle */}
        <div className="flex gap-2">
          <Button
            variant={step !== 'list' ? 'default' : 'outline'}
            className="flex-1"
            onClick={reset}
          >
            <Camera className="h-4 w-4 mr-2" /> Scanner
          </Button>
          <Button
            variant={step === 'list' ? 'default' : 'outline'}
            className="flex-1"
            onClick={loadWines}
          >
            <List className="h-4 w-4 mr-2" /> Weinlager
          </Button>
        </div>

        {/* Globaler Fehler-Banner */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-3 flex justify-between items-center gap-2">
              <span className="text-sm text-destructive">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ SCAN CHOICE ═══ */}
        {step === 'scan_choice' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Wein erfassen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  className="h-20 flex flex-col gap-1 text-base"
                  onClick={() => setStep('barcode')}
                >
                  <ScanLine className="h-7 w-7" />
                  <span>Barcode scannen</span>
                  <span className="text-xs opacity-70 font-normal">
                    Kamera auf Barcode halten
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-1 text-base hover:bg-primary/10 hover:border-primary"
                  onClick={() => setStep('camera')}
                >
                  <Camera className="h-7 w-7" />
                  <span>Etikett fotografieren</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    KI-Erkennung via Claude
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-14 flex gap-2"
                  onClick={() => applyWineInfo({ name: '', confidence: 'none', source: 'manual' })}
                >
                  <Wine className="h-5 w-5" /> Manuell eingeben
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ BARCODE LIVE SCANNER (ZXing) ═══ */}
        {step === 'barcode' && (
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-black">
              <video
                ref={barcodeVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-28 relative">
                  <div className="absolute inset-0 border-2 border-primary/50 rounded-lg" />
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br" />
                  <div
                    className="absolute left-2 right-2 top-1/2 h-0.5 bg-red-500/80 rounded"
                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <p className="absolute top-4 left-0 right-0 text-center text-sm text-white/90 font-medium drop-shadow-lg">
                📷 Barcode in den Rahmen halten
              </p>
              {!scannerReady && !detectedBarcode && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="h-8 w-8 text-white/70 animate-spin" />
                </div>
              )}
              {detectedBarcode && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <span className="bg-green-600 text-white text-sm px-4 py-2 rounded-full font-bold shadow-lg">
                    ✓ Erkannt: {detectedBarcode}
                  </span>
                </div>
              )}
              {/* Torch-Button */}
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
                  aria-label="Taschenlampe"
                >
                  {torchOn ? (
                    <Flashlight className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <FlashlightOff className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
            <CardContent className="p-3 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('barcode_manual')}
                >
                  <Keyboard className="h-4 w-4 mr-2" /> Nummer eingeben
                </Button>
                <Button variant="ghost" onClick={() => setStep('scan_choice')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ BARCODE MANUAL ═══ */}
        {step === 'barcode_manual' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Keyboard className="h-5 w-5" /> Barcode manuell
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Barcode-Nummer vom Etikett abtippen (EAN-13, EAN-8 oder UPC).
              </p>
              <div className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  placeholder="z.B. 9001234567890"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit(barcodeInput)}
                  className="text-lg"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <Button
                  onClick={() => handleBarcodeSubmit(barcodeInput)}
                  disabled={!barcodeInput.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {barcodeInput.length >= 8 && !isValidBarcode(barcodeInput) && (
                <p className="text-xs text-yellow-700 text-center">
                  ⚠ Prüfziffer ungültig – bitte Eingabe kontrollieren
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('barcode')}>
                  <ScanLine className="h-4 w-4 mr-2" /> Kamera-Scan
                </Button>
                <Button variant="ghost" onClick={() => setStep('scan_choice')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ BARCODE SEARCHING ═══ */}
        {step === 'barcode_searching' && (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="font-medium">{lookupStatus || 'Suche läuft…'}</p>
              {detectedBarcode && (
                <p className="text-xs text-muted-foreground">{detectedBarcode}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ BARCODE NICHT GEFUNDEN ═══ */}
        {step === 'barcode_not_found' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-base">Wein noch nicht bekannt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  Barcode {detectedBarcode && <span className="font-mono">{detectedBarcode}</span>}{' '}
                  wurde weder im eigenen Bestand noch in Open Food Facts oder Vivino gefunden.
                </p>
                <p className="text-xs text-muted-foreground">
                  Empfehlung: Etikett fotografieren — der Wein wird erkannt und automatisch in den
                  Cache aufgenommen. Beim nächsten Scan derselben Flasche geht's instant.
                </p>
              </div>
              <Button
                className="w-full h-14 text-base"
                onClick={() => setStep('camera')}
              >
                <Camera className="h-5 w-5 mr-2" />
                Etikett fotografieren
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    applyWineInfo({
                      name: '',
                      confidence: 'none',
                      source: 'manual',
                      barcode: detectedBarcode || undefined,
                    })
                  }
                >
                  <Keyboard className="h-4 w-4 mr-2" /> Manuell eingeben
                </Button>
                <Button variant="ghost" onClick={() => setStep('scan_choice')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ ETIKETT-KAMERA ═══ */}
        {step === 'camera' && (
          <Card className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] aspect-[3/4] border-2 border-primary/40 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
                </div>
              </div>
              {lookupStatus && (
                <div className="absolute top-3 left-0 right-0 flex justify-center">
                  <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                    {lookupStatus}
                  </span>
                </div>
              )}
              <p className="absolute bottom-20 left-0 right-0 text-center text-sm text-white/60">
                Weinetikett im Rahmen positionieren
              </p>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <button
                  onClick={() => setStep('scan_choice')}
                  className="w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
                  aria-label="Zurück"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={captureAndRecognize}
                  disabled={capturing}
                  className="w-16 h-16 rounded-full border-4 border-white/80 bg-primary/30 backdrop-blur flex items-center justify-center hover:bg-primary/50 transition-all disabled:opacity-50"
                  aria-label="Foto aufnehmen"
                >
                  {capturing ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary" />
                  )}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ═══ CONFIRM / EDIT ═══ */}
        {step === 'confirm' && (
          <Card>
            {imageData && (
              <img
                src={`data:image/jpeg;base64,${imageData}`}
                alt="Scan"
                className="w-full h-40 object-cover"
              />
            )}
            {wineInfo?.bildUrl && !imageData && (
              <img
                src={wineInfo.bildUrl}
                alt="Wein"
                className="w-full h-40 object-contain bg-muted p-2"
              />
            )}
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                {sourceBadge(wineInfo?.source)}
                {wineInfo?.confidence === 'none' && (
                  <span className="text-xs text-muted-foreground">Felder manuell ausfüllen</span>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="text-[10px] text-muted-foreground uppercase tracking-wider"
                  >
                    Weinname *
                  </label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="z.B. Grüner Veltliner Smaragd"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="edit-weingut"
                      className="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >
                      Weingut
                    </label>
                    <Input
                      id="edit-weingut"
                      value={editWeingut}
                      onChange={(e) => setEditWeingut(e.target.value)}
                      placeholder="Weingut…"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-jahrgang"
                      className="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >
                      Jahrgang
                    </label>
                    <Input
                      id="edit-jahrgang"
                      value={editJahrgang}
                      onChange={(e) => setEditJahrgang(e.target.value)}
                      placeholder="z.B. 2022"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-rebsorte"
                      className="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >
                      Rebsorte
                    </label>
                    <Input
                      id="edit-rebsorte"
                      value={editRebsorte}
                      onChange={(e) => setEditRebsorte(e.target.value)}
                      placeholder="Riesling…"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-region"
                      className="text-[10px] text-muted-foreground uppercase tracking-wider"
                    >
                      Region
                    </label>
                    <Input
                      id="edit-region"
                      value={editRegion}
                      onChange={(e) => setEditRegion(e.target.value)}
                      placeholder="Wachau…"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={!editName.trim()}
                  onClick={() => setStep('price_qty')}
                >
                  <Check className="h-4 w-4 mr-2" /> Weiter
                </Button>
                <Button variant="outline" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ PREIS & ANZAHL ═══ */}
        {step === 'price_qty' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">💰 Preis & Menge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">{editName}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="preis"
                    className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"
                  >
                    <Euro className="h-3 w-3" /> Einkaufspreis
                  </label>
                  <Input
                    id="preis"
                    value={preis}
                    onChange={(e) => setPreis(e.target.value)}
                    placeholder="z.B. 12.50"
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    htmlFor="anzahl"
                    className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"
                  >
                    <Package className="h-3 w-3" /> Anzahl Flaschen
                  </label>
                  <Input
                    id="anzahl"
                    value={anzahl}
                    onChange={(e) => setAnzahl(e.target.value)}
                    placeholder="1"
                    type="number"
                    min="1"
                    step="1"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setStep('storage_type')}>
                  <Check className="h-4 w-4 mr-2" /> Weiter zum Lagerort
                </Button>
                <Button variant="ghost" onClick={() => setStep('confirm')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ STORAGE TYPE ═══ */}
        {step === 'storage_type' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Wo wird gelagert?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    key: 'kuehlhaus',
                    icon: Snowflake,
                    label: 'Kühlhaus',
                    next: () => setStep('kuehlhaus_nr'),
                  },
                  {
                    key: 'kueche',
                    icon: CookingPot,
                    label: 'Küche Kühlfach',
                    next: () => setStep('kueche_reihe'),
                  },
                  {
                    key: 'bar',
                    icon: GlassWater,
                    label: 'Bar',
                    next: () => saveEntry(buildEntry('bar')),
                  },
                  {
                    key: 'restaurant',
                    icon: UtensilsCrossed,
                    label: 'Restaurant',
                    next: () => saveEntry(buildEntry('restaurant')),
                  },
                  {
                    key: 'ad',
                    icon: Wine,
                    label: 'AD (Privat)',
                    next: () => setStep('ad_reihe'),
                  },
                ].map((s) => (
                  <Button
                    key={s.key}
                    variant="outline"
                    className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary"
                    onClick={() => {
                      setStorageType(s.key);
                      s.next();
                    }}
                  >
                    <s.icon className="h-8 w-8" />
                    <span className="text-sm font-medium">{s.label}</span>
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('price_qty')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'kuehlhaus_nr' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">❄️ Welches Kühlhaus?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                {[1, 2, 3].map((nr) => (
                  <Button
                    key={nr}
                    variant="outline"
                    className="flex-1 h-24 flex flex-col gap-1 text-3xl font-bold hover:bg-primary/10 hover:border-primary"
                    onClick={() => {
                      setKuehlhausNr(nr);
                      setStep('reihe');
                    }}
                  >
                    {nr}
                    <span className="text-xs font-normal text-muted-foreground">
                      Kühlhaus {nr}
                    </span>
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('storage_type')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'reihe' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">❄️ KH{kuehlhausNr} — Reihe wählen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Object.keys(KUEHLHAUS_REIHEN).map((r) => ({ value: Number(r) }))}
                onSelect={(r) => {
                  setReihe(r);
                  setStep('fach');
                }}
              />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('kuehlhaus_nr')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'fach' && reihe && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                KH{kuehlhausNr} · R{reihe} — Fach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Array.from({ length: KUEHLHAUS_REIHEN[reihe] }, (_, i) => ({
                  value: i + 1,
                }))}
                onSelect={(f) => {
                  setFach(f);
                  saveEntry(
                    buildEntry('kuehlhaus', { kuehlhaus_nr: kuehlhausNr, reihe, fach: f })
                  );
                }}
                label={`${KUEHLHAUS_REIHEN[reihe]} Fächer verfügbar`}
              />
              <Button variant="ghost" className="w-full" onClick={() => setStep('reihe')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'ad_reihe' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">🍷 AD — Reihe wählen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Object.keys(AD_REIHEN).map((r) => ({ value: Number(r) }))}
                onSelect={(r) => {
                  setReihe(r);
                  setStep('ad_fach');
                }}
              />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('storage_type')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'ad_fach' && reihe && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">AD · R{reihe} — Fach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Array.from({ length: AD_REIHEN[reihe] }, (_, i) => ({
                  value: i + 1,
                }))}
                onSelect={(f) => {
                  setFach(f);
                  saveEntry(buildEntry('ad', { reihe, fach: f }));
                }}
                label={`${AD_REIHEN[reihe]} Fächer verfügbar`}
              />
              <Button variant="ghost" className="w-full" onClick={() => setStep('ad_reihe')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'kueche_reihe' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">🧊 Küche Kühlfach — Reihe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Object.entries(KUECHE_REIHEN).map(([r, s]) => ({
                  value: Number(r),
                  subtitle: `${s} Schubl.`,
                }))}
                onSelect={(r) => {
                  setReihe(r);
                  setStep('kueche_schublade');
                }}
              />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('storage_type')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'kueche_schublade' && reihe && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Küche R{reihe} — Schublade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <NumberGrid
                items={Array.from({ length: KUECHE_REIHEN[reihe] }, (_, i) => ({
                  value: i + 1,
                }))}
                onSelect={(s) => {
                  setFach(s);
                  saveEntry(buildEntry('kueche', { reihe, fach: s }));
                }}
                label={`${KUECHE_REIHEN[reihe]} Schubladen verfügbar`}
              />
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('kueche_reihe')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Zurück
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'saving' && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Wird gespeichert…</p>
            </CardContent>
          </Card>
        )}

        {step === 'done' && (
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold">{editName}</h2>
              {preis && (
                <p className="text-sm text-muted-foreground">
                  € {parseFloat(preis.replace(',', '.')).toFixed(2)} · {anzahl} Fl.
                </p>
              )}
              <p className="text-primary font-medium">📍 {locationSummary()}</p>
              <p className="text-sm text-muted-foreground">Erfolgreich gespeichert</p>
              <Button className="w-full" onClick={reset}>
                <Camera className="h-4 w-4 mr-2" /> Nächsten Wein scannen
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ LIST / OVERVIEW ═══ */}
        {step === 'list' && (
          <div className="space-y-3">
            {/* Sub-Toggle: Liste / Bestandsübersicht / Import */}
            <div className="flex gap-2">
              <Button
                variant={listView === 'list' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setListView('list')}
              >
                <List className="h-4 w-4 mr-2" /> Liste
              </Button>
              <Button
                variant={listView === 'overview' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setListView('overview')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Bestand
              </Button>
              <Button
                variant={listView === 'import' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setListView('import')}
              >
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
            </div>

            {listView === 'list' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wine className="h-5 w-5" /> Weinlager
                    <Badge variant="outline" className="ml-auto">
                      {wines.length} Einträge
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </div>
                  ) : wines.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Noch keine Weine erfasst.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {wines.map((w, i) => (
                        <div
                          key={w.id || i}
                          className="py-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{w.name}</p>
                            <div className="flex gap-2 items-center flex-wrap">
                              {w.weingut && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {w.weingut}
                                </p>
                              )}
                              {w.jahrgang && (
                                <span className="text-xs text-muted-foreground">
                                  {w.jahrgang}
                                </span>
                              )}
                              {w.einkaufspreis != null && (
                                <span className="text-xs text-green-600 font-medium">
                                  €{w.einkaufspreis}
                                </span>
                              )}
                              {w.anzahl_flaschen && w.anzahl_flaschen > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {w.anzahl_flaschen} Fl.
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {lagerLabel(w)}
                          </Badge>
                          {w.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteWine(w.id!, i)}
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {listView === 'overview' && (
              <StorageOverview wines={wines} onAdjustBottles={adjustBottles} />
            )}

            {listView === 'import' && (
              <VivinoCellarImport
                onClose={() => setListView('list')}
                onImported={() => {
                  // Nach Import zurück zur Liste — der Katalog wirkt im Hintergrund
                  setListView('list');
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

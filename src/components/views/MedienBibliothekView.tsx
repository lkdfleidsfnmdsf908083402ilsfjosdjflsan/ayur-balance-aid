/**
 * MedienBibliothekView.tsx
 *
 * Medien-Bibliothek für den Social-Media-Agent: einmal gefilmte Clips und Bilder
 * (Christina in verschiedenen Outfits) hochladen, verschlagworten und dauerhaft
 * wiederverwenden. Die Zuordnung zu Posts passiert im Social Media Agent.
 *
 * Ehrlichkeit beim Upload: supabase-js liefert keinen Byte-Fortschritt, also
 * zeigen wir echte Zustände je Datei (wartet / lädt hoch / fertig / Fehler)
 * statt eines erfundenen Prozentbalkens.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  UploadCloud,
  Film,
  Image as ImageIcon,
  Pencil,
  EyeOff,
  X,
  Check,
  AlertTriangle,
  Search,
  Clapperboard,
} from 'lucide-react';
import {
  ladeAssets,
  assetHochladen,
  assetAktualisieren,
  assetDeaktivieren,
  signierteUrl,
  type SocialAsset,
  type AssetTyp,
  type AssetFormat,
} from '@/lib/socialMedien';

// ─── Helfer ──────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<AssetFormat, string> = {
  hochkant: 'Hochkant (9:16)',
  quer: 'Quer (16:9)',
  quadrat: 'Quadrat (1:1)',
};

function formatAusMassen(breite: number, hoehe: number): AssetFormat {
  if (breite === 0 || hoehe === 0) return 'quadrat';
  const verhaeltnis = breite / hoehe;
  if (verhaeltnis > 1.1) return 'quer';
  if (verhaeltnis < 0.9) return 'hochkant';
  return 'quadrat';
}

function formatGroesse(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDauer(sekunden: number | null): string | null {
  if (sekunden == null) return null;
  const min = Math.floor(sekunden / 60);
  const sek = Math.round(sekunden % 60);
  return min > 0 ? `${min}:${String(sek).padStart(2, '0')} min` : `${sek} s`;
}

/** Maße (und bei Video die Dauer) clientseitig auslesen, bevor irgendetwas hochgeladen wird. */
function liesMedienDaten(
  datei: File,
  objectUrl: string,
): Promise<{ breite: number; hoehe: number; dauer_sekunden: number | null }> {
  return new Promise((resolve, reject) => {
    if (datei.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () =>
        resolve({
          breite: video.videoWidth,
          hoehe: video.videoHeight,
          dauer_sekunden: Number.isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : null,
        });
      video.onerror = () => reject(new Error(`Video "${datei.name}" konnte nicht gelesen werden.`));
      video.src = objectUrl;
    } else {
      const bild = new Image();
      bild.onload = () =>
        resolve({ breite: bild.naturalWidth, hoehe: bild.naturalHeight, dauer_sekunden: null });
      bild.onerror = () => reject(new Error(`Bild "${datei.name}" konnte nicht gelesen werden.`));
      bild.src = objectUrl;
    }
  });
}

// ─── Schlagwort-Eingabe ──────────────────────────────────────────────────────

function ThemenEingabe({
  themen,
  onChange,
}: {
  themen: string[];
  onChange: (themen: string[]) => void;
}) {
  const [eingabe, setEingabe] = useState('');

  const hinzufuegen = () => {
    const wert = eingabe.trim().toLowerCase();
    if (wert && !themen.includes(wert)) onChange([...themen, wert]);
    setEingabe('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {themen.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button type="button" onClick={() => onChange(themen.filter((x) => x !== t))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            hinzufuegen();
          }
        }}
        onBlur={hinzufuegen}
        placeholder="Schlagwort eingeben, Enter drückt ab"
        className="text-sm"
      />
    </div>
  );
}

// ─── Upload-Entwurf (Datei gewählt, Metadaten noch offen) ────────────────────

interface UploadEntwurf {
  key: string;
  datei: File;
  typ: AssetTyp;
  vorschauUrl: string; // ObjectURL, wird nach Abschluss freigegeben
  breite: number;
  hoehe: number;
  dauer_sekunden: number | null;
  titel: string;
  outfit: string;
  kulisse: string;
  themen: string[];
  format: AssetFormat;
  status: 'offen' | 'laedt' | 'fertig' | 'fehler';
  fehler?: string;
}

function UploadEntwurfKarte({
  entwurf,
  onAendern,
  onEntfernen,
  onHochladen,
}: {
  entwurf: UploadEntwurf;
  onAendern: (patch: Partial<UploadEntwurf>) => void;
  onEntfernen: () => void;
  onHochladen: () => void;
}) {
  const gesperrt = entwurf.status === 'laedt' || entwurf.status === 'fertig';

  return (
    <Card className={entwurf.status === 'fehler' ? 'border-destructive' : undefined}>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-4">
          {/* Lokale Vorschau (ObjectURL, noch nichts hochgeladen) */}
          <div className="w-28 shrink-0 rounded-md overflow-hidden bg-muted/50 border border-border self-start">
            {entwurf.typ === 'video' ? (
              <video src={entwurf.vorschauUrl} muted playsInline className="w-full h-auto" />
            ) : (
              <img src={entwurf.vorschauUrl} alt={entwurf.datei.name} className="w-full h-auto" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                {entwurf.typ === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                {entwurf.typ === 'video' ? 'Video' : 'Bild'}
              </Badge>
              <span className="truncate">{entwurf.datei.name}</span>
              <span>{formatGroesse(entwurf.datei.size)}</span>
              <span>{entwurf.breite} × {entwurf.hoehe}</span>
              {formatDauer(entwurf.dauer_sekunden) && <span>{formatDauer(entwurf.dauer_sekunden)}</span>}
            </div>
            <Input
              value={entwurf.titel}
              onChange={(e) => onAendern({ titel: e.target.value })}
              placeholder="Titel (Pflicht)"
              disabled={gesperrt}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={entwurf.outfit}
                onChange={(e) => onAendern({ outfit: e.target.value })}
                placeholder="Outfit (z. B. weißes Leinenkleid)"
                disabled={gesperrt}
              />
              <Input
                value={entwurf.kulisse}
                onChange={(e) => onAendern({ kulisse: e.target.value })}
                placeholder="Kulisse (z. B. Seeterrasse)"
                disabled={gesperrt}
              />
            </div>
            {!gesperrt && (
              <ThemenEingabe themen={entwurf.themen} onChange={(themen) => onAendern({ themen })} />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={entwurf.format}
                onValueChange={(v) => onAendern({ format: v as AssetFormat })}
                disabled={gesperrt}
              >
                <SelectTrigger className="w-44 bg-muted border-border text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FORMAT_LABELS) as AssetFormat[]).map((f) => (
                    <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                aus den Maßen vorgeschlagen: {FORMAT_LABELS[formatAusMassen(entwurf.breite, entwurf.hoehe)]}
              </span>
            </div>
          </div>
        </div>

        {entwurf.status === 'fehler' && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {entwurf.fehler ?? 'Upload fehlgeschlagen.'}
          </p>
        )}

        <div className="flex items-center gap-2">
          {entwurf.status === 'fertig' ? (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" /> Hochgeladen
            </Badge>
          ) : (
            <>
              <Button
                size="sm"
                onClick={onHochladen}
                disabled={entwurf.status === 'laedt' || !entwurf.titel.trim()}
              >
                {entwurf.status === 'laedt' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Lädt hoch …
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    {entwurf.status === 'fehler' ? 'Erneut versuchen' : 'Hochladen'}
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onEntfernen} disabled={entwurf.status === 'laedt'}>
                Entfernen
              </Button>
              {!entwurf.titel.trim() && (
                <span className="text-xs text-muted-foreground">Titel fehlt noch.</span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Asset-Karte (Bibliothek) ────────────────────────────────────────────────

/** Vorschau über signierte URL — der Bucket ist privat, ohne Signatur gibt es kein Bild. */
export function AssetVorschau({ asset, klein }: { asset: SocialAsset; klein?: boolean }) {
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ['social_asset_url', asset.storage_pfad],
    queryFn: () => signierteUrl(asset.storage_pfad),
    staleTime: 45 * 60 * 1000, // signierte URL gilt 60 min — vorher erneuern
  });

  const hoehe = klein ? 'h-20' : 'h-40';

  if (isLoading) {
    return (
      <div className={`${hoehe} flex items-center justify-center bg-muted/50`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !url) {
    return (
      <div className={`${hoehe} flex items-center justify-center bg-muted/50 text-xs text-destructive px-2 text-center`}>
        Vorschau nicht verfügbar (signierte URL fehlgeschlagen)
      </div>
    );
  }
  return asset.typ === 'video' ? (
    <video src={url} muted playsInline controls={!klein} className={`w-full ${hoehe} object-cover bg-muted/50`} />
  ) : (
    <img src={url} alt={asset.titel} className={`w-full ${hoehe} object-cover bg-muted/50`} />
  );
}

function AssetKarte({ asset, canEdit }: { asset: SocialAsset; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [form, setForm] = useState({
    titel: asset.titel,
    beschreibung: asset.beschreibung ?? '',
    outfit: asset.outfit ?? '',
    kulisse: asset.kulisse ?? '',
    themen: asset.themen,
    format: asset.format ?? 'quer',
  });

  const speichernMutation = useMutation({
    mutationFn: () =>
      assetAktualisieren(asset.id, {
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim() || null,
        outfit: form.outfit.trim() || null,
        kulisse: form.kulisse.trim() || null,
        themen: form.themen,
        format: form.format as AssetFormat,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_assets'] });
      setBearbeiten(false);
      toast({ title: 'Asset aktualisiert' });
    },
    onError: (e: Error) => {
      toast({ title: 'Speichern fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const deaktivierenMutation = useMutation({
    mutationFn: () => assetDeaktivieren(asset.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_assets'] });
      toast({
        title: 'Asset deaktiviert',
        description: 'Die Datei bleibt erhalten, erscheint aber nicht mehr in der Bibliothek.',
      });
    },
    onError: (e: Error) => {
      toast({ title: 'Deaktivieren fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <Card className="overflow-hidden">
      <AssetVorschau asset={asset} />
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug min-w-0">{asset.titel}</p>
          {canEdit && !bearbeiten && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Bearbeiten"
                onClick={() => setBearbeiten(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                title="Deaktivieren (Datei bleibt erhalten)"
                onClick={() => deaktivierenMutation.mutate()}
                disabled={deaktivierenMutation.isPending}
              >
                {deaktivierenMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
            </div>
          )}
        </div>

        {bearbeiten ? (
          <div className="space-y-2">
            <Input
              value={form.titel}
              onChange={(e) => setForm((f) => ({ ...f, titel: e.target.value }))}
              placeholder="Titel"
            />
            <Textarea
              value={form.beschreibung}
              onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
              placeholder="Beschreibung"
              rows={2}
            />
            <Input
              value={form.outfit}
              onChange={(e) => setForm((f) => ({ ...f, outfit: e.target.value }))}
              placeholder="Outfit"
            />
            <Input
              value={form.kulisse}
              onChange={(e) => setForm((f) => ({ ...f, kulisse: e.target.value }))}
              placeholder="Kulisse"
            />
            <ThemenEingabe
              themen={form.themen}
              onChange={(themen) => setForm((f) => ({ ...f, themen }))}
            />
            <Select
              value={form.format}
              onValueChange={(v) => setForm((f) => ({ ...f, format: v as AssetFormat }))}
            >
              <SelectTrigger className="bg-muted border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORMAT_LABELS) as AssetFormat[]).map((f) => (
                  <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => speichernMutation.mutate()}
                disabled={speichernMutation.isPending || !form.titel.trim()}
              >
                {speichernMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Speichern
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setBearbeiten(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="gap-1">
                {asset.typ === 'video' ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                {asset.typ === 'video' ? 'Video' : 'Bild'}
              </Badge>
              {asset.format && <Badge variant="outline">{FORMAT_LABELS[asset.format]}</Badge>}
              <Badge variant="secondary">
                {asset.verwendet_zaehler}× verwendet
              </Badge>
            </div>
            {(asset.outfit || asset.kulisse) && (
              <p className="text-xs text-muted-foreground">
                {[asset.outfit, asset.kulisse].filter(Boolean).join(' · ')}
              </p>
            )}
            {asset.themen.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {asset.themen.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {[
                asset.breite && asset.hoehe ? `${asset.breite} × ${asset.hoehe}` : null,
                formatDauer(asset.dauer_sekunden),
                formatGroesse(asset.groesse_bytes),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Hauptview ───────────────────────────────────────────────────────────────

export function MedienBibliothekView() {
  const { toast } = useToast();
  const { canEdit, user } = useAuth();
  const queryClient = useQueryClient();
  const dateiInputRef = useRef<HTMLInputElement>(null);

  const [entwuerfe, setEntwuerfe] = useState<UploadEntwurf[]>([]);
  const [dragAktiv, setDragAktiv] = useState(false);
  const [filterTyp, setFilterTyp] = useState<'alle' | AssetTyp>('alle');
  const [filterFormat, setFilterFormat] = useState<'alle' | AssetFormat>('alle');
  const [filterThema, setFilterThema] = useState<string>('alle');
  const [suche, setSuche] = useState('');

  const { data: assets, isLoading: assetsLaden, error: assetsFehler } = useQuery({
    queryKey: ['social_assets'],
    queryFn: () => ladeAssets(),
  });

  // Alle vergebenen Schlagworte für den Filter
  const alleThemen = useMemo(() => {
    const set = new Set<string>();
    for (const a of assets ?? []) for (const t of a.themen) set.add(t);
    return [...set].sort();
  }, [assets]);

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return (assets ?? []).filter((a) => {
      if (filterTyp !== 'alle' && a.typ !== filterTyp) return false;
      if (filterFormat !== 'alle' && a.format !== filterFormat) return false;
      if (filterThema !== 'alle' && !a.themen.includes(filterThema)) return false;
      if (s) {
        const heuhaufen = [a.titel, a.beschreibung, a.outfit, a.kulisse, a.dateiname, ...a.themen]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!heuhaufen.includes(s)) return false;
      }
      return true;
    });
  }, [assets, filterTyp, filterFormat, filterThema, suche]);

  // ─── Dateien annehmen (Drag&Drop oder Dateiauswahl) ───

  const dateienAnnehmen = useCallback(
    async (liste: FileList | File[]) => {
      for (const datei of Array.from(liste)) {
        const istVideo = datei.type.startsWith('video/');
        const istBild = datei.type.startsWith('image/');
        if (!istVideo && !istBild) {
          toast({
            title: 'Datei übersprungen',
            description: `"${datei.name}" ist weder Video noch Bild (${datei.type || 'unbekannter Typ'}).`,
            variant: 'destructive',
          });
          continue;
        }
        const vorschauUrl = URL.createObjectURL(datei);
        try {
          const md = await liesMedienDaten(datei, vorschauUrl);
          setEntwuerfe((prev) => [
            ...prev,
            {
              key: crypto.randomUUID(),
              datei,
              typ: istVideo ? 'video' : 'bild',
              vorschauUrl,
              breite: md.breite,
              hoehe: md.hoehe,
              dauer_sekunden: md.dauer_sekunden,
              titel: datei.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
              outfit: '',
              kulisse: '',
              themen: [],
              format: formatAusMassen(md.breite, md.hoehe),
              status: 'offen',
            },
          ]);
        } catch (e) {
          URL.revokeObjectURL(vorschauUrl);
          toast({
            title: 'Datei nicht lesbar',
            description: e instanceof Error ? e.message : String(e),
            variant: 'destructive',
          });
        }
      }
    },
    [toast],
  );

  const entwurfAendern = (key: string, patch: Partial<UploadEntwurf>) => {
    setEntwuerfe((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  };

  const entwurfEntfernen = (key: string) => {
    setEntwuerfe((prev) => {
      const weg = prev.find((e) => e.key === key);
      if (weg) URL.revokeObjectURL(weg.vorschauUrl);
      return prev.filter((e) => e.key !== key);
    });
  };

  // ─── Upload (echter Statuswechsel je Datei, kein erfundener Fortschritt) ───

  const hochladen = async (entwurf: UploadEntwurf) => {
    entwurfAendern(entwurf.key, { status: 'laedt', fehler: undefined });
    try {
      await assetHochladen(entwurf.datei, {
        titel: entwurf.titel.trim(),
        outfit: entwurf.outfit.trim() || null,
        kulisse: entwurf.kulisse.trim() || null,
        themen: entwurf.themen,
        format: entwurf.format,
        typ: entwurf.typ,
        dauer_sekunden: entwurf.dauer_sekunden,
        breite: entwurf.breite,
        hoehe: entwurf.hoehe,
        hochgeladen_von: user?.id ?? null,
      });
      entwurfAendern(entwurf.key, { status: 'fertig' });
      queryClient.invalidateQueries({ queryKey: ['social_assets'] });
      toast({ title: 'Upload abgeschlossen', description: entwurf.titel.trim() });
      // Fertige Karte nach kurzer Bestätigung ausblenden
      window.setTimeout(() => entwurfEntfernen(entwurf.key), 2500);
    } catch (e) {
      entwurfAendern(entwurf.key, {
        status: 'fehler',
        fehler: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const alleOffenen = entwuerfe.filter((e) => e.status === 'offen' && e.titel.trim());
  const alleHochladen = async () => {
    // Sequentiell, damit große Videos einander nicht die Bandbreite nehmen
    for (const e of alleOffenen) await hochladen(e);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Medien-Bibliothek"
        description="Einmal filmen, verschlagworten, immer wieder verwenden — Clips und Bilder für Social-Media-Posts"
      />
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* ─── Upload-Zone ─── */}
        {canEdit && (
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragAktiv ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragAktiv(true);
            }}
            onDragLeave={() => setDragAktiv(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragAktiv(false);
              dateienAnnehmen(e.dataTransfer.files);
            }}
          >
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-foreground">
              Videos oder Bilder hierher ziehen
            </p>
            <p className="text-xs text-muted-foreground">
              oder{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => dateiInputRef.current?.click()}
              >
                Dateien auswählen
              </button>{' '}
              — Mehrfachauswahl möglich
            </p>
            <input
              ref={dateiInputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) dateienAnnehmen(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* ─── Metadaten-Formulare je gewählter Datei ─── */}
        {entwuerfe.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Vorbereitete Uploads ({entwuerfe.length})
              </h3>
              {alleOffenen.length > 1 && (
                <Button size="sm" variant="outline" onClick={alleHochladen}>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Alle mit Titel hochladen ({alleOffenen.length})
                </Button>
              )}
            </div>
            {entwuerfe.map((e) => (
              <UploadEntwurfKarte
                key={e.key}
                entwurf={e}
                onAendern={(patch) => entwurfAendern(e.key, patch)}
                onEntfernen={() => entwurfEntfernen(e.key)}
                onHochladen={() => hochladen(e)}
              />
            ))}
          </div>
        )}

        {/* ─── Filter ─── */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Titel, Outfit, Kulisse oder Schlagwort suchen …"
                className="pl-8"
              />
            </div>
            <Select value={filterTyp} onValueChange={(v) => setFilterTyp(v as 'alle' | AssetTyp)}>
              <SelectTrigger className="w-32 bg-muted border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Typen</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="bild">Bilder</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterFormat}
              onValueChange={(v) => setFilterFormat(v as 'alle' | AssetFormat)}
            >
              <SelectTrigger className="w-40 bg-muted border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Formate</SelectItem>
                {(Object.keys(FORMAT_LABELS) as AssetFormat[]).map((f) => (
                  <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterThema} onValueChange={setFilterThema}>
              <SelectTrigger className="w-44 bg-muted border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Schlagworte</SelectItem>
                {alleThemen.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* ─── Bibliothek ─── */}
        {assetsLaden ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : assetsFehler ? (
          // Ehrlich unterscheiden: "Bibliothek leer" ist etwas anderes als "Laden fehlgeschlagen"
          // (z. B. Migration 20260719_social_medien.sql noch nicht eingespielt).
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-6 flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Medien konnten nicht geladen werden.</p>
                <p className="text-muted-foreground break-words">
                  {assetsFehler instanceof Error ? assetsFehler.message : String(assetsFehler)}
                </p>
                <p className="text-muted-foreground">
                  Falls die Tabelle social_assets fehlt: Migration 20260719_social_medien.sql einspielen.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (assets ?? []).length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center">
              <Clapperboard className="h-8 w-8 text-muted-foreground" />
              <CardTitle className="text-base">Die Bibliothek ist noch leer</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground pb-8 max-w-md mx-auto">
              {canEdit
                ? 'Laden Sie die ersten Clips oder Bilder hoch — z. B. die Aufnahmen von Christina in verschiedenen Outfits. Gut verschlagwortet lassen sie sich danach immer wieder Posts zuordnen.'
                : 'Es wurden noch keine Medien hochgeladen. Das Hochladen ist Administratoren vorbehalten.'}
            </CardContent>
          </Card>
        ) : gefiltert.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Kein Asset passt zu den aktuellen Filtern — Suchbegriff oder Filter zurücksetzen.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gefiltert.map((asset) => (
              <AssetKarte key={asset.id} asset={asset} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

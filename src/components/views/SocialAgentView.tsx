/**
 * SocialAgentView.tsx
 *
 * Social-Media-Agent für Mandira — vier Bereiche:
 *  1. Themen:      Quellen-Scan auslösen, destillierte Themenvorschläge mit Quell-Links
 *  2. Entwürfe:    generierte Post-Entwürfe prüfen, freigeben oder ablehnen
 *  3. Freigegeben: Kanal-Übersicht, Texte kopieren, und — nur bei verbundenem
 *     Kanal — Ausspielen per Knopfdruck über die Edge Function social-publish
 *  4. Kalender:    freigegebene Posts zeitlich einplanen (Cron-Worker aus
 *     20260719_social_zeitplan.sql). Ohne verbundenen Kanal bleibt ein Eintrag
 *     ehrlich eine Erinnerung — er wird nicht angestoßen und nie als
 *     'ausgespielt' markiert, solange keine Plattform bestätigt hat.
 *
 * Bewusst NICHT enthalten (Konstruktionsentscheidung, kein fehlendes Feature):
 * kein Auto-Publish, keine Analytics, kein Tenant-System.
 * Jeder Text verlässt das Haus nur über eine protokollierte menschliche
 * Freigabe. "Veröffentlicht" heißt: die Plattform hat mit einer Post-ID
 * geantwortet — nie vorher. Unverbundene Kanäle werden ehrlich als solche
 * gezeigt; bis zur Freischaltung ist "Text kopieren" der Hauptweg.
 *
 * Ehrliche Statusanzeige: Endet ein Scan mit 'keine_daten', wird das als
 * deutliche Warnung gezeigt — es wurden bewusst keine Themen erfunden.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  RadioTower,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  X,
  Trash2,
  FileWarning,
  Megaphone,
  ClipboardCheck,
  Send,
  PlugZap,
  Clapperboard,
  Plus,
  CalendarDays,
} from 'lucide-react';
import {
  starteTrendScan,
  ladeLetztenScan,
  ladeThemen,
  ladeQuellenZuThema,
  generierePosts,
  ladePostsZurPruefung,
  gibPostFrei,
  lehnePostAb,
  verwerfeThema,
  ladeKanaele,
  postAusspielen,
  ladeAusspielVersuche,
  ladeZeitplan,
  postEinplanen,
  planungAbbrechen,
  SOCIAL_PLATTFORMEN,
  SOCIAL_TONALITAETEN,
  SOCIAL_SENDEZEITEN,
  type SocialTopic,
  type SocialPostReview,
  type SocialChannel,
  type SocialZeitplanEintrag,
} from '@/lib/socialAgent';
import {
  ladeAssetsZuPost,
  vorschlageAssets,
  assetZuPostZuordnen,
  assetVonPostLoesen,
  type SocialAsset,
} from '@/lib/socialMedien';
import { AssetVorschau } from '@/components/views/MedienBibliothekView';

// ─── Helfer ──────────────────────────────────────────────────────────────────

const QUELLEN_LABELS: Record<string, string> = {
  google_news: 'Google News',
  pubmed: 'PubMed',
  reddit: 'Reddit',
};

const SCAN_STATUS_LABELS: Record<string, string> = {
  laeuft: 'läuft …',
  erfolg: 'Erfolg',
  keine_daten: 'Keine Daten',
  fehler: 'Fehler',
};

function formatZeitpunkt(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function plattformLabel(id: string): string {
  return SOCIAL_PLATTFORMEN.find((p) => p.id === id)?.label ?? id;
}

function plattformMaxChars(id: string): number | null {
  return SOCIAL_PLATTFORMEN.find((p) => p.id === id)?.maxChars ?? null;
}

function relevanzBadgeVariant(relevanz: string): 'default' | 'secondary' | 'outline' {
  if (relevanz === 'hoch') return 'default';
  if (relevanz === 'mittel') return 'secondary';
  return 'outline';
}

/** Badge, das einen Post/ein Thema ohne Quellenbeleg deutlich kenntlich macht. */
function OhneQuellenbelegBadge() {
  return (
    <Badge variant="outline" className="border-destructive/50 text-destructive gap-1">
      <FileWarning className="h-3 w-3" />
      ohne Quellenbeleg
    </Badge>
  );
}

/**
 * Liste der Quellen-Links eines Posts. Wird überall dort gezeigt, wo der
 * Post-Text zu sehen ist — insbesondere auch vor dem Ausspielen, damit
 * jederzeit prüfbar bleibt, worauf sich der Text stützt.
 */
function QuellenListe({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Quellen</p>
      {urls.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline break-all"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          {url}
        </a>
      ))}
    </div>
  );
}

// ─── Themen-Karte ────────────────────────────────────────────────────────────

function ThemaKarte({ topic, canEdit }: { topic: SocialTopic; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [aufgeklappt, setAufgeklappt] = useState(false);
  const [gewaehltePlattformen, setGewaehltePlattformen] = useState<string[]>(['linkedin', 'instagram']);
  const [tonalitaet, setTonalitaet] = useState<string>('reflective');

  // Quellen immer laden (nicht erst beim Aufklappen): das "ohne Quellenbeleg"-Badge
  // muss ohne Interaktion sichtbar sein.
  const { data: quellen, isLoading: quellenLaden } = useQuery({
    queryKey: ['social_topic_sources', topic.id],
    queryFn: () => ladeQuellenZuThema(topic.id),
  });

  const generierenMutation = useMutation({
    // erstellt_von setzt die Edge Function aus dem verifizierten JWT — keine Nutzer-ID im Body.
    mutationFn: () => generierePosts(topic.id, gewaehltePlattformen, tonalitaet),
    onSuccess: (ergebnis) => {
      queryClient.invalidateQueries({ queryKey: ['social_posts_review'] });
      queryClient.invalidateQueries({ queryKey: ['social_topics'] });
      if (ergebnis.posts.length > 0) {
        toast({
          title: `${ergebnis.posts.length} Entwurf${ergebnis.posts.length === 1 ? '' : 'e'} erzeugt`,
          description: ergebnis.posts.map((p) => plattformLabel(p.plattform)).join(', '),
        });
      }
      if (ergebnis.fehler.length > 0) {
        toast({
          title: 'Nicht alle Entwürfe konnten erzeugt werden',
          description: ergebnis.fehler
            .map((f) => `${plattformLabel(f.plattform)}: ${f.meldung}`)
            .join(' — '),
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Entwurf-Erzeugung fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const verwerfenMutation = useMutation({
    mutationFn: () => verwerfeThema(topic.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_topics'] });
      toast({ title: 'Thema verworfen' });
    },
    onError: (e: Error) => {
      toast({ title: 'Verwerfen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const togglePlattform = (id: string) => {
    setGewaehltePlattformen((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const ohneQuellen = !quellenLaden && (quellen?.length ?? 0) === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base leading-snug">{topic.thema}</CardTitle>
            {topic.aufhaenger && (
              <p className="text-sm text-muted-foreground">{topic.aufhaenger}</p>
            )}
          </div>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => verwerfenMutation.mutate()}
              disabled={verwerfenMutation.isPending}
              title="Thema verwerfen"
            >
              {verwerfenMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {topic.kategorie && <Badge variant="secondary">{topic.kategorie}</Badge>}
          <Badge variant={relevanzBadgeVariant(topic.relevanz)}>Relevanz: {topic.relevanz}</Badge>
          {ohneQuellen && <OhneQuellenbelegBadge />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quell-Artikel (Provenienz) */}
        <div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
            onClick={() => setAufgeklappt((v) => !v)}
          >
            {aufgeklappt ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Quell-Artikel
            {quellenLaden
              ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              : <span className="text-muted-foreground">({quellen?.length ?? 0})</span>}
          </button>
          {aufgeklappt && (
            <div className="mt-2 space-y-2 pl-5">
              {quellenLaden && (
                <p className="text-sm text-muted-foreground">Quellen werden geladen …</p>
              )}
              {!quellenLaden && ohneQuellen && (
                <p className="text-sm text-destructive">
                  Zu diesem Thema sind keine Quell-Artikel verknüpft. Entwürfe entstehen dann ohne
                  Studien- oder Zahlenbezug.
                </p>
              )}
              {(quellen ?? []).map((q) => (
                <div key={q.id} className="text-sm border-l-2 border-border pl-3 py-0.5">
                  <a
                    href={q.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-primary hover:underline"
                  >
                    <span>{q.titel}</span>
                    <ExternalLink className="h-3 w-3 mt-1 shrink-0" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {QUELLEN_LABELS[q.quelle] ?? q.quelle}
                    {q.quelle_label ? ` · ${q.quelle_label}` : ''}
                    {q.veroeffentlicht_am ? ` · ${formatZeitpunkt(q.veroeffentlicht_am)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entwurf-Erzeugung */}
        {canEdit && (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SOCIAL_PLATTFORMEN.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={gewaehltePlattformen.includes(p.id)}
                    onCheckedChange={() => togglePlattform(p.id)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tonalitaet} onValueChange={setTonalitaet}>
                <SelectTrigger className="w-56 bg-muted border-border text-sm">
                  <SelectValue placeholder="Tonalität" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_TONALITAETEN.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => generierenMutation.mutate()}
                disabled={generierenMutation.isPending || gewaehltePlattformen.length === 0}
              >
                {generierenMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Entwürfe werden erzeugt …
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Entwürfe erzeugen
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Medien (Assets aus der Bibliothek) ──────────────────────────────────────

/** Kleine Asset-Kachel für die Post-Karten (Vorschau über signierte URL). */
function MedienKachel({
  asset,
  aktion,
}: {
  asset: SocialAsset;
  aktion?: { label: string; icon: 'plus' | 'x'; onClick: () => void; laeuft: boolean };
}) {
  return (
    <div className="w-36 shrink-0 rounded-md border border-border overflow-hidden bg-muted/20">
      <AssetVorschau asset={asset} klein />
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium leading-snug line-clamp-2">{asset.titel}</p>
        <p className="text-[10px] text-muted-foreground">
          {asset.typ === 'video' ? 'Video' : 'Bild'}
          {asset.format ? ` · ${asset.format}` : ''} · {asset.verwendet_zaehler}× verwendet
        </p>
        {aktion && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={aktion.onClick}
            disabled={aktion.laeuft}
          >
            {aktion.laeuft ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : aktion.icon === 'plus' ? (
              <Plus className="h-3 w-3 mr-1" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            {aktion.label}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Medien-Bereich eines Posts: zugeordnete Assets plus — nur solange bearbeitet
 * werden darf — Vorschläge aus der Bibliothek. Die Vorschläge sind eine reine,
 * erklärbare Sortier-Heuristik (Schlagwort-Überschneidung, Plattform-Format,
 * selten Verwendetes zuerst) — kein KI-Aufruf.
 */
function PostMedien({ post, canEdit }: { post: SocialPostReview; canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: zugeordnet, isLoading: zugeordnetLaedt } = useQuery({
    queryKey: ['social_post_assets', post.id],
    queryFn: () => ladeAssetsZuPost(post.id),
  });

  const { data: vorschlaege, isLoading: vorschlaegeLaden } = useQuery({
    queryKey: ['social_asset_vorschlaege', post.id],
    queryFn: () =>
      vorschlageAssets({ plattform: post.plattform, kategorie: post.kategorie, thema: post.thema }),
    enabled: canEdit,
  });

  const neuLaden = () => {
    queryClient.invalidateQueries({ queryKey: ['social_post_assets', post.id] });
    queryClient.invalidateQueries({ queryKey: ['social_asset_vorschlaege'] });
    queryClient.invalidateQueries({ queryKey: ['social_assets'] });
  };

  const zuordnenMutation = useMutation({
    mutationFn: (assetId: string) => assetZuPostZuordnen(post.id, assetId),
    onSuccess: () => {
      neuLaden();
      toast({ title: 'Medium zugeordnet' });
    },
    onError: (e: Error) => {
      toast({ title: 'Zuordnen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const loesenMutation = useMutation({
    mutationFn: (assetId: string) => assetVonPostLoesen(post.id, assetId),
    onSuccess: () => {
      neuLaden();
      toast({ title: 'Zuordnung gelöst' });
    },
    onError: (e: Error) => {
      toast({ title: 'Lösen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const zugeordneteIds = new Set((zugeordnet ?? []).map((a) => a.id));
  const offeneVorschlaege = (vorschlaege ?? []).filter((a) => !zugeordneteIds.has(a.id));

  // Nur-Lese-Ansicht (z. B. Tab „Freigegeben"): ohne Zuordnung keinen leeren Block zeigen
  if (!canEdit && !zugeordnetLaedt && (zugeordnet ?? []).length === 0) return null;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Clapperboard className="h-3.5 w-3.5" />
        Medien
      </p>

      {zugeordnetLaedt ? (
        <p className="text-xs text-muted-foreground">Zugeordnete Medien werden geladen …</p>
      ) : (zugeordnet ?? []).length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(zugeordnet ?? []).map((asset) => (
            <MedienKachel
              key={asset.id}
              asset={asset}
              aktion={
                canEdit
                  ? {
                      label: 'Lösen',
                      icon: 'x',
                      onClick: () => loesenMutation.mutate(asset.id),
                      laeuft: loesenMutation.isPending,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Noch kein Medium zugeordnet.</p>
      )}

      {canEdit && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Vorschläge aus der Bibliothek (Schlagwort-Überschneidung, passendes Format, selten Verwendetes zuerst):
          </p>
          {vorschlaegeLaden ? (
            <p className="text-xs text-muted-foreground">Vorschläge werden geladen …</p>
          ) : offeneVorschlaege.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {(vorschlaege ?? []).length === 0
                ? 'Die Medien-Bibliothek enthält keine aktiven Assets — zuerst dort Clips oder Bilder hochladen.'
                : 'Alle vorgeschlagenen Assets sind bereits zugeordnet.'}
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {offeneVorschlaege.map((asset) => (
                <MedienKachel
                  key={asset.id}
                  asset={asset}
                  aktion={{
                    label: 'Zuordnen',
                    icon: 'plus',
                    onClick: () => zuordnenMutation.mutate(asset.id),
                    laeuft: zuordnenMutation.isPending,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Entwurf-Karte ───────────────────────────────────────────────────────────

function EntwurfKarte({ post, canEdit }: { post: SocialPostReview; canEdit: boolean }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [ablehnenOffen, setAblehnenOffen] = useState(false);
  const [ablehnungsgrund, setAblehnungsgrund] = useState('');

  const freigebenMutation = useMutation({
    // Die freigebende Identität stempelt die Datenbank (Trigger social_posts_status_wache),
    // nicht der Client — deshalb wird hier keine Nutzer-ID mitgegeben.
    mutationFn: () => gibPostFrei(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts_review'] });
      toast({ title: 'Post freigegeben', description: `${plattformLabel(post.plattform)} — bereit zum manuellen Ausspielen.` });
    },
    onError: (e: Error) => {
      toast({ title: 'Freigabe fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const ablehnenMutation = useMutation({
    mutationFn: () => lehnePostAb(post.id, ablehnungsgrund.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_posts_review'] });
      toast({ title: 'Post abgelehnt' });
      setAblehnenOffen(false);
      setAblehnungsgrund('');
    },
    onError: (e: Error) => {
      toast({ title: 'Ablehnen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(post.inhalt);
      toast({ title: 'Text kopiert', description: `${plattformLabel(post.plattform)}-Entwurf in der Zwischenablage.` });
    } catch {
      toast({ title: 'Kopieren fehlgeschlagen', description: 'Zwischenablage nicht verfügbar.', variant: 'destructive' });
    }
  };

  const maxChars = plattformMaxChars(post.plattform);
  const tonLabel = SOCIAL_TONALITAETEN.find((t) => t.id === post.tonalitaet)?.label;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{plattformLabel(post.plattform)}</Badge>
          <span className="text-xs text-muted-foreground">
            {post.inhalt.length.toLocaleString('de-AT')}{maxChars ? ` / ${maxChars.toLocaleString('de-AT')}` : ''} Zeichen
          </span>
          {tonLabel && <Badge variant="outline">{tonLabel}</Badge>}
          {!post.hat_quellenbeleg && <OhneQuellenbelegBadge />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-muted/30 border border-border p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {post.inhalt}
        </div>

        <QuellenListe urls={post.quellen_urls} />

        {/* Medien: zuordnen/lösen nur im Entwurf, die Freigabe-Logik bleibt unberührt */}
        <PostMedien post={post} canEdit={canEdit} />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={kopieren}>
            <Copy className="h-4 w-4 mr-2" />
            Text kopieren
          </Button>
          {canEdit && (
            <>
              <Button
                size="sm"
                onClick={() => freigebenMutation.mutate()}
                disabled={freigebenMutation.isPending}
              >
                {freigebenMutation.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Check className="h-4 w-4 mr-2" />}
                Freigeben
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setAblehnenOffen((v) => !v)}
              >
                <X className="h-4 w-4 mr-2" />
                Ablehnen
              </Button>
            </>
          )}
        </div>

        {canEdit && ablehnenOffen && (
          <div className="space-y-2 border-t border-border pt-3">
            <Textarea
              placeholder="Grund der Ablehnung (optional, hilft bei künftigen Entwürfen)"
              value={ablehnungsgrund}
              onChange={(e) => setAblehnungsgrund(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => ablehnenMutation.mutate()}
                disabled={ablehnenMutation.isPending}
              >
                {ablehnenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Ablehnung bestätigen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setAblehnenOffen(false); setAblehnungsgrund(''); }}>
                Abbrechen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Kanal-Übersicht ─────────────────────────────────────────────────────────

/** Zeigt ehrlich, welche der sechs Plattformen verbunden sind — ohne Beschönigung. */
function KanalUebersicht({ kanaele, laedt }: { kanaele: SocialChannel[] | undefined; laedt: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <PlugZap className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Kanäle</p>
        </div>
        {laedt ? (
          <p className="text-sm text-muted-foreground">Wird geladen …</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATTFORMEN.map((p) => {
              const kanal = kanaele?.find((k) => k.plattform === p.id);
              const verbunden = kanal?.verbunden ?? false;
              return (
                <Badge
                  key={p.id}
                  variant={verbunden ? 'secondary' : 'outline'}
                  className={verbunden ? '' : 'text-muted-foreground'}
                >
                  {p.label}: {verbunden ? 'verbunden' : 'nicht verbunden'}
                </Badge>
              );
            })}
          </div>
        )}
        {!laedt && !(kanaele ?? []).some((k) => k.verbunden) && (
          <p className="text-xs text-muted-foreground mt-2">
            Noch kein Kanal verbunden — die Plattform-Zugänge müssen erst beantragt und als
            Supabase-Secrets hinterlegt werden (Anleitung: supabase/functions/social-publish/EINRICHTUNG.md).
            Bis dahin ist „Text kopieren" der Weg nach draußen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Freigegeben-Karte ───────────────────────────────────────────────────────

function FreigegebenKarte({
  post,
  kanal,
  canEdit,
}: {
  post: SocialPostReview;
  kanal: SocialChannel | undefined;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Protokoll der Ausspielversuche: liefert den Link bei Erfolg und die
  // echte Fehlermeldung bei Fehlschlag — keine generischen Meldungen.
  const { data: versuche } = useQuery({
    queryKey: ['social_publish_attempts', post.id],
    queryFn: () => ladeAusspielVersuche(post.id),
  });
  const erfolgreicherVersuch = (versuche ?? []).find((v) => v.erfolg);
  const letzterVersuch = (versuche ?? [])[0];

  const ausspielenMutation = useMutation({
    mutationFn: () => {
      // Vorprüfung für eine klare Meldung — verifiziert wird die Identität
      // serverseitig aus dem JWT (siehe social-publish).
      if (!user?.id) throw new Error('Kein angemeldeter Nutzer — Ausspielen nicht möglich.');
      return postAusspielen(post.id);
    },
    onSuccess: (ergebnis) => {
      queryClient.invalidateQueries({ queryKey: ['social_posts_review'] });
      queryClient.invalidateQueries({ queryKey: ['social_publish_attempts', post.id] });
      if (ergebnis.erfolg) {
        toast({ title: 'Veröffentlicht', description: ergebnis.meldung });
      } else {
        // Die echte Meldung der Function/Plattform zeigen, kein "irgendwas ging schief".
        toast({ title: 'Ausspielen fehlgeschlagen', description: ergebnis.meldung, variant: 'destructive' });
      }
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ['social_publish_attempts', post.id] });
      toast({ title: 'Ausspielen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(post.inhalt);
      toast({ title: 'Text kopiert', description: `${plattformLabel(post.plattform)}-Text in der Zwischenablage.` });
    } catch {
      toast({ title: 'Kopieren fehlgeschlagen', description: 'Zwischenablage nicht verfügbar.', variant: 'destructive' });
    }
  };

  const kanalVerbunden = kanal?.verbunden ?? false;
  const istVeroeffentlicht = post.status === 'veroeffentlicht';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{plattformLabel(post.plattform)}</Badge>
          <Badge variant={istVeroeffentlicht ? 'secondary' : 'outline'}>
            {istVeroeffentlicht ? 'Veröffentlicht' : 'Freigegeben'}
          </Badge>
          {/* Auch hier — direkt vor dem Ausspielen — sichtbar machen, wenn der
              Text ohne Studien-/Quellenbezug entstanden ist. */}
          {!post.hat_quellenbeleg && <OhneQuellenbelegBadge />}
          <span className="text-xs text-muted-foreground">
            Freigabe: {formatZeitpunkt(post.freigegeben_am)}
          </span>
          {post.thema && (
            <span className="text-xs text-muted-foreground truncate">— {post.thema}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md bg-muted/30 border border-border p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {post.inhalt}
        </div>

        <QuellenListe urls={post.quellen_urls} />

        {/* Bestätigter Erfolg: Link zum veröffentlichten Post (aus dem Protokoll) */}
        {erfolgreicherVersuch && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
            <p className="font-medium">
              Veröffentlicht am {formatZeitpunkt(erfolgreicherVersuch.versucht_am)}
              {erfolgreicherVersuch.externe_id ? ` (ID ${erfolgreicherVersuch.externe_id})` : ''}
            </p>
            {erfolgreicherVersuch.externe_url && (
              <a
                href={erfolgreicherVersuch.externe_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {erfolgreicherVersuch.externe_url}
              </a>
            )}
          </div>
        )}

        {/* Letzter Fehlschlag: die echte Fehlermeldung, diagnostizierbar */}
        {!erfolgreicherVersuch && letzterVersuch && !letzterVersuch.erfolg && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm space-y-1">
            <p className="font-medium text-destructive">
              Letzter Ausspielversuch fehlgeschlagen ({formatZeitpunkt(letzterVersuch.versucht_am)}
              {letzterVersuch.http_status ? `, HTTP ${letzterVersuch.http_status}` : ''})
            </p>
            <p className="text-muted-foreground break-words">
              {letzterVersuch.fehlermeldung ?? 'Keine Fehlermeldung protokolliert.'}
            </p>
          </div>
        )}

        {/* Zugeordnete Medien (nur Anzeige — nach der Freigabe wird nichts mehr umgehängt) */}
        <PostMedien post={post} canEdit={false} />

        <div className="flex flex-wrap items-center gap-2">
          {/* Bis zur Freischaltung der Kanäle der Hauptweg nach draußen */}
          <Button variant="outline" size="sm" onClick={kopieren}>
            <Copy className="h-4 w-4 mr-2" />
            Text kopieren
          </Button>
          {canEdit && !istVeroeffentlicht && (
            <span title={kanalVerbunden ? undefined : 'Kanal nicht verbunden'}>
              <Button
                size="sm"
                onClick={() => ausspielenMutation.mutate()}
                disabled={!kanalVerbunden || ausspielenMutation.isPending}
              >
                {ausspielenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Auf {plattformLabel(post.plattform)} ausspielen
              </Button>
            </span>
          )}
          {canEdit && !istVeroeffentlicht && !kanalVerbunden && (
            <span className="text-xs text-muted-foreground">Kanal nicht verbunden</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kalender (Zeitplan) ─────────────────────────────────────────────────────

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Lokaler Tagesschlüssel YYYY-MM-DD (bewusst nicht UTC — der Kalender zeigt Ortszeit). */
function tagKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatUhrzeit(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

const ZEITPLAN_STATUS_LABELS: Record<SocialZeitplanEintrag['status'], string> = {
  geplant: 'geplant',
  ausgespielt: 'ausgespielt',
  fehlgeschlagen: 'fehlgeschlagen',
  abgebrochen: 'abgebrochen',
};

/** Ehrliches Status-Badge eines Zeitplan-Eintrags — inkl. "angestoßen, unbestätigt". */
function ZeitplanStatusBadge({ eintrag }: { eintrag: SocialZeitplanEintrag }) {
  if (eintrag.status === 'geplant' && eintrag.angestossen_marker) {
    // Der Cron-Worker hat social-publish angestoßen, aber es kam (noch) kein
    // bestätigtes Ergebnis zurück — das wird nicht als Erfolg verkauft.
    return (
      <Badge variant="outline" className="border-destructive/50 text-destructive">
        angestoßen, unbestätigt
      </Badge>
    );
  }
  const variant =
    eintrag.status === 'ausgespielt' ? 'secondary'
    : eintrag.status === 'fehlgeschlagen' ? 'destructive'
    : 'outline';
  return <Badge variant={variant}>{ZEITPLAN_STATUS_LABELS[eintrag.status]}</Badge>;
}

/**
 * Dialog zum Einplanen eines freigegebenen Posts: Datum + Uhrzeit, vorbelegt
 * mit den guten Sendezeiten der Plattform aus dem Prototyp — als Vorschlag,
 * frei änderbar.
 */
function EinplanenDialog({
  post,
  offen,
  onOffenChange,
}: {
  post: SocialPostReview;
  offen: boolean;
  onOffenChange: (offen: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const vorschlag = SOCIAL_SENDEZEITEN[post.plattform];

  // Vorbelegung: nächster "guter" Wochentag der Plattform, erste gute Uhrzeit
  const [start] = useState(() => {
    const heute = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(heute);
      d.setDate(heute.getDate() + i);
      if (!vorschlag || vorschlag.tage.includes(WOCHENTAGE_KURZ[d.getDay()])) {
        return { datum: tagKey(d), uhrzeit: vorschlag?.zeiten[0] ?? '09:00' };
      }
    }
    const morgen = new Date(heute);
    morgen.setDate(heute.getDate() + 1);
    return { datum: tagKey(morgen), uhrzeit: '09:00' };
  });
  const [datum, setDatum] = useState(start.datum);
  const [uhrzeit, setUhrzeit] = useState(start.uhrzeit);

  const einplanenMutation = useMutation({
    mutationFn: () => {
      const zeitpunkt = new Date(`${datum}T${uhrzeit}`);
      if (!datum || !uhrzeit || isNaN(zeitpunkt.getTime())) {
        throw new Error('Bitte Datum und Uhrzeit angeben.');
      }
      return postEinplanen(post.id, zeitpunkt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_zeitplan'] });
      toast({
        title: 'Eingeplant',
        description: `${plattformLabel(post.plattform)} am ${new Date(`${datum}T${uhrzeit}`).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}. Ausgespielt wird nur über einen verbundenen Kanal.`,
      });
      onOffenChange(false);
    },
    onError: (e: Error) => {
      toast({ title: 'Einplanen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={offen} onOpenChange={onOffenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post einplanen — {plattformLabel(post.plattform)}</DialogTitle>
          <DialogDescription>
            Der Zeitplan-Job prüft alle 15 Minuten auf fällige Einträge. Ohne verbundenen
            Kanal bleibt der Eintrag eine Erinnerung und wird nicht ausgespielt.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`datum-${post.id}`}>Datum</Label>
              <Input
                id={`datum-${post.id}`}
                type="date"
                value={datum}
                min={tagKey(new Date())}
                onChange={(e) => setDatum(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`uhrzeit-${post.id}`}>Uhrzeit</Label>
              <Input
                id={`uhrzeit-${post.id}`}
                type="time"
                value={uhrzeit}
                onChange={(e) => setUhrzeit(e.target.value)}
              />
            </div>
          </div>
          {vorschlag && (
            <div className="space-y-1.5 text-sm">
              <p className="text-xs text-muted-foreground">
                Gute Sendezeiten für {plattformLabel(post.plattform)} (Vorschlag, kein Zwang) —
                Tage: {vorschlag.tage.join(', ')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {vorschlag.zeiten.map((z) => (
                  <Button
                    key={z}
                    type="button"
                    variant={uhrzeit === z ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setUhrzeit(z)}
                  >
                    {z}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOffenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => einplanenMutation.mutate()}
            disabled={einplanenMutation.isPending}
          >
            {einplanenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Einplanen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ein freigegebener, noch nicht eingeplanter Post in der Seitenliste des Kalenders. */
function EinplanbarerPost({ post, canEdit }: { post: SocialPostReview; canEdit: boolean }) {
  const [dialogOffen, setDialogOffen] = useState(false);
  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{plattformLabel(post.plattform)}</Badge>
        {/* Warnung auch beim Einplanen sichtbar — hier wird über das Ausspielen entschieden. */}
        {!post.hat_quellenbeleg && <OhneQuellenbelegBadge />}
        {post.thema && (
          <span className="text-xs text-muted-foreground truncate">{post.thema}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
        {post.inhalt}
      </p>
      <QuellenListe urls={post.quellen_urls} />
      {canEdit && (
        <>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOffen(true)}>
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Einplanen
          </Button>
          {dialogOffen && (
            <EinplanenDialog post={post} offen={dialogOffen} onOffenChange={setDialogOffen} />
          )}
        </>
      )}
    </div>
  );
}

/** Ein Zeitplan-Eintrag in der Tages-/Überfällig-Liste. */
function ZeitplanEintragZeile({
  eintrag,
  canEdit,
}: {
  eintrag: SocialZeitplanEintrag;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const abbrechenMutation = useMutation({
    mutationFn: () => planungAbbrechen(eintrag.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social_zeitplan'] });
      toast({ title: 'Planung abgebrochen' });
    },
    onError: (e: Error) => {
      toast({ title: 'Abbrechen fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const plattform = eintrag.plattform ?? eintrag.post?.plattform ?? '?';
  // Post wurde inzwischen anderweitig (manuell) veröffentlicht — der Worker
  // überspringt den Eintrag dann; das hier sichtbar machen statt zu schweigen.
  const postSchonVeroeffentlicht =
    eintrag.status === 'geplant' && eintrag.post?.status === 'veroeffentlicht';

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium">{formatUhrzeit(eintrag.geplant_fuer)}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{plattformLabel(plattform)}</Badge>
          <ZeitplanStatusBadge eintrag={eintrag} />
        </div>
        {eintrag.post ? (
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {eintrag.post.inhalt}
          </p>
        ) : (
          <p className="text-xs text-destructive">Zugehöriger Post wurde gelöscht.</p>
        )}
        {postSchonVeroeffentlicht && (
          <p className="text-[10px] text-muted-foreground">
            Post wurde bereits anderweitig veröffentlicht — dieser Eintrag wird nicht ausgespielt.
          </p>
        )}
      </div>
      {canEdit && eintrag.status === 'geplant' && !eintrag.angestossen_marker && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => abbrechenMutation.mutate()}
          disabled={abbrechenMutation.isPending}
          title="Planung abbrechen"
        >
          {abbrechenMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <X className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}

/** Kalender-Tab: 14-Tage-Wochenansicht + Liste einplanbarer freigegebener Posts. */
function KalenderTab({
  zeitplan,
  zeitplanLaedt,
  freigegebene,
  kanaele,
  canEdit,
}: {
  zeitplan: SocialZeitplanEintrag[] | undefined;
  zeitplanLaedt: boolean;
  freigegebene: SocialPostReview[];
  kanaele: SocialChannel[] | undefined;
  canEdit: boolean;
}) {
  const eintraege = zeitplan ?? [];
  const verbundene = (kanaele ?? []).filter((k) => k.verbunden);

  // Posts, die bereits einen aktiven Zeitplan-Eintrag haben, nicht erneut anbieten
  const eingeplantePostIds = new Set(
    eintraege.filter((e) => e.status === 'geplant' || e.status === 'ausgespielt').map((e) => e.post_id),
  );
  const einplanbare = freigegebene.filter(
    (p) => p.status === 'freigegeben' && !eingeplantePostIds.has(p.id),
  );

  // Die nächsten 14 Tage, je Tag die Einträge (Abgebrochene ausgeblendet)
  const heuteStart = new Date();
  heuteStart.setHours(0, 0, 0, 0);
  const tage = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(heuteStart);
    d.setDate(heuteStart.getDate() + i);
    return d;
  });
  const proTag = new Map<string, SocialZeitplanEintrag[]>();
  for (const e of eintraege) {
    if (e.status === 'abgebrochen') continue;
    const key = tagKey(new Date(e.geplant_fuer));
    proTag.set(key, [...(proTag.get(key) ?? []), e]);
  }

  // Fällige Einträge vor heute, die nie bestätigt ausgespielt wurden — ehrlich zeigen
  const ueberfaellige = eintraege.filter(
    (e) => e.status === 'geplant' && new Date(e.geplant_fuer) < heuteStart,
  );

  return (
    <div className="space-y-4">
      {/* Ehrlicher Hinweis auf die Voraussetzung */}
      <Card className={verbundene.length === 0 ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/30'}>
        <CardContent className="p-4 flex gap-3 text-sm">
          <AlertTriangle
            className={`h-5 w-5 shrink-0 mt-0.5 ${verbundene.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
          />
          <div className="space-y-1">
            <p className={verbundene.length === 0 ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              Automatisches Ausspielen setzt einen verbundenen Kanal voraus.
              {verbundene.length === 0
                ? ' Derzeit ist kein Kanal verbunden — geplante Einträge bleiben eine Erinnerung und werden nicht angestoßen.'
                : ` Verbunden: ${verbundene.map((k) => plattformLabel(k.plattform)).join(', ')} — nur für diese wird der Zeitplan ausgeführt, alle anderen Einträge bleiben Erinnerungen.`}
            </p>
            <p className="text-xs text-muted-foreground">
              Der Zeitplan-Job läuft alle 15 Minuten und spielt ausschließlich freigegebene Posts aus.
              Ein Eintrag gilt erst als „ausgespielt", wenn die Plattform mit einer Post-ID bestätigt hat.
            </p>
          </div>
        </CardContent>
      </Card>

      {ueberfaellige.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">
              Fällig, aber nicht ausgespielt ({ueberfaellige.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Diese Einträge waren fällig, ohne dass ein Ausspielen bestätigt wurde — meist,
              weil kein Kanal verbunden ist. Sie bleiben als Erinnerung stehen.
            </p>
            {ueberfaellige.map((e) => (
              <ZeitplanEintragZeile key={e.id} eintrag={e} canEdit={canEdit} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Wochenansicht der nächsten 14 Tage */}
        <div className="lg:col-span-2 space-y-2">
          {zeitplanLaedt ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {tage.map((tag) => {
                const key = tagKey(tag);
                const tagesEintraege = (proTag.get(key) ?? []).sort(
                  (a, b) => a.geplant_fuer.localeCompare(b.geplant_fuer),
                );
                const istHeute = key === tagKey(new Date());
                return (
                  <Card key={key} className={istHeute ? 'border-primary/50' : ''}>
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-medium">
                        {WOCHENTAGE_KURZ[tag.getDay()]},{' '}
                        {tag.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                        {istHeute && <span className="text-primary"> · heute</span>}
                      </p>
                      {tagesEintraege.length === 0 ? (
                        <p className="text-xs text-muted-foreground">—</p>
                      ) : (
                        tagesEintraege.map((e) => (
                          <ZeitplanEintragZeile key={e.id} eintrag={e} canEdit={canEdit} />
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Freigegebene, noch nicht eingeplante Posts */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Einplanbar ({einplanbare.length})
          </h3>
          {einplanbare.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground">
                Keine freigegebenen Posts ohne Planung — Freigaben entstehen im Reiter „Entwürfe".
              </CardContent>
            </Card>
          ) : (
            einplanbare.map((post) => (
              <EinplanbarerPost key={post.id} post={post} canEdit={canEdit} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hauptview ───────────────────────────────────────────────────────────────

export function SocialAgentView() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const queryClient = useQueryClient();

  const { data: letzterScan, isLoading: scanLaedt } = useQuery({
    queryKey: ['social_letzter_scan'],
    queryFn: ladeLetztenScan,
  });

  const { data: themen, isLoading: themenLaden } = useQuery({
    queryKey: ['social_topics', 'vorgeschlagen'],
    queryFn: () => ladeThemen('vorgeschlagen'),
  });

  const { data: allePosts, isLoading: postsLaden } = useQuery({
    queryKey: ['social_posts_review'],
    queryFn: ladePostsZurPruefung,
  });

  const { data: kanaele, isLoading: kanaeleLaden } = useQuery({
    queryKey: ['social_channels'],
    queryFn: ladeKanaele,
  });

  const { data: zeitplan, isLoading: zeitplanLaedt } = useQuery({
    queryKey: ['social_zeitplan'],
    queryFn: ladeZeitplan,
  });

  const scanMutation = useMutation({
    mutationFn: starteTrendScan,
    onSuccess: (ergebnis) => {
      queryClient.invalidateQueries({ queryKey: ['social_letzter_scan'] });
      queryClient.invalidateQueries({ queryKey: ['social_topics'] });
      if (ergebnis.status === 'erfolg') {
        toast({
          title: 'Scan abgeschlossen',
          description: `${ergebnis.neue_artikel} neue Artikel, ${ergebnis.neue_themen} neue Themenvorschläge.`,
        });
      } else if (ergebnis.status === 'keine_daten') {
        // Ehrliches Ergebnis, kein Erfolg: es wurde bewusst nichts generiert.
        toast({
          title: 'Keine Quellen erreichbar',
          description: 'Es wurden bewusst keine Themen erzeugt. Details in der Scan-Übersicht.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Scan fehlgeschlagen',
          description: ergebnis.fehlermeldung ?? 'Unbekannter Fehler.',
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ['social_letzter_scan'] });
      toast({ title: 'Scan fehlgeschlagen', description: e.message, variant: 'destructive' });
    },
  });

  const entwuerfe = (allePosts ?? []).filter((p) => p.status === 'entwurf');
  const freigegebene = (allePosts ?? []).filter(
    (p) => p.status === 'freigegeben' || p.status === 'veroeffentlicht',
  );

  // Entwürfe nach Thema gruppieren (Reihenfolge: wie geladen, neueste zuerst)
  const entwurfGruppen: { thema: string; posts: SocialPostReview[] }[] = [];
  for (const post of entwuerfe) {
    const thema = post.thema ?? 'Ohne Thema';
    const gruppe = entwurfGruppen.find((g) => g.thema === thema);
    if (gruppe) gruppe.posts.push(post);
    else entwurfGruppen.push({ thema, posts: [post] });
  }

  const scanWarnung =
    letzterScan && (letzterScan.status === 'keine_daten' || letzterScan.status === 'fehler');

  const geplanteAnzahl = (zeitplan ?? []).filter((e) => e.status === 'geplant').length;

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Social Media Agent"
        description="Themen aus echten Quellen — Entwürfe mit Beleg, Freigabe durch Menschen"
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <Tabs defaultValue="themen">
          <TabsList>
            <TabsTrigger value="themen">
              Themen{themen && themen.length > 0 ? ` (${themen.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="entwuerfe">
              Entwürfe{entwuerfe.length > 0 ? ` (${entwuerfe.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="freigegeben">
              Freigegeben{freigegebene.length > 0 ? ` (${freigegebene.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="kalender">
              Kalender{geplanteAnzahl > 0 ? ` (${geplanteAnzahl})` : ''}
            </TabsTrigger>
          </TabsList>

          {/* ─── Tab: Themen ─── */}
          <TabsContent value="themen" className="space-y-4 mt-4">
            {/* Letzter Scan */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Letzter Quellen-Scan</p>
                    {scanLaedt ? (
                      <p className="text-sm text-muted-foreground">Wird geladen …</p>
                    ) : letzterScan ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatZeitpunkt(letzterScan.gestartet_am)}</span>
                        <Badge
                          variant={
                            letzterScan.status === 'erfolg'
                              ? 'secondary'
                              : letzterScan.status === 'laeuft'
                                ? 'outline'
                                : 'destructive'
                          }
                        >
                          {SCAN_STATUS_LABELS[letzterScan.status] ?? letzterScan.status}
                        </Badge>
                        {Object.entries(letzterScan.quellen_stats ?? {}).map(([quelle, anzahl]) => (
                          <span key={quelle} className="text-xs">
                            {QUELLEN_LABELS[quelle] ?? quelle}: {anzahl}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Noch kein Scan gelaufen.</p>
                    )}
                  </div>
                  {canEdit && (
                    <Button
                      onClick={() => scanMutation.mutate()}
                      disabled={scanMutation.isPending}
                    >
                      {scanMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Quellen werden gescannt …
                        </>
                      ) : (
                        <>
                          <RadioTower className="h-4 w-4 mr-2" />
                          Quellen jetzt scannen
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ehrliche Statusanzeige: keine_daten / fehler deutlich machen */}
            {scanWarnung && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-destructive">
                      {letzterScan.status === 'keine_daten'
                        ? 'Keine Quellen erreichbar — es wurden bewusst keine Themen erzeugt.'
                        : 'Der letzte Scan ist mit einem Fehler abgebrochen.'}
                    </p>
                    {letzterScan.fehlermeldung && (
                      <p className="text-muted-foreground break-words">{letzterScan.fehlermeldung}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Themen-Liste */}
            {themenLaden ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (themen ?? []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Noch keine Themen — starten Sie einen Quellen-Scan.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {(themen ?? []).map((topic) => (
                  <ThemaKarte key={topic.id} topic={topic} canEdit={canEdit} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Tab: Entwürfe ─── */}
          <TabsContent value="entwuerfe" className="space-y-6 mt-4">
            {postsLaden ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : entwurfGruppen.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Noch keine Entwürfe — erzeugen Sie welche aus einem Thema im Reiter „Themen".
                </CardContent>
              </Card>
            ) : (
              entwurfGruppen.map((gruppe) => (
                <div key={gruppe.thema} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{gruppe.thema}</h3>
                  {gruppe.posts.map((post) => (
                    <EntwurfKarte key={post.id} post={post} canEdit={canEdit} />
                  ))}
                </div>
              ))
            )}
          </TabsContent>

          {/* ─── Tab: Freigegeben ─── */}
          <TabsContent value="freigegeben" className="space-y-4 mt-4">
            <KanalUebersicht kanaele={kanaele} laedt={kanaeleLaden} />

            <Card className="bg-muted/30">
              <CardContent className="p-4 flex gap-3 text-sm">
                <ClipboardCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Ausspielen per Knopfdruck geht nur über verbundene Kanäle — und gilt erst als
                  veröffentlicht, wenn die Plattform es mit einer Post-ID bestätigt hat.
                  Für unverbundene Kanäle bleibt „Text kopieren" und manuelles Posten der Weg.
                </p>
              </CardContent>
            </Card>

            {postsLaden ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : freigegebene.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Noch keine freigegebenen Posts — Entwürfe warten im Reiter „Entwürfe" auf ihre Prüfung.
                </CardContent>
              </Card>
            ) : (
              freigegebene.map((post) => (
                <FreigegebenKarte
                  key={post.id}
                  post={post}
                  kanal={kanaele?.find((k) => k.plattform === post.plattform)}
                  canEdit={canEdit}
                />
              ))
            )}
          </TabsContent>

          {/* ─── Tab: Kalender ─── */}
          <TabsContent value="kalender" className="mt-4">
            <KalenderTab
              zeitplan={zeitplan}
              zeitplanLaedt={zeitplanLaedt}
              freigegebene={freigegebene}
              kanaele={kanaele}
              canEdit={canEdit}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

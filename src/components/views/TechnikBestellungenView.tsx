// =============================================================================
// Technik-Bestellsystem: Händler-Links, Budget-Tracking, Wareneingangs-Bestätigung
// =============================================================================

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus,
  ShoppingCart,
  Package,
  PackageCheck,
  PackageX,
  ExternalLink,
  Euro,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Store
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// =============================================================================
// TYPEN
// =============================================================================

type Haendler = 'Amazon' | 'Conrad' | 'Hornbach' | 'Bauhaus' | 'Lagerhaus' | 'Sonstiges';
type BestellStatus = 'bestellt' | 'versendet' | 'erhalten' | 'nicht_erhalten' | 'reklamation' | 'storniert';

interface Bestellung {
  id: string;
  bestell_id: string;
  artikel: string;
  artikelnummer: string | null;
  menge: number;
  einzelpreis: number;
  gesamtpreis: number;
  haendler: Haendler;
  haendler_url: string | null;
  bestellt_von: string;
  besteller_name: string;
  besteller_email: string;
  status: BestellStatus;
  bestellt_am: string;
  erwartet_am: string | null;
  erhalten_am: string | null;
  erinnerung_1_gesendet: boolean;
  erinnerung_2_gesendet: boolean;
  wareneingang_bestaetigt_von: string | null;
  wareneingang_notiz: string | null;
  verwendungszweck: string | null;
  notizen: string | null;
  created_at: string;
  updated_at: string;
}

interface MonatsBudget {
  ausgegeben: number;
  budget_limit: number;
  budget_rest: number;
  anzahl_bestellungen: number;
}

// =============================================================================
// KONSTANTEN
// =============================================================================

const BUDGET_LIMIT = 2000;

const HAENDLER_CONFIG: Record<Haendler, { name: string; url: string; icon: string; color: string }> = {
  'Amazon': {
    name: 'Amazon',
    url: 'https://www.amazon.de',
    icon: '📦',
    color: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  'Conrad': {
    name: 'Conrad Electronic',
    url: 'https://www.conrad.at',
    icon: '🔌',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  'Hornbach': {
    name: 'Hornbach',
    url: 'https://www.hornbach.at',
    icon: '🔨',
    color: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  'Bauhaus': {
    name: 'Bauhaus',
    url: 'https://www.bauhaus.at',
    icon: '🏗️',
    color: 'bg-red-100 text-red-800 border-red-300'
  },
  'Lagerhaus': {
    name: 'Lagerhaus',
    url: 'https://www.lagerhaus.at',
    icon: '🌿',
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  'Sonstiges': {
    name: 'Sonstiges',
    url: '',
    icon: '🛒',
    color: 'bg-gray-100 text-gray-800 border-gray-300'
  },
};

const STATUS_CONFIG: Record<BestellStatus, { label: string; color: string; icon: typeof Package }> = {
  'bestellt': { label: 'Bestellt', color: 'bg-blue-100 text-blue-800', icon: ShoppingCart },
  'versendet': { label: 'Versendet', color: 'bg-purple-100 text-purple-800', icon: Truck },
  'erhalten': { label: 'Erhalten', color: 'bg-green-100 text-green-800', icon: PackageCheck },
  'nicht_erhalten': { label: 'Nicht erhalten', color: 'bg-red-100 text-red-800', icon: PackageX },
  'reklamation': { label: 'Reklamation', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  'storniert': { label: 'Storniert', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

// =============================================================================
// HAUPTKOMPONENTE
// =============================================================================

export function TechnikBestellungenView() {
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isConfirmReceiptOpen, setIsConfirmReceiptOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Bestellung | null>(null);
  const [activeTab, setActiveTab] = useState<'offen' | 'alle'>('offen');

  const { toast } = useToast();
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();

  // ---------------------------------------------------------------------------
  // DATEN LADEN
  // ---------------------------------------------------------------------------

  const { data: bestellungen = [], isLoading } = useQuery({
    queryKey: ['technik_bestellungen'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technik_bestellungen')
        .select('*')
        .order('bestellt_am', { ascending: false });
      if (error) throw error;
      return data as Bestellung[];
    },
  });

  const { data: monatsBudget } = useQuery({
    queryKey: ['technik_monatsbudget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technik_aktuelles_monatsbudget')
        .select('*')
        .single();
      if (error) {
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const { data: orders } = await supabase
          .from('technik_bestellungen')
          .select('gesamtpreis')
          .gte('bestellt_am', startOfMonth.toISOString())
          .lte('bestellt_am', endOfMonth.toISOString())
          .neq('status', 'storniert');

        const ausgegeben = orders?.reduce((sum, o) => sum + (o.gesamtpreis || 0), 0) || 0;
        return {
          ausgegeben,
          budget_limit: BUDGET_LIMIT,
          budget_rest: BUDGET_LIMIT - ausgegeben,
          anzahl_bestellungen: orders?.length || 0,
        } as MonatsBudget;
      }
      return data as MonatsBudget;
    },
  });

  // ---------------------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------------------

  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: Partial<Bestellung>) => {
      const { data, error } = await supabase
        .from('technik_bestellungen')
        .insert({
          ...newOrder,
          bestellt_von: userProfile?.id ?? '',
          besteller_name: `${userProfile?.vorname ?? ''} ${userProfile?.nachname ?? ''}`.trim() || 'Unbekannt',
          besteller_email: userProfile?.email ?? '',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technik_bestellungen'] });
      queryClient.invalidateQueries({ queryKey: ['technik_monatsbudget'] });
      setIsNewOrderOpen(false);
      toast({ title: 'Bestellung erfasst', description: 'Die Bestellung wurde erfolgreich angelegt.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async ({ id, received, note }: { id: string; received: boolean; note?: string }) => {
      const updateData: Record<string, unknown> = {
        status: received ? 'erhalten' : 'nicht_erhalten',
        erhalten_am: received ? new Date().toISOString() : null,
        wareneingang_bestaetigt_von: `${userProfile?.vorname ?? ''} ${userProfile?.nachname ?? ''}`.trim() || null,
        wareneingang_notiz: note || null,
      };

      const { error } = await supabase
        .from('technik_bestellungen')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technik_bestellungen'] });
      setIsConfirmReceiptOpen(false);
      setSelectedOrder(null);
      toast({
        title: variables.received ? 'Wareneingang bestätigt' : 'Als nicht erhalten markiert',
        description: variables.received
          ? 'Die Lieferung wurde als erhalten markiert.'
          : 'Eine Eskalation wird eingeleitet.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BestellStatus }) => {
      const { error } = await supabase
        .from('technik_bestellungen')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technik_bestellungen'] });
      toast({ title: 'Status aktualisiert' });
    },
  });

  // ---------------------------------------------------------------------------
  // BERECHNUNGEN
  // ---------------------------------------------------------------------------

  const budgetUsedPercent = monatsBudget
    ? Math.min((monatsBudget.ausgegeben / monatsBudget.budget_limit) * 100, 100)
    : 0;

  const budgetWarning = monatsBudget && monatsBudget.budget_rest < 200;
  const budgetExceeded = monatsBudget && monatsBudget.budget_rest < 0;

  const offeneBestellungen = useMemo(() =>
    bestellungen.filter(b => ['bestellt', 'versendet'].includes(b.status)),
    [bestellungen]
  );

  const wartenAufBestaetigung = useMemo(() =>
    bestellungen.filter(b => {
      if (b.status !== 'bestellt') return false;
      const bestellDatum = new Date(b.bestellt_am);
      const fuenfTageHer = new Date();
      fuenfTageHer.setDate(fuenfTageHer.getDate() - 5);
      return bestellDatum <= fuenfTageHer;
    }),
    [bestellungen]
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Technik-Bestellungen</h1>
          <p className="text-muted-foreground">
            Direktbestellungen bei Amazon, Conrad, Hornbach, Bauhaus & Lagerhaus
          </p>
        </div>
        <Button onClick={() => setIsNewOrderOpen(true)} disabled={!!budgetExceeded}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Bestellung
        </Button>
      </div>

      {budgetExceeded && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Budget überschritten!</strong> Das Monatsbudget von €{BUDGET_LIMIT} wurde erreicht.
            Weitere Bestellungen sind erst nächsten Monat möglich oder nach Freigabe durch die Verwaltung.
          </AlertDescription>
        </Alert>
      )}

      {wartenAufBestaetigung.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>{wartenAufBestaetigung.length} Bestellung(en)</strong> warten auf Wareneingangsbestätigung!
            Bitte prüfen Sie, ob die Ware eingetroffen ist.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={budgetWarning ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Monatsbudget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ausgegeben</span>
                <span className="font-bold">€{monatsBudget?.ausgegeben?.toFixed(2) ?? '0.00'}</span>
              </div>
              <Progress
                value={budgetUsedPercent}
                className={budgetExceeded ? 'bg-red-200' : budgetWarning ? 'bg-orange-200' : ''}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Verfügbar</span>
                <span className={budgetExceeded ? 'text-red-600 font-bold' : ''}>
                  €{monatsBudget?.budget_rest?.toFixed(2) ?? BUDGET_LIMIT.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Offen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{offeneBestellungen.length}</p>
            <p className="text-xs text-muted-foreground">Bestellungen unterwegs</p>
          </CardContent>
        </Card>

        <Card className={wartenAufBestaetigung.length > 0 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Bestätigung nötig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{wartenAufBestaetigung.length}</p>
            <p className="text-xs text-muted-foreground">Wareneingang prüfen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              Diesen Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{monatsBudget?.anzahl_bestellungen ?? 0}</p>
            <p className="text-xs text-muted-foreground">Bestellungen gesamt</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5" />
            Schnellzugriff Händler
          </CardTitle>
          <CardDescription>
            Klicken Sie auf einen Händler um die Website zu öffnen, dann erfassen Sie die Bestellung hier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(HAENDLER_CONFIG).filter(([key]) => key !== 'Sonstiges').map(([key, config]) => (
              <Button
                key={key}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => window.open(config.url, '_blank')}
              >
                <span className="text-2xl">{config.icon}</span>
                <span className="text-sm font-medium">{config.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="offen">Offene Bestellungen ({offeneBestellungen.length})</TabsTrigger>
          <TabsTrigger value="alle">Alle Bestellungen ({bestellungen.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="offen" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8">Laden...</div>
              ) : offeneBestellungen.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Keine offenen Bestellungen vorhanden.</div>
              ) : (
                <BestellungenTable
                  bestellungen={offeneBestellungen}
                  onConfirmReceipt={(order) => { setSelectedOrder(order); setIsConfirmReceiptOpen(true); }}
                  onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
                  showActions
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alle" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="text-center py-8">Laden...</div>
              ) : bestellungen.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Noch keine Bestellungen erfasst.</div>
              ) : (
                <BestellungenTable
                  bestellungen={bestellungen}
                  onConfirmReceipt={(order) => { setSelectedOrder(order); setIsConfirmReceiptOpen(true); }}
                  onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
                  showActions={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NewOrderDialog
        open={isNewOrderOpen}
        onOpenChange={setIsNewOrderOpen}
        onSubmit={(data) => createOrderMutation.mutate(data)}
        isLoading={createOrderMutation.isPending}
        budgetRest={monatsBudget?.budget_rest ?? BUDGET_LIMIT}
      />

      <ConfirmReceiptDialog
        open={isConfirmReceiptOpen}
        onOpenChange={setIsConfirmReceiptOpen}
        order={selectedOrder}
        onConfirm={(received, note) => {
          if (selectedOrder) confirmReceiptMutation.mutate({ id: selectedOrder.id, received, note });
        }}
        isLoading={confirmReceiptMutation.isPending}
      />
    </div>
  );
}

// =============================================================================
// BESTELLUNGEN TABELLE
// =============================================================================

interface BestellungenTableProps {
  bestellungen: Bestellung[];
  onConfirmReceipt: (order: Bestellung) => void;
  onStatusChange: (id: string, status: BestellStatus) => void;
  showActions: boolean;
}

function BestellungenTable({ bestellungen, onConfirmReceipt, onStatusChange, showActions }: BestellungenTableProps) {
  const needsConfirmation = (order: Bestellung) => {
    if (order.status !== 'bestellt') return false;
    const bestellDatum = new Date(order.bestellt_am);
    const fuenfTageHer = new Date();
    fuenfTageHer.setDate(fuenfTageHer.getDate() - 5);
    return bestellDatum <= fuenfTageHer;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bestell-ID</TableHead>
          <TableHead>Datum</TableHead>
          <TableHead>Artikel</TableHead>
          <TableHead>Händler</TableHead>
          <TableHead className="text-right">Menge</TableHead>
          <TableHead className="text-right">Preis</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Besteller</TableHead>
          {showActions && <TableHead className="text-right">Aktionen</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {bestellungen.map((order) => {
          const StatusIcon = STATUS_CONFIG[order.status].icon;
          const haendlerConfig = HAENDLER_CONFIG[order.haendler];
          const requiresAction = needsConfirmation(order);

          return (
            <TableRow key={order.id} className={requiresAction ? 'bg-orange-50' : ''}>
              <TableCell className="font-mono text-sm font-medium">
                {order.bestell_id}
                {requiresAction && (
                  <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                    Bestätigung nötig
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">{format(new Date(order.bestellt_am), 'dd.MM.yyyy', { locale: de })}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.bestellt_am), { addSuffix: true, locale: de })}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  <div className="font-medium truncate">{order.artikel}</div>
                  {order.artikelnummer && (
                    <div className="text-xs text-muted-foreground">Art.-Nr.: {order.artikelnummer}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={haendlerConfig.color}>
                  {haendlerConfig.icon} {haendlerConfig.name}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{order.menge}</TableCell>
              <TableCell className="text-right font-medium">€{order.gesamtpreis.toFixed(2)}</TableCell>
              <TableCell>
                <Badge className={STATUS_CONFIG[order.status].color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {STATUS_CONFIG[order.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{order.besteller_name}</div>
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    {order.status === 'bestellt' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusChange(order.id, 'versendet')}
                          title="Als versendet markieren"
                        >
                          <Truck className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={requiresAction ? 'default' : 'outline'}
                          onClick={() => onConfirmReceipt(order)}
                          className={requiresAction ? 'bg-orange-500 hover:bg-orange-600' : ''}
                          title="Wareneingang bestätigen"
                        >
                          <PackageCheck className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {order.status === 'versendet' && (
                      <Button size="sm" variant="outline" onClick={() => onConfirmReceipt(order)} title="Wareneingang bestätigen">
                        <PackageCheck className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// =============================================================================
// DIALOG: NEUE BESTELLUNG
// =============================================================================

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Bestellung>) => void;
  isLoading: boolean;
  budgetRest: number;
}

function NewOrderDialog({ open, onOpenChange, onSubmit, isLoading, budgetRest }: NewOrderDialogProps) {
  const [formData, setFormData] = useState({
    artikel: '',
    artikelnummer: '',
    menge: 1,
    einzelpreis: 0,
    haendler: '' as Haendler | '',
    haendler_url: '',
    verwendungszweck: '',
    notizen: '',
  });

  const gesamtpreis = formData.menge * formData.einzelpreis;
  const ueberschreitetBudget = gesamtpreis > budgetRest;

  const handleSubmit = () => {
    if (!formData.artikel || !formData.haendler || formData.einzelpreis <= 0) return;

    onSubmit({
      bestell_id: `TECH-${format(new Date(), 'yyyyMMdd-HHmmss')}`,
      artikel: formData.artikel,
      artikelnummer: formData.artikelnummer || null,
      menge: formData.menge,
      einzelpreis: formData.einzelpreis,
      gesamtpreis,
      haendler: formData.haendler as Haendler,
      haendler_url: formData.haendler_url || null,
      verwendungszweck: formData.verwendungszweck || null,
      notizen: formData.notizen || null,
      bestellt_am: new Date().toISOString(),
      status: 'bestellt',
    });
  };

  const resetForm = () => {
    setFormData({
      artikel: '',
      artikelnummer: '',
      menge: 1,
      einzelpreis: 0,
      haendler: '',
      haendler_url: '',
      verwendungszweck: '',
      notizen: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Bestellung erfassen</DialogTitle>
          <DialogDescription>Erfassen Sie die Bestellung nachdem Sie beim Händler bestellt haben.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Händler *</Label>
            <Select value={formData.haendler} onValueChange={(v) => setFormData({ ...formData, haendler: v as Haendler })}>
              <SelectTrigger>
                <SelectValue placeholder="Händler wählen" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HAENDLER_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.icon} {config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Artikel / Bezeichnung *</Label>
            <Input
              value={formData.artikel}
              onChange={(e) => setFormData({ ...formData, artikel: e.target.value })}
              placeholder="z.B. Bohrmaschine Bosch Professional GSB 18V"
            />
          </div>

          <div>
            <Label>Artikelnummer (optional)</Label>
            <Input
              value={formData.artikelnummer}
              onChange={(e) => setFormData({ ...formData, artikelnummer: e.target.value })}
              placeholder="z.B. B07XYZ123 oder ASIN"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Menge *</Label>
              <Input
                type="number"
                min={1}
                value={formData.menge}
                onChange={(e) => setFormData({ ...formData, menge: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label>Einzelpreis (€) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.einzelpreis || ''}
                onChange={(e) => setFormData({ ...formData, einzelpreis: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className={`p-3 rounded-lg ${ueberschreitetBudget ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Gesamtpreis:</span>
              <span className={`text-xl font-bold ${ueberschreitetBudget ? 'text-red-600' : ''}`}>€{gesamtpreis.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>Restbudget:</span>
              <span>€{budgetRest.toFixed(2)}</span>
            </div>
            {ueberschreitetBudget && (
              <p className="text-sm text-red-600 mt-2">⚠️ Diese Bestellung überschreitet das verfügbare Budget!</p>
            )}
          </div>

          <div>
            <Label>Link zur Bestellung (optional)</Label>
            <Input
              value={formData.haendler_url}
              onChange={(e) => setFormData({ ...formData, haendler_url: e.target.value })}
              placeholder="https://www.amazon.de/dp/..."
            />
          </div>

          <div>
            <Label>Verwendungszweck</Label>
            <Input
              value={formData.verwendungszweck}
              onChange={(e) => setFormData({ ...formData, verwendungszweck: e.target.value })}
              placeholder="z.B. Ersatz für defektes Gerät, Lagerbestand"
            />
          </div>

          <div>
            <Label>Notizen</Label>
            <Textarea
              value={formData.notizen}
              onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
              placeholder="Zusätzliche Informationen..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !formData.artikel ||
              !formData.haendler ||
              formData.einzelpreis <= 0 ||
              ueberschreitetBudget
            }
          >
            {isLoading ? 'Wird gespeichert...' : 'Bestellung erfassen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// DIALOG: WARENEINGANG BESTÄTIGEN
// =============================================================================

interface ConfirmReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Bestellung | null;
  onConfirm: (received: boolean, note?: string) => void;
  isLoading: boolean;
}

function ConfirmReceiptDialog({ open, onOpenChange, order, onConfirm, isLoading }: ConfirmReceiptDialogProps) {
  const [notReceived, setNotReceived] = useState(false);
  const [note, setNote] = useState('');

  if (!order) return null;

  const handleConfirm = (received: boolean) => {
    if (!received && !note.trim()) return;
    onConfirm(received, note);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setNotReceived(false); setNote(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wareneingang bestätigen</DialogTitle>
          <DialogDescription>Bestätigen Sie den Erhalt der Bestellung {order.bestell_id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Artikel:</span>
              <span className="font-medium">{order.artikel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Menge:</span>
              <span>{order.menge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Händler:</span>
              <span>{HAENDLER_CONFIG[order.haendler].icon} {HAENDLER_CONFIG[order.haendler].name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bestellt am:</span>
              <span>{format(new Date(order.bestellt_am), 'dd.MM.yyyy', { locale: de })}</span>
            </div>
          </div>

          {!notReceived ? (
            <div className="flex flex-col gap-3">
              <Button onClick={() => handleConfirm(true)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Ja, Ware erhalten
              </Button>
              <Button variant="outline" onClick={() => setNotReceived(true)} className="text-red-600 border-red-300 hover:bg-red-50">
                <XCircle className="w-4 h-4 mr-2" />
                Nein, nicht erhalten
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>Bitte geben Sie eine Erklärung ein. Die Buchhaltung wird benachrichtigt.</AlertDescription>
              </Alert>
              <div>
                <Label>Erklärung / Notiz *</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="z.B. Paket nicht angekommen, falsche Lieferung, beschädigt..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setNotReceived(false)} className="flex-1">Zurück</Button>
                <Button onClick={() => handleConfirm(false)} disabled={isLoading || !note.trim()} variant="destructive" className="flex-1">
                  Als nicht erhalten melden
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

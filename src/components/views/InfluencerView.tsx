/**
 * InfluencerView.tsx
 * Influencer Kalender — Mandira Ayurveda Hotel
 *
 * Rollen:
 *  Admin  → lesen, anlegen, bearbeiten, löschen
 *  CEO    → lesen, anlegen, bearbeiten (kein löschen)
 *  Advisor → nur lesen
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star, Plus, Pencil, Trash2, RefreshCw,
  Calendar, Users, Globe, Heart, AlertTriangle,
  Instagram, Youtube, Eye, Key, Copy, CheckCircle2, XCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface InfluencerStay {
  id: string;
  name: string;
  herkunft: string | null;
  kanaele: string | null;
  follower: string | null;
  themen: string | null;
  von: string;
  bis: string;
  begleitung: string | null;
  wieder: boolean | null;
  vorlieben: string | null;
  wuensche: string | null;
  allergien: string | null;
  kurtyp: string | null;
  notizen: string | null;
}


const EMPTY_FORM: Omit<InfluencerStay, 'id'> = {
  name: '',
  herkunft: '',
  kanaele: '',
  follower: '',
  themen: '',
  von: '',
  bis: '',
  begleitung: '',
  wieder: false,
  vorlieben: '',
  wuensche: '',
  allergien: '',
  kurtyp: '',
  notizen: '',
};

const KURTYPEN = ['Ayurveda', 'Fastenkur', 'Basenkur', 'Detox', 'TCM', 'Wellness'];

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktionen
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  try {
    return format(parseISO(d), 'dd. MMM yyyy', { locale: de });
  } catch {
    return d;
  }
}

function isActive(von: string, bis: string) {
  const today = new Date();
  return new Date(von) <= today && new Date(bis) >= today;
}

function isUpcoming(von: string) {
  return new Date(von) > new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// Formular-Dialog
// ─────────────────────────────────────────────────────────────────────────────

function InfluencerForm({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<InfluencerStay, 'id'>) => Promise<void>;
  initial?: InfluencerStay | null;
}) {
  const [form, setForm] = useState<Omit<InfluencerStay, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      const { id, ...rest } = initial;
      setForm(rest);
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initial, open]);

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!form.name || !form.von || !form.bis) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Influencer bearbeiten' : 'Neuer Influencer'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">

          {/* Name */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Name *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="Vollständiger Name" />
          </div>

          {/* Daten */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Anreise *</Label>
            <Input type="date" value={form.von} onChange={set('von')} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Abreise *</Label>
            <Input type="date" value={form.bis} onChange={set('bis')} />
          </div>

          {/* Herkunft + Begleitung */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Herkunft</Label>
            <Input value={form.herkunft || ''} onChange={set('herkunft')} placeholder="z.B. Deutschland" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Begleitung</Label>
            <Input value={form.begleitung || ''} onChange={set('begleitung')} placeholder="Partner / allein / ..." />
          </div>

          {/* Kanäle + Follower */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Kanäle</Label>
            <Input value={form.kanaele || ''} onChange={set('kanaele')} placeholder="Instagram, TikTok, YouTube" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Follower gesamt</Label>
            <Input value={form.follower || ''} onChange={set('follower')} placeholder="z.B. 150.000" />
          </div>

          {/* Themen + Kurtyp */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Themen</Label>
            <Input value={form.themen || ''} onChange={set('themen')} placeholder="Ayurveda, Gesundheit, ..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Kurtyp</Label>
            <select
              value={form.kurtyp || ''}
              onChange={set('kurtyp')}
              className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
            >
              <option value="">— wählen —</option>
              {KURTYPEN.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Allergien */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Allergien & Unverträglichkeiten</Label>
            <Input value={form.allergien || ''} onChange={set('allergien')} placeholder="z.B. Laktose, Gluten, ..." />
          </div>

          {/* Vorlieben */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Vorlieben</Label>
            <textarea
              value={form.vorlieben || ''}
              onChange={set('vorlieben')}
              placeholder="Besondere Vorlieben (Spa, Zimmer, Tagesablauf ...)"
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 min-h-[60px] resize-none"
            />
          </div>

          {/* Wünsche */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Besondere Wünsche</Label>
            <textarea
              value={form.wuensche || ''}
              onChange={set('wuensche')}
              placeholder="Besondere Wünsche und Anfragen"
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 min-h-[60px] resize-none"
            />
          </div>

          {/* Notizen */}
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Interne Notizen</Label>
            <textarea
              value={form.notizen || ''}
              onChange={set('notizen')}
              placeholder="Interne Anmerkungen (nicht im Kalender sichtbar)"
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 min-h-[60px] resize-none"
            />
          </div>

          {/* Wiederkehrend */}
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="wieder"
              checked={form.wieder || false}
              onChange={set('wieder')}
              className="h-4 w-4"
            />
            <Label htmlFor="wieder" className="text-sm cursor-pointer">Wiederkehrender Gast</Label>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-border mt-4">
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name || !form.von || !form.bis}
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────

export function InfluencerView() {
  const { isAdmin, canEditInfluencer, isAdvisor } = useAuth();
  const [stays, setStays] = useState<InfluencerStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InfluencerStay | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'alle' | 'aktuell' | 'bevorstehend' | 'vergangen'>('alle');

  const loadData = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from('influencer_stays')
      .select('*')
      .order('von', { ascending: false });
    setStays((data || []) as InfluencerStay[]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (form: Omit<InfluencerStay, 'id'>) => {
    if (editItem) {
      await supabase.from('influencer_stays').update(form).eq('id', editItem.id);
    } else {
      await supabase.from('influencer_stays').insert(form);
    }
    setFormOpen(false);
    setEditItem(null);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('influencer_stays').delete().eq('id', id);
    setDeleteConfirm(null);
    await loadData();
  };

  const filtered = stays.filter(s => {
    if (filter === 'aktuell') return isActive(s.von, s.bis);
    if (filter === 'bevorstehend') return isUpcoming(s.von);
    if (filter === 'vergangen') return new Date(s.bis) < new Date();
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Influencer Kalender</h1>
            <p className="text-xs text-muted-foreground">
              Mandira Ayurveda Hotel · {stays.length} Einträge
              {isAdvisor && (
                <span className="ml-2 text-muted-foreground/60">· Nur Lesezugriff</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
          {canEditInfluencer && (
            <Button
              onClick={() => { setEditItem(null); setFormOpen(true); }}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Influencer anlegen
            </Button>
          )}
        </div>
      </div>


      {/* Filter */}
      <div className="flex gap-1 px-6 py-3 border-b border-border">
        {(['alle', 'aktuell', 'bevorstehend', 'vergangen'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {f === 'alle' ? `Alle (${stays.length})` :
             f === 'aktuell' ? `Aktuell (${stays.filter(s => isActive(s.von, s.bis)).length})` :
             f === 'bevorstehend' ? `Bevorstehend (${stays.filter(s => isUpcoming(s.von)).length})` :
             `Vergangen (${stays.filter(s => new Date(s.bis) < new Date()).length})`}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {filter === 'alle'
              ? 'Noch keine Influencer eingetragen.'
              : `Keine ${filter === 'aktuell' ? 'aktuellen' : filter === 'bevorstehend' ? 'bevorstehenden' : 'vergangenen'} Einträge.`}
            {canEditInfluencer && filter === 'alle' && (
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ersten Influencer anlegen
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(stay => {
              const active = isActive(stay.von, stay.bis);
              const upcoming = isUpcoming(stay.von);
              const past = new Date(stay.bis) < new Date();

              return (
                <Card key={stay.id} className={`glass-card border-border ${active ? 'border-primary/30' : ''}`}>
                  <CardContent className="p-5">
                    {/* Kopfzeile */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{stay.name}</h3>
                          {stay.wieder && (
                            <Badge variant="secondary" className="text-xs">
                              <Heart className="h-2.5 w-2.5 mr-1" />
                              Stammgast
                            </Badge>
                          )}
                        </div>
                        {stay.herkunft && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Globe className="h-3 w-3" />
                            {stay.herkunft}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={active ? 'default' : upcoming ? 'outline' : 'secondary'}
                          className="text-xs"
                        >
                          {active ? '● Aktuell' : upcoming ? '◎ Bevorstehend' : '○ Vergangen'}
                        </Badge>
                      </div>
                    </div>

                    {/* Daten */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>{fmtDate(stay.von)} — {fmtDate(stay.bis)}</span>
                      {stay.begleitung && (
                        <>
                          <span className="mx-1">·</span>
                          <Users className="h-3 w-3" />
                          <span>{stay.begleitung}</span>
                        </>
                      )}
                    </div>

                    {/* Kanäle + Follower */}
                    {(stay.kanaele || stay.follower) && (
                      <div className="flex items-center gap-2 mb-2">
                        {stay.kanaele && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {stay.kanaele}
                          </span>
                        )}
                        {stay.follower && (
                          <span className="text-xs text-muted-foreground">
                            {stay.follower} Follower
                          </span>
                        )}
                      </div>
                    )}

                    {/* Kurtyp + Themen */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {stay.kurtyp && (
                        <Badge variant="outline" className="text-xs">
                          {stay.kurtyp}
                        </Badge>
                      )}
                      {stay.themen && stay.themen.split(',').map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t.trim()}
                        </Badge>
                      ))}
                    </div>

                    {/* Allergien (wichtig — immer zeigen) */}
                    {stay.allergien && (
                      <div className="flex items-start gap-1.5 text-xs text-warning mb-2 bg-warning/10 px-2 py-1.5 rounded-md">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span><strong>Allergien:</strong> {stay.allergien}</span>
                      </div>
                    )}

                    {/* Vorlieben / Wünsche (gekürzt) */}
                    {stay.vorlieben && (
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                        <strong className="text-foreground">Vorlieben:</strong> {stay.vorlieben}
                      </p>
                    )}
                    {stay.wuensche && (
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                        <strong className="text-foreground">Wünsche:</strong> {stay.wuensche}
                      </p>
                    )}

                    {/* Notizen — nur Admin + CEO */}
                    {stay.notizen && !isAdvisor && (
                      <p className="text-xs text-muted-foreground/60 italic mt-2 line-clamp-1">
                        Notiz: {stay.notizen}
                      </p>
                    )}

                    {/* Aktions-Buttons */}
                    {canEditInfluencer && (
                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setEditItem(stay); setFormOpen(true); }}
                        >
                          <Pencil className="h-3 w-3" />
                          Bearbeiten
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setDeleteConfirm(stay.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Löschen
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Formular-Dialog */}
      <InfluencerForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        onSave={handleSave}
        initial={editItem}
      />

      {/* Löschen-Bestätigung */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eintrag löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dieser Influencer-Eintrag wird dauerhaft gelöscht und aus dem Kalender-Feed entfernt.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}

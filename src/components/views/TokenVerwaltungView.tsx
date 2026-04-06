import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Key, Copy, CheckCircle2, XCircle, RefreshCw, Plus, Trash2,
  ChevronDown, ChevronRight, Crown, Users, Star,
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarToken {
  id: string;
  name: string;
  department: string | null;
  access_level: string | null;
  token: string;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  notes: string | null;
  mitarbeiter_id: string | null;
  is_abteilungsleiter: boolean;
}

interface Mitarbeiter {
  id: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  position: string;
  aktiv: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Direktion', 'Front Office', 'Housekeeping', 'Küche',
  'Medical', 'Restaurant', 'Technik', 'Wellness', 'Advisor',
];

const ACCESS_LEVELS = [
  { value: 'full',      label: 'Full',      desc: 'Alles sichtbar',              color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'abteilung', label: 'Abteilung', desc: 'Abteilungs-KPIs + Schichten', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'spa',       label: 'Spa',       desc: 'Behandlungen + Kurtyp',       color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'basis',     label: 'Basis',     desc: 'Name + Datum',                color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

const BASE_URL = 'https://kpi.ecomarine-group.com/api/calendar';

function accessLevelStyle(level: string | null) {
  return ACCESS_LEVELS.find(a => a.value === level)?.color
    ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function accessLevelLabel(level: string | null) {
  return ACCESS_LEVELS.find(a => a.value === level)?.label ?? level ?? '—';
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────

export function TokenVerwaltungView() {
  const [tokens, setTokens]               = useState<CalendarToken[]>([]);
  const [mitarbeiter, setMitarbeiter]     = useState<Mitarbeiter[]>([]);
  const [loading, setLoading]             = useState(true);
  const [copiedId, setCopiedId]           = useState<string | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(DEPARTMENTS));

  const [form, setForm] = useState({
    name: '',
    department: 'Front Office',
    access_level: 'basis',
    notes: '',
    mitarbeiter_id: '',
    is_abteilungsleiter: false,
  });

  // ── Laden ────────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    const [{ data: tkData }, { data: maData }] = await Promise.all([
      supabase.from('calendar_tokens').select('*').order('name'),
      supabase.from('mitarbeiter').select('id,vorname,nachname,abteilung,position,aktiv').order('nachname'),
    ]);
    setTokens((tkData as CalendarToken[]) || []);
    setMitarbeiter((maData as Mitarbeiter[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ── Mitarbeiter-Auswahl im Formular ──────────────────────────────────────

  const maInAbteilung = useMemo(() =>
    mitarbeiter.filter(m => m.aktiv && m.abteilung === form.department),
    [mitarbeiter, form.department]
  );

  // Wenn Mitarbeiter gewählt → Name + Position auto-füllen
  const handleMaSelect = (maId: string) => {
    const ma = mitarbeiter.find(m => m.id === maId);
    if (!ma) return;
    const isLeiter = /leitung|leiter|chef|direktor|direktion|arzt|dr\./i.test(ma.position);
    setForm(f => ({
      ...f,
      mitarbeiter_id: maId,
      name: `${ma.vorname} ${ma.nachname}`,
      is_abteilungsleiter: isLeiter,
      access_level: isLeiter ? 'abteilung' : f.access_level,
    }));
  };

  // ── Token erstellen ──────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name erforderlich'); return; }
    setSaving(true);
    const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const { error } = await supabase.from('calendar_tokens').insert({
      name: form.name.trim(),
      department: form.department,
      access_level: form.access_level,
      notes: form.notes || null,
      token: newToken,
      active: true,
      mitarbeiter_id: form.mitarbeiter_id || null,
      is_abteilungsleiter: form.is_abteilungsleiter,
    });
    setSaving(false);
    if (error) { toast.error('Fehler: ' + error.message); return; }
    toast.success('Token erstellt');
    setShowForm(false);
    setForm({ name: '', department: 'Front Office', access_level: 'basis', notes: '', mitarbeiter_id: '', is_abteilungsleiter: false });
    loadAll();
  };

  // ── Token löschen ────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('calendar_tokens').delete().eq('id', id);
    if (error) { toast.error('Fehler: ' + error.message); return; }

    // Mitarbeiter ausgrauen wenn Token gelöscht
    const tk = tokens.find(t => t.id === id);
    if (tk?.mitarbeiter_id) {
      await supabase.from('mitarbeiter').update({ aktiv: false }).eq('id', tk.mitarbeiter_id);
    }

    toast.success('Token gelöscht · Mitarbeiter ausgegraut');
    setDeleteConfirm(null);
    loadAll();
  };

  // ── Toggle aktiv ─────────────────────────────────────────────────────────

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from('calendar_tokens').update({ active }).eq('id', id);
    loadAll();
  };

  // ── URL kopieren ─────────────────────────────────────────────────────────

  const handleCopy = (tk: CalendarToken) => {
    const url = `${BASE_URL}/${tk.token}/mandira.ics`;
    navigator.clipboard.writeText(url);
    setCopiedId(tk.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('URL kopiert');
  };

  // ── Gruppierung ──────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, { leiter: CalendarToken[]; rest: CalendarToken[] }>();
    DEPARTMENTS.forEach(d => map.set(d, { leiter: [], rest: [] }));

    for (const tk of tokens) {
      const dept = tk.department || 'Sonstige';
      if (!map.has(dept)) map.set(dept, { leiter: [], rest: [] });
      const g = map.get(dept)!;
      if (tk.is_abteilungsleiter || tk.access_level === 'full') {
        g.leiter.push(tk);
      } else {
        g.rest.push(tk);
      }
    }
    return map;
  }, [tokens]);

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  };

  // ── KPI Summary ──────────────────────────────────────────────────────────

  const total  = tokens.length;
  const active = tokens.filter(t => t.active).length;
  const used   = tokens.filter(t => t.last_used_at).length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            ICS Token-Verwaltung
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Kalender-Abonnements für Mitarbeiter · {total} Tokens
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Neuer Token
          </Button>
        </div>
      </div>

      {/* KPI Kacheln */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tokens gesamt', val: total },
          { label: 'Aktiv', val: active, green: true },
          { label: 'Jemals genutzt', val: used },
        ].map(k => (
          <Card key={k.label} className="glass-card border-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className={`text-3xl font-bold font-mono mt-1 ${k.green ? 'text-emerald-500' : 'text-foreground'}`}>{k.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Access Level Legende */}
      <div className="flex gap-2 flex-wrap">
        {ACCESS_LEVELS.map(a => (
          <span key={a.value} className={`px-2.5 py-1 rounded-full border text-xs font-medium ${a.color}`}>
            {a.label} — {a.desc}
          </span>
        ))}
      </div>

      {/* Gruppierte Token-Liste */}
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([dept, { leiter, rest }]) => {
          const deptTotal = leiter.length + rest.length;
          if (deptTotal === 0) return null;
          const expanded = expandedDepts.has(dept);

          return (
            <Card key={dept} className="glass-card border-border overflow-hidden">
              {/* Abteilungs-Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleDept(dept)}
              >
                <div className="flex items-center gap-2">
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium text-foreground">{dept}</span>
                  <span className="text-xs text-muted-foreground">({deptTotal})</span>
                </div>
                <div className="flex gap-1">
                  {leiter.length > 0 && (
                    <span className="text-xs text-amber-400 flex items-center gap-1">
                      <Crown className="h-3 w-3" />{leiter.length} Leitung
                    </span>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="border-t border-border">
                  {/* Abteilungsleiter zuerst */}
                  {leiter.map(tk => (
                    <TokenRow
                      key={tk.id}
                      token={tk}
                      isLeiter={true}
                      copiedId={copiedId}
                      deleteConfirm={deleteConfirm}
                      onCopy={handleCopy}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onDeleteConfirm={setDeleteConfirm}
                    />
                  ))}
                  {/* Trennlinie wenn beide vorhanden */}
                  {leiter.length > 0 && rest.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Mitarbeiter</span>
                    </div>
                  )}
                  {/* Rest */}
                  {rest.map(tk => (
                    <TokenRow
                      key={tk.id}
                      token={tk}
                      isLeiter={false}
                      copiedId={copiedId}
                      deleteConfirm={deleteConfirm}
                      onCopy={handleCopy}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onDeleteConfirm={setDeleteConfirm}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Neuer Token Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuer Token erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Abteilung */}
            <div className="space-y-1.5">
              <Label>Abteilung</Label>
              <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v, mitarbeiter_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Mitarbeiter aus Liste */}
            {maInAbteilung.length > 0 && (
              <div className="space-y-1.5">
                <Label>Mitarbeiter (optional)</Label>
                <Select value={form.mitarbeiter_id} onValueChange={handleMaSelect}>
                  <SelectTrigger><SelectValue placeholder="Mitarbeiter wählen…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Manuell eingeben —</SelectItem>
                    {maInAbteilung.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nachname} {m.vorname} · {m.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Vorname Nachname"
              />
            </div>

            {/* Access Level */}
            <div className="space-y-1.5">
              <Label>Zugriffsebene</Label>
              <Select value={form.access_level} onValueChange={v => setForm(f => ({ ...f, access_level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map(a => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label} — {a.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Abteilungsleiter */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Abteilungsleiter</Label>
                <p className="text-xs text-muted-foreground">Erscheint oben in der Abteilung</p>
              </div>
              <Switch
                checked={form.is_abteilungsleiter}
                onCheckedChange={v => setForm(f => ({ ...f, is_abteilungsleiter: v }))}
              />
            </div>

            {/* Notizen */}
            <div className="space-y-1.5">
              <Label>Notizen (optional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="z.B. iPhone 14 Pro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? 'Erstelle…' : 'Token erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Token-Zeile
// ─────────────────────────────────────────────────────────────────────────────

function TokenRow({
  token: tk, isLeiter, copiedId, deleteConfirm,
  onCopy, onToggle, onDelete, onDeleteConfirm,
}: {
  token: CalendarToken;
  isLeiter: boolean;
  copiedId: string | null;
  deleteConfirm: string | null;
  onCopy: (tk: CalendarToken) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors ${isLeiter ? 'bg-amber-500/5' : ''}`}>
      {/* Leiter-Icon */}
      <div className="w-5 flex justify-center shrink-0">
        {isLeiter ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : <span className="h-3.5 w-3.5" />}
      </div>

      {/* Name + Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${tk.active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
            {tk.name}
          </span>
          <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${isLeiter ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/50 text-muted-foreground border-border'}`}>
            {accessLevelLabel(tk.access_level)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tk.last_used_at
            ? `Zuletzt: ${new Date(tk.last_used_at).toLocaleDateString('de-DE')}`
            : 'Nie genutzt'}
          {tk.notes && ` · ${tk.notes}`}
        </p>
      </div>

      {/* Aktiv-Toggle */}
      <Switch
        checked={tk.active}
        onCheckedChange={v => onToggle(tk.id, v)}
        className="shrink-0"
      />

      {/* URL kopieren */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onCopy(tk)}>
        {copiedId === tk.id
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          : <Copy className="h-3.5 w-3.5" />}
      </Button>

      {/* Löschen */}
      {deleteConfirm === tk.id ? (
        <div className="flex gap-1 shrink-0">
          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => onDelete(tk.id)}>
            Ja, löschen
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onDeleteConfirm(null)}>
            Nein
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => onDeleteConfirm(tk.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

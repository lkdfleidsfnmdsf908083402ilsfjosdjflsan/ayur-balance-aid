/**
 * ErstanamnseView — Digitale Erstanamnese
 * Mandira Ayurveda Hotel
 * 
 * 3 Seiten als Tabs:
 *   1. Stammdaten + Allergien + Unverträglichkeiten
 *   2. Paket + Kräuter + Beschwerden + Diagnose
 *   3. Blutwerte + Eltern + Kraft + Psyche + Zungendiagnose + Signatur
 * 
 * Datenquelle: Supabase Tabelle "erstanamnese"
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Save, FileText, Plus, Search, ChevronRight, Check,
  User, Heart, Brain, ClipboardList, Stethoscope, Pill, Printer
} from 'lucide-react';

// ─── Dropdown-Optionen ──────────────────────────────────

const KUR_TYPEN = ['Panchakarma-Kur 7', 'Panchakarma-Kur 14', 'Panchakarma-Kur 21', 'Ayur-Detox', 'Rasa-Yana', 'Jungbrunnen Paket'];

const SPRACHEN = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const FAMILIENSTAND = [
  'Ledig / Single', 'Verheiratet / Married', 'Eingetragene Partnerschaft',
  'Verwitwet / Widowed', 'Geschieden / Divorced', 'Getrennt lebend / Separated',
  'In einer Beziehung', 'Verlobt / Engaged',
];

const DOCTORS = [
  'Dr. med. Alexandra Koller', 'Dr.ind. Akil Balachandran', 'Dr. Binson Gramya',
];

const PACKAGES = [
  'Panchakarma-Kur 7', 'Panchakarma-Kur 14', 'Panchakarma-Kur 21',
  'Ayur-Detox', 'Rasa-Yana', 'Jungbrunnen Paket',
  'AK Manager Programm', 'Aufbaukur-Rasayana', 'Aufbaukur-Rasayana 24',
  'AyurDetox Kurzreinigung', 'Ayurveda Immun-Kur', 'Ayurveda Immun-Kur intensiv',
  'Express Power Plus-Kur 24', 'Jungbrunnen Paket',
  'Managerpower Immun-Kur 24', 'Mandiras Kennenlernpaket',
  'Panchakarma-Kur light 24', 'Panchakarma-Kur de Luxe 24',
  'Panchakarma-Kur der Klassiker 24', 'Panchakarma-Kur supreme 24',
  'Panchakarma-Kur Klassik MED 24', 'Panchakarma-Kur Privat Luxury 24',
  'Relax & Wohlfühltage 24', 'Stammgästewoche 5=7',
  'Wellness Kurzurlaub', 'Sonstiges',
];

const ALLERGIES = [
  'Kuhmilch', 'Ziegenmilch', 'Hühnereiweiss', 'Eigelb',
  'Erdnuss', 'Haselnuss', 'Walnuss', 'Cashewnuss', 'Mandel',
  'Weizen', 'Roggen', 'Gerste', 'Dinkel', 'Hafer',
  'Soja', 'Lupine', 'Sesam', 'Senf', 'Sellerie',
  'Fisch', 'Garnele', 'Krabbe', 'Muscheln',
  'Latex', 'Bienengift', 'Wespengift',
  'Hausstaubmilbe', 'Gräser-Pollen', 'Birken-Pollen',
  'Katzenhaare', 'Hundehaare', 'Schimmelpilz',
  'Penicillin', 'Aspirin/NSAR', 'Sulfonamide',
  'Nickel', 'Duftstoffe/Parfum', 'Konservierungsstoffe',
  'Jod', 'Sulfite', 'Sonstige',
];

const INTOLERANCES = [
  'Laktoseintoleranz', 'Fruktosemalabsorption', 'Histaminintoleranz',
  'Glutenunverträglichkeit', 'Zöliakie', 'Sorbitintoleranz',
  'Saccharoseintoleranz', 'Galaktoseintoleranz',
  'Koffeinunverträglichkeit', 'Alkoholunverträglichkeit',
  'Salicylatintoleranz', 'Tyraminunverträglichkeit',
  'Glutamatunverträglichkeit', 'Sulfitunverträglichkeit',
  'Oxalatunverträglichkeit', 'FODMAP-Intoleranz',
  'Caseinunverträglichkeit', 'Phenylketonurie',
  'Sonstige',
];

const KRAFT_OPTIONS = ['gut / good', 'mittel / medium', 'schwach / weak'];

const PSYCH_STATES = [
  'Ausgeglichen / Balanced', 'Gelassen / Relaxed', 'Zufrieden / Content',
  'Freudig / Joyful', 'Motiviert / Motivated', 'Hoffnungsvoll / Hopeful',
  'Dankbar / Grateful', 'Ängstlich / Anxious', 'Nervös / Nervous',
  'Gestresst / Stressed', 'Erschöpft / Exhausted', 'Traurig / Sad',
  'Depressiv / Depressive', 'Reizbar / Irritable', 'Rastlos / Restless',
  'Gleichgültig / Indifferent', 'Überfordert / Overwhelmed',
  'Einsam / Lonely', 'Verwirrt / Confused', 'Traumatisiert / Traumatized',
];

const PSYCH_CHECKBOXES: { key: string; label: string }[] = [
  { key: 'psych_ausgeglichen', label: 'Ausgeglichen' },
  { key: 'psych_gelassen', label: 'Gelassen' },
  { key: 'psych_zufrieden', label: 'Zufrieden' },
  { key: 'psych_freudig', label: 'Freudig' },
  { key: 'psych_motiviert', label: 'Motiviert' },
  { key: 'psych_hoffnungsvoll', label: 'Hoffnungsvoll' },
  { key: 'psych_dankbar', label: 'Dankbar' },
  { key: 'psych_aengstlich', label: 'Ängstlich' },
  { key: 'psych_nervoes', label: 'Nervös' },
  { key: 'psych_gestresst', label: 'Gestresst' },
  { key: 'psych_erschoepft', label: 'Erschöpft / Burnout' },
  { key: 'psych_traurig', label: 'Traurig' },
  { key: 'psych_depressiv', label: 'Depressiv' },
  { key: 'psych_reizbar', label: 'Reizbar' },
  { key: 'psych_rastlos', label: 'Rastlos' },
  { key: 'psych_gleichgueltig', label: 'Gleichgültig' },
  { key: 'psych_ueberfordert', label: 'Überfordert' },
  { key: 'psych_einsam', label: 'Einsam' },
  { key: 'psych_verwirrt', label: 'Verwirrt' },
  { key: 'psych_traumatisiert', label: 'Traumatisiert' },
];

// ─── Hilfsfunktionen ────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

// ─── Formular-Eingabe-Komponenten ───────────────────────

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, className = '' }: any) {
  return (
    <input
      type="text" value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
    />
  );
}

function NumberInput({ value, onChange, placeholder, className = '' }: any) {
  return (
    <input
      type="number" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: any) {
  return (
    <textarea
      value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
    />
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="">{placeholder || '-- wählen --'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <input type="checkbox" checked={checked || false} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

// ═════════════════════════════════════════════════════════
// HAUPTKOMPONENTE
// ═════════════════════════════════════════════════════════

export function ErstanamnseView() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Formular-Daten
  const [form, setForm] = useState<Record<string, any>>({
    kur_typ: '', sprache: 'de', familienname: '', vorname: '', datum: today(),
    alter_jahre: null, geburtsdatum: '', familienstand: '',
    groesse_cm: null, gewicht_kg: null, kinder: '', beruf: '',
    blutdruck: '', puls: '',
    allergie_1: '', allergie_2: '', allergie_3: '', allergie_4: '', allergie_5: '',
    allergien_freitext: '',
    unvertr_1: '', unvertr_2: '', unvertr_3: '', unvertr_4: '', unvertr_5: '',
    unvertr_freitext: '',
    paket: '', kraeuter: '', info_abteilung: '', schwerpunkt_ziel: '',
    operationen: '', beschwerden: '', emotional: '', diagnose: '',
    blutwerte_jahr: '', medikamente: '',
    mutter_lebt: null, vater_lebt: null, krankheiten_mutter: '', krankheiten_vater: '',
    fruehgeburt: null,
    kraft_koerperlich: '', kraft_koerperlich_seit: '',
    kraft_abwehr: '', kraft_abwehr_seit: '',
    psych_hauptzustand: '', psych_nebenzustand: '',
    ...Object.fromEntries(PSYCH_CHECKBOXES.map(c => [c.key, false])),
    psych_kummer: false,
    zungendiagnose: '',
    arzt: '', signatur_datum: today(),
    status: 'entwurf',
  });

  const setF = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  // ─── Liste laden ────────────────────────────────────

  useEffect(() => { loadList(); }, []);

  async function loadList() {
    const { data } = await supabase.from('erstanamnese')
      .select('id, familienname, vorname, datum, paket, arzt, status')
      .order('created_at', { ascending: false }).limit(100);
    setList(data || []);
  }

  // ─── Speichern ──────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    
    // Leere Strings zu null
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    let error;
    if (editId) {
      ({ error } = await supabase.from('erstanamnese').update(payload).eq('id', editId));
    } else {
      const { data, error: e } = await supabase.from('erstanamnese').insert(payload).select('id').single();
      error = e;
      if (data) setEditId(data.id);
    }

    if (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } else {
      toast.success(editId ? 'Anamnese aktualisiert' : 'Anamnese gespeichert');
      loadList();
    }
    setSaving(false);
  }

  // ─── Laden eines Eintrags ───────────────────────────

  async function loadEntry(id: string) {
    const { data } = await supabase.from('erstanamnese').select('*').eq('id', id).single();
    if (data) {
      setForm(data);
      setEditId(id);
      setShowList(false);
      setActiveTab(1);
    }
  }

  // ─── Neuer Eintrag ─────────────────────────────────

  function handleNew() {
    setEditId(null);
    setForm({
      kur_typ: '', sprache: 'de', familienname: '', vorname: '', datum: today(),
      alter_jahre: null, geburtsdatum: '', familienstand: '',
      groesse_cm: null, gewicht_kg: null, kinder: '', beruf: '',
      blutdruck: '', puls: '',
      allergie_1: '', allergie_2: '', allergie_3: '', allergie_4: '', allergie_5: '',
      allergien_freitext: '',
      unvertr_1: '', unvertr_2: '', unvertr_3: '', unvertr_4: '', unvertr_5: '',
      unvertr_freitext: '',
      paket: '', kraeuter: '', info_abteilung: '', schwerpunkt_ziel: '',
      operationen: '', beschwerden: '', emotional: '', diagnose: '',
      blutwerte_jahr: '', medikamente: '',
      mutter_lebt: null, vater_lebt: null, krankheiten_mutter: '', krankheiten_vater: '',
      fruehgeburt: null,
      kraft_koerperlich: '', kraft_koerperlich_seit: '',
      kraft_abwehr: '', kraft_abwehr_seit: '',
      psych_hauptzustand: '', psych_nebenzustand: '',
      ...Object.fromEntries(PSYCH_CHECKBOXES.map(c => [c.key, false])),
      psych_kummer: false,
      zungendiagnose: '',
      arzt: '', signatur_datum: today(),
      status: 'entwurf',
    });
    setShowList(false);
    setActiveTab(1);
  }

  // ─── PDF Export ─────────────────────────────────────

  function handleExportPdf() {
    // Sicherheit: alle Werte HTML-escapen, bevor sie in das exportierte
    // Dokument interpoliert werden. Anamnese-Freitextfelder (beschwerden,
    // diagnose, medikamente, …) sind gespeicherte Nutzereingaben und dürfen
    // nicht als HTML/JS im same-origin-Fenster ausgeführt werden (XSS).
    const esc = (s: unknown) =>
      String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const v = (k: string) => esc(form[k] || '');
    const yn = (k: string) => form[k] === true ? 'Ja' : form[k] === false ? 'Nein' : '—';
    const allergien = esc([1,2,3,4,5].map(i => form[`allergie_${i}`]).filter(Boolean).join(', '));
    const unvertr = esc([1,2,3,4,5].map(i => form[`unvertr_${i}`]).filter(Boolean).join(', '));
    const psychChecked = PSYCH_CHECKBOXES.filter(c => form[c.key]).map(c => c.label).join(', ');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Erstanamnese – ${v('familienname')}, ${v('vorname')}</title>
<style>
@page{size:A4;margin:15mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.5;max-width:190mm;margin:0 auto}
h1{font-size:18px;color:#3d5a40;margin:0 0 2px;border-bottom:2px solid #c4a35a;padding-bottom:6px}
h2{font-size:13px;color:#3d5a40;margin:16px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
.sub{color:#666;font-size:10px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 16px}
.row{display:flex;gap:4px;padding:3px 0;border-bottom:1px solid #f0f0f0}
.lbl{font-weight:600;color:#555;min-width:120px;font-size:10px}
.val{flex:1}
.kur-row{display:flex;gap:12px;margin:8px 0}
.kur-item{padding:4px 12px;border:1px solid #ccc;border-radius:4px;font-size:10px}
.kur-item.active{background:#3d5a40;color:white;border-color:#3d5a40;font-weight:600}
.checks{display:flex;flex-wrap:wrap;gap:4px 14px}
.check{font-size:10px}
.footer{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
.sig-line{border-top:1px solid #333;padding-top:4px;margin-top:30px;font-size:10px;color:#666}
.page-break{page-break-before:always}
@media print{button{display:none !important}}
</style></head><body>
<button onclick="window.print()" style="position:fixed;top:10px;right:10px;padding:8px 20px;background:#3d5a40;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;z-index:999">🖨️ Drucken</button>

<h1>Erstanamnese – Mandira Ayurveda</h1>
<div class="sub">${v('datum') ? new Date(v('datum')).toLocaleDateString('de-DE') : ''} · ${v('arzt') || ''}</div>

<div class="kur-row">
${KUR_TYPEN.map(k => `<span class="kur-item ${form.kur_typ === k ? 'active' : ''}">${form.kur_typ === k ? '☑' : '☐'} ${k}</span>`).join('')}
</div>

<h2>Stammdaten</h2>
<div class="grid">
<div class="row"><span class="lbl">Name:</span><span class="val"><b>${v('familienname')}, ${v('vorname')}</b></span></div>
<div class="row"><span class="lbl">Geburtsdatum:</span><span class="val">${v('geburtsdatum') ? new Date(v('geburtsdatum')).toLocaleDateString('de-DE') : '—'} (Alter: ${v('geburtsdatum') ? String(Math.floor((Date.now() - new Date(v('geburtsdatum')).getTime()) / 31557600000)) : '—'})</span></div>
<div class="row"><span class="lbl">Familienstand:</span><span class="val">${v('familienstand')}</span></div>
<div class="row"><span class="lbl">Beruf:</span><span class="val">${v('beruf')}</span></div>
<div class="row"><span class="lbl">Größe / Gewicht:</span><span class="val">${v('groesse_cm') ? v('groesse_cm') + ' cm' : '—'} / ${v('gewicht_kg') ? v('gewicht_kg') + ' kg' : '—'}</span></div>
<div class="row"><span class="lbl">Kinder:</span><span class="val">${v('kinder')}</span></div>
<div class="row"><span class="lbl">Blutdruck / Puls:</span><span class="val">${v('blutdruck') || '—'} / ${v('puls') || '—'}</span></div>
<div class="row"><span class="lbl">Sprache:</span><span class="val">${v('sprache') === 'en' ? 'English' : 'Deutsch'}</span></div>
</div>

<h2>Allergien</h2>
<div class="row"><span class="val">${allergien || 'Keine angegeben'}</span></div>
${v('allergien_freitext') ? `<div class="row"><span class="lbl">Weitere:</span><span class="val">${v('allergien_freitext')}</span></div>` : ''}

<h2>Unverträglichkeiten</h2>
<div class="row"><span class="val">${unvertr || 'Keine angegeben'}</span></div>
${v('unvertr_freitext') ? `<div class="row"><span class="lbl">Weitere:</span><span class="val">${v('unvertr_freitext')}</span></div>` : ''}

<div class="page-break"></div>

<h2>Behandlungsplanung</h2>
<div class="row"><span class="lbl">Paket:</span><span class="val"><b>${v('paket')}</b></span></div>
<div class="row"><span class="lbl">Kräuter:</span><span class="val">${v('kraeuter')}</span></div>
<div class="row"><span class="lbl">Info Abteilung:</span><span class="val">${v('info_abteilung')}</span></div>
<div class="row"><span class="lbl">Schwerpunkt/Ziel:</span><span class="val">${v('schwerpunkt_ziel')}</span></div>

<h2>Anamnese</h2>
<div class="row"><span class="lbl">Operationen:</span><span class="val">${v('operationen')}</span></div>
<div class="row"><span class="lbl">Beschwerden:</span><span class="val">${v('beschwerden')}</span></div>
<div class="row"><span class="lbl">Emotional:</span><span class="val">${v('emotional')}</span></div>
<div class="row"><span class="lbl">Diagnose:</span><span class="val">${v('diagnose')}</span></div>

<div class="page-break"></div>

<h2>Blutwerte & Medikamente</h2>
<div class="row"><span class="lbl">Blutwerte (Jahr):</span><span class="val">${v('blutwerte_jahr')}</span></div>
<div class="row"><span class="lbl">Medikamente:</span><span class="val">${v('medikamente')}</span></div>

<h2>Familiengeschichte</h2>
<div class="grid">
<div class="row"><span class="lbl">Mutter lebt:</span><span class="val">${yn('mutter_lebt')} — ${v('krankheiten_mutter')}</span></div>
<div class="row"><span class="lbl">Vater lebt:</span><span class="val">${yn('vater_lebt')} — ${v('krankheiten_vater')}</span></div>
<div class="row"><span class="lbl">Frühgeburt:</span><span class="val">${yn('fruehgeburt')}</span></div>
</div>

<h2>Kraft (Bala)</h2>
<div class="grid">
<div class="row"><span class="lbl">Körperlich:</span><span class="val">${v('kraft_koerperlich')} ${v('kraft_koerperlich_seit') ? '(seit ' + v('kraft_koerperlich_seit') + ')' : ''}</span></div>
<div class="row"><span class="lbl">Abwehr:</span><span class="val">${v('kraft_abwehr')} ${v('kraft_abwehr_seit') ? '(seit ' + v('kraft_abwehr_seit') + ')' : ''}</span></div>
</div>

<h2>Psychischer Zustand</h2>
<div class="row"><span class="lbl">Hauptzustand:</span><span class="val"><b>${v('psych_hauptzustand')}</b></span></div>
<div class="row"><span class="lbl">Nebenzustand:</span><span class="val">${v('psych_nebenzustand')}</span></div>
<div class="checks">${psychChecked ? psychChecked.split(', ').map(s => `<span class="check">☑ ${s}</span>`).join('') : 'Keine ausgewählt'}</div>
${form.psych_kummer ? '<div class="row" style="margin-top:4px"><span class="lbl">⚠ Kummer/Sorgen:</span><span class="val">Ja</span></div>' : ''}

<h2>Zungendiagnose</h2>
<div style="display:flex;gap:16px;align-items:flex-start">
<svg viewBox="0 0 200 300" width="140" height="210">
<ellipse cx="100" cy="150" rx="75" ry="130" fill="#E8B4B8" stroke="#c88" stroke-width="2"/>
<ellipse cx="100" cy="55" rx="50" ry="28" fill="#C75B5B" opacity="0.8"/>
<text x="100" y="60" text-anchor="middle" fill="white" font-size="11" font-weight="600">Herz / Lunge</text>
<circle cx="60" cy="120" r="28" fill="#7A8B6E" opacity="0.7"/>
<text x="60" y="124" text-anchor="middle" fill="white" font-size="11" font-weight="600">Leber</text>
<circle cx="100" cy="125" r="25" fill="#C4A35A" opacity="0.7"/>
<text x="100" y="122" text-anchor="middle" fill="white" font-size="10" font-weight="600">Magen</text>
<text x="100" y="136" text-anchor="middle" fill="white" font-size="9">Milz</text>
<circle cx="140" cy="120" r="22" fill="#8B9AAE" opacity="0.7"/>
<text x="140" y="124" text-anchor="middle" fill="white" font-size="11" font-weight="600">Galle</text>
<ellipse cx="100" cy="195" rx="40" ry="28" fill="#9B7DB8" opacity="0.7"/>
<text x="100" y="199" text-anchor="middle" fill="white" font-size="11" font-weight="600">Dickdarm</text>
<ellipse cx="100" cy="250" rx="32" ry="20" fill="#7A8B9A" opacity="0.7"/>
<text x="100" y="254" text-anchor="middle" fill="white" font-size="11" font-weight="600">Niere</text>
</svg>
<div style="flex:1"><div class="row"><span class="val">${v('zungendiagnose') || '—'}</span></div></div>
</div>

<div class="footer">
<div><div class="sig-line">Arzt: ${v('arzt')}<br>Datum: ${v('signatur_datum') ? new Date(v('signatur_datum')).toLocaleDateString('de-DE') : ''}</div></div>
<div><div class="sig-line">Unterschrift Patient</div></div>
</div>

<div style="text-align:center;margin-top:16px;font-size:9px;color:#aaa">Erstanamnese – Mandira Ayurveda Hotel · Seite 3 von 3</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  // ─── Gefilterte Liste ──────────────────────────────

  const filtered = list.filter(e =>
    !searchTerm || 
    `${e.familienname} ${e.vorname}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── RENDER: Liste ─────────────────────────────────

  if (showList) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Erstanamnese
            </h2>
            <p className="text-sm text-muted-foreground">Ayurvedischer Anamnesebogen</p>
          </div>
          <button onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Neue Anamnese
          </button>
        </div>

        {/* Suche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Patient suchen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm" />
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {filtered.map(e => (
            <button key={e.id} onClick={() => loadEntry(e.id)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors text-left">
              <div>
                <p className="font-medium text-foreground">
                  {e.familienname}{e.vorname ? `, ${e.vorname}` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : '—'} · {e.paket || 'Kein Paket'} · {e.arzt || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  e.status === 'abgeschlossen' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {e.status === 'abgeschlossen' ? 'Abgeschlossen' : 'Entwurf'}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {list.length === 0 ? 'Noch keine Anamnesen erfasst' : 'Keine Treffer'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: Formular ──────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowList(true)}
            className="text-sm text-muted-foreground hover:text-foreground">← Zurück</button>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {editId ? `${form.familienname || ''}, ${form.vorname || ''}` : 'Neue Erstanamnese'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {form.datum ? new Date(form.datum).toLocaleDateString('de-DE') : '—'} · Seite {activeTab}/3
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={form.status} onChange={e => setF('status', e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background">
            <option value="entwurf">Entwurf</option>
            <option value="abgeschlossen">Abgeschlossen</option>
            <option value="archiviert">Archiviert</option>
          </select>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? 'Speichern...' : 'Speichern'}
          </button>
          <button onClick={handleExportPdf}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/30"
            title="Als PDF drucken">
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* Kur-Typ Auswahl */}
      <div className="flex gap-2">
        {KUR_TYPEN.map(k => (
          <button key={k} onClick={() => { setF('kur_typ', k); setF('paket', k); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              form.kur_typ === k ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}>{k}</button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border/40 pb-px">
        {[
          { id: 1 as const, label: 'Stammdaten', icon: User },
          { id: 2 as const, label: 'Behandlung', icon: ClipboardList },
          { id: 3 as const, label: 'Medizinisch', icon: Brain },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ SEITE 1: Stammdaten ═══ */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* Grunddaten */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Stammdaten
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Familienname *" className="col-span-2">
                <TextInput value={form.familienname} onChange={(v: string) => setF('familienname', v)} placeholder="Nachname" />
              </Field>
              <Field label="Vorname *" className="col-span-2">
                <TextInput value={form.vorname} onChange={(v: string) => setF('vorname', v)} placeholder="Vorname" />
              </Field>
              <Field label="Datum">
                <input type="date" value={form.datum || ''} onChange={e => setF('datum', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </Field>
              <Field label="Geburtsdatum">
                <input type="date" value={form.geburtsdatum || ''} onChange={e => setF('geburtsdatum', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </Field>
              <Field label="Alter (berechnet)">
                <input type="text" readOnly value={form.geburtsdatum ? String(Math.floor((Date.now() - new Date(form.geburtsdatum).getTime()) / 31557600000)) : ''} 
                  className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm cursor-default" />
              </Field>
              <Field label="Familienstand">
                <Select value={form.familienstand} onChange={v => setF('familienstand', v)} options={FAMILIENSTAND} />
              </Field>
              <Field label="Größe (cm)">
                <NumberInput value={form.groesse_cm} onChange={(v: number) => setF('groesse_cm', v)} placeholder="z.B. 175" />
              </Field>
              <Field label="Gewicht (kg)">
                <NumberInput value={form.gewicht_kg} onChange={(v: number) => setF('gewicht_kg', v)} placeholder="z.B. 72" />
              </Field>
              <Field label="Kinder">
                <TextInput value={form.kinder} onChange={(v: string) => setF('kinder', v)} placeholder="Anzahl / Alter" />
              </Field>
              <Field label="Beruf">
                <TextInput value={form.beruf} onChange={(v: string) => setF('beruf', v)} />
              </Field>
              <Field label="Blutdruck">
                <TextInput value={form.blutdruck} onChange={(v: string) => setF('blutdruck', v)} placeholder="z.B. 120/80" />
              </Field>
              <Field label="Puls">
                <TextInput value={form.puls} onChange={(v: string) => setF('puls', v)} placeholder="z.B. 72" />
              </Field>
              <Field label="Sprache">
                <select value={form.sprache} onChange={e => setF('sprache', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  {SPRACHEN.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Allergien */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Pill className="h-4 w-4" /> Allergien
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Field key={i} label={`Allergie ${i}`}>
                  <Select value={form[`allergie_${i}`]} onChange={v => setF(`allergie_${i}`, v)} options={ALLERGIES} placeholder="-- Allergie wählen --" />
                </Field>
              ))}
              <Field label="Weitere Allergien (Freitext)" className="md:col-span-3">
                <TextArea value={form.allergien_freitext} onChange={(v: string) => setF('allergien_freitext', v)} rows={2} />
              </Field>
            </div>
          </div>

          {/* Unverträglichkeiten */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" /> Unverträglichkeiten
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Field key={i} label={`Unverträglichkeit ${i}`}>
                  <Select value={form[`unvertr_${i}`]} onChange={v => setF(`unvertr_${i}`, v)} options={INTOLERANCES} placeholder="-- wählen --" />
                </Field>
              ))}
              <Field label="Weitere Unverträglichkeiten (Freitext)" className="md:col-span-3">
                <TextArea value={form.unvertr_freitext} onChange={(v: string) => setF('unvertr_freitext', v)} rows={2} />
              </Field>
            </div>
          </div>

          {/* Weiter-Button */}
          <button onClick={() => setActiveTab(2)}
            className="w-full py-3 rounded-lg bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 flex items-center justify-center gap-2">
            Weiter zu Behandlung <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ═══ SEITE 2: Behandlung ═══ */}
      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Behandlungsplanung
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Paket / Package" className="md:col-span-2">
                <Select value={form.paket} onChange={v => setF('paket', v)} options={PACKAGES} placeholder="-- Paket wählen --" />
              </Field>
              <Field label="Ayurvedische Kräuter" className="md:col-span-2">
                <TextArea value={form.kraeuter} onChange={(v: string) => setF('kraeuter', v)} rows={3} placeholder="Kräuter und Dosierungen..." />
              </Field>
              <Field label="Info an Abteilung" className="md:col-span-2">
                <TextArea value={form.info_abteilung} onChange={(v: string) => setF('info_abteilung', v)} rows={2} placeholder="Wichtige Hinweise für die Abteilungen..." />
              </Field>
              <Field label="Schwerpunkt / Ziel" className="md:col-span-2">
                <TextArea value={form.schwerpunkt_ziel} onChange={(v: string) => setF('schwerpunkt_ziel', v)} rows={3} placeholder="Therapieziel des Aufenthalts..." />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4" /> Anamnese
            </h3>
            <Field label="Operationen">
              <TextArea value={form.operationen} onChange={(v: string) => setF('operationen', v)} rows={3} placeholder="Bisherige Operationen..." />
            </Field>
            <Field label="Beschwerden (körperlich)">
              <TextArea value={form.beschwerden} onChange={(v: string) => setF('beschwerden', v)} rows={4} placeholder="Aktuelle körperliche Beschwerden..." />
            </Field>
            <Field label="Emotional">
              <TextArea value={form.emotional} onChange={(v: string) => setF('emotional', v)} rows={3} placeholder="Emotionaler Zustand..." />
            </Field>
            <Field label="Diagnose">
              <TextArea value={form.diagnose} onChange={(v: string) => setF('diagnose', v)} rows={4} placeholder="Ärztliche Diagnose..." />
            </Field>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setActiveTab(1)}
              className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-medium text-sm hover:bg-muted/30">
              ← Stammdaten
            </button>
            <button onClick={() => setActiveTab(3)}
              className="flex-1 py-3 rounded-lg bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 flex items-center justify-center gap-2">
              Weiter zu Medizinisch <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ SEITE 3: Medizinisch ═══ */}
      {activeTab === 3 && (
        <div className="space-y-6">
          {/* Blutwerte & Medikamente */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Blutwerte & Medikamente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Blutwerte von welchem Jahr?">
                <TextInput value={form.blutwerte_jahr} onChange={(v: string) => setF('blutwerte_jahr', v)} placeholder="z.B. 2025" />
              </Field>
            </div>
            <Field label="Aktuelle Medikamente">
              <TextArea value={form.medikamente} onChange={(v: string) => setF('medikamente', v)} rows={3} placeholder="Welche Medikamente nehmen Sie aktuell?" />
            </Field>
          </div>

          {/* Eltern */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Eltern / Familiengeschichte</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Mutter lebt?">
                <select value={form.mutter_lebt === null ? '' : form.mutter_lebt ? 'ja' : 'nein'}
                  onChange={e => setF('mutter_lebt', e.target.value === '' ? null : e.target.value === 'ja')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="">--</option><option value="ja">Ja</option><option value="nein">Nein</option>
                </select>
              </Field>
              <Field label="Krankheiten Mutter">
                <TextInput value={form.krankheiten_mutter} onChange={(v: string) => setF('krankheiten_mutter', v)} />
              </Field>
              <Field label="Vater lebt?">
                <select value={form.vater_lebt === null ? '' : form.vater_lebt ? 'ja' : 'nein'}
                  onChange={e => setF('vater_lebt', e.target.value === '' ? null : e.target.value === 'ja')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
                  <option value="">--</option><option value="ja">Ja</option><option value="nein">Nein</option>
                </select>
              </Field>
              <Field label="Krankheiten Vater">
                <TextInput value={form.krankheiten_vater} onChange={(v: string) => setF('krankheiten_vater', v)} />
              </Field>
            </div>
            <Field label="Frühgeburt?">
              <select value={form.fruehgeburt === null ? '' : form.fruehgeburt ? 'ja' : 'nein'}
                onChange={e => setF('fruehgeburt', e.target.value === '' ? null : e.target.value === 'ja')}
                className="w-48 px-3 py-2 rounded-lg border border-border bg-background text-sm">
                <option value="">--</option><option value="ja">Ja</option><option value="nein">Nein</option>
              </select>
            </Field>
          </div>

          {/* Kraft / Bala */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Kraft (Bala)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Körperlich">
                  <Select value={form.kraft_koerperlich} onChange={v => setF('kraft_koerperlich', v)} options={KRAFT_OPTIONS} />
                </Field>
                <Field label="Seit">
                  <TextInput value={form.kraft_koerperlich_seit} onChange={(v: string) => setF('kraft_koerperlich_seit', v)} placeholder="z.B. 2 Jahren" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Abwehr / Immunsystem">
                  <Select value={form.kraft_abwehr} onChange={v => setF('kraft_abwehr', v)} options={KRAFT_OPTIONS} />
                </Field>
                <Field label="Seit">
                  <TextInput value={form.kraft_abwehr_seit} onChange={(v: string) => setF('kraft_abwehr_seit', v)} placeholder="z.B. 6 Monaten" />
                </Field>
              </div>
            </div>
          </div>

          {/* Psyche */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4" /> Psychischer Zustand
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Hauptzustand">
                <Select value={form.psych_hauptzustand} onChange={v => setF('psych_hauptzustand', v)} options={PSYCH_STATES} />
              </Field>
              <Field label="Nebenzustand">
                <Select value={form.psych_nebenzustand} onChange={v => setF('psych_nebenzustand', v)} options={PSYCH_STATES} />
              </Field>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {PSYCH_CHECKBOXES.map(c => (
                <Checkbox key={c.key} checked={form[c.key]} onChange={v => setF(c.key, v)} label={c.label} />
              ))}
              <Checkbox checked={form.psych_kummer} onChange={v => setF('psych_kummer', v)} label="Kummer / Sorgen" />
            </div>
          </div>

          {/* Zungendiagnose */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Zungendiagnose</h3>
            <div className="flex gap-4 items-start">
              <svg viewBox="0 0 200 300" className="w-44 h-64 shrink-0">
                <ellipse cx="100" cy="150" rx="75" ry="130" fill="#E8B4B8" stroke="#c88" strokeWidth="2"/>
                <ellipse cx="100" cy="55" rx="50" ry="28" fill="#C75B5B" opacity="0.8"/>
                <text x="100" y="60" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Herz / Lunge</text>
                <circle cx="60" cy="120" r="28" fill="#7A8B6E" opacity="0.7"/>
                <text x="60" y="124" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Leber</text>
                <circle cx="100" cy="125" r="25" fill="#C4A35A" opacity="0.7"/>
                <text x="100" y="122" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Magen</text>
                <text x="100" y="136" textAnchor="middle" fill="white" fontSize="9">Milz</text>
                <circle cx="140" cy="120" r="22" fill="#8B9AAE" opacity="0.7"/>
                <text x="140" y="124" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Galle</text>
                <ellipse cx="100" cy="195" rx="40" ry="28" fill="#9B7DB8" opacity="0.7"/>
                <text x="100" y="199" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Dickdarm</text>
                <ellipse cx="100" cy="250" rx="32" ry="20" fill="#7A8B9A" opacity="0.7"/>
                <text x="100" y="254" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Niere</text>
              </svg>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">Größe, Form, Farbe, Oberfläche/Belag</p>
                <TextArea value={form.zungendiagnose} onChange={(v: string) => setF('zungendiagnose', v)} rows={8} placeholder="Befund..." />
              </div>
            </div>
          </div>

          {/* Signatur */}
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Unterschrift</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Arzt">
                <Select value={form.arzt} onChange={v => setF('arzt', v)} options={DOCTORS} placeholder="-- Arzt wählen --" />
              </Field>
              <Field label="Datum">
                <input type="date" value={form.signatur_datum || ''} onChange={e => setF('signatur_datum', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
              </Field>
            </div>
          </div>

          {/* Zurück + Abschließen */}
          <div className="flex gap-3">
            <button onClick={() => setActiveTab(2)}
              className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-medium text-sm hover:bg-muted/30">
              ← Behandlung
            </button>
            <button onClick={() => { setF('status', 'abgeschlossen'); handleSave(); }}
              className="flex-1 py-3 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 flex items-center justify-center gap-2">
              <Check className="h-4 w-4" /> Anamnese abschließen & speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

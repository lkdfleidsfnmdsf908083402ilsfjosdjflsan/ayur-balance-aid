import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, Mail, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';

export const VerwaltungsTrackerView = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('versicherungen');
  const [isLoading, setIsLoading] = useState(true);
  const [versicherungen, setVersicherungen] = useState<any[]>([]);
  const [reparaturen, setReparaturen] = useState<any[]>([]);
  const [tuevWartungen, setTuevWartungen] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAbnahmeDialog, setShowAbnahmeDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newEntry, setNewEntry] = useState({ bereich_anlage: '', versicherungsart: '', massnahme: '', wartung_pruefung: '', kategorie: '', dringlichkeit: '', intervall: '', faellig_am: '', zustaendig: '' });
  const [abnahme, setAbnahme] = useState({ check_1: false, check_2: false, check_3: false, check_4: false, check_5: false, check_6: false, abnahme_notiz: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [versRes, repRes, tuevRes] = await Promise.all([
        supabase.from('admin_versicherungen').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_reparaturen').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_tuev_wartungen').select('*').order('created_at', { ascending: false })
      ]);
      if (versRes.data) setVersicherungen(versRes.data);
      if (repRes.data) setReparaturen(repRes.data);
      if (tuevRes.data) setTuevWartungen(tuevRes.data);
    } catch (error) {
      toast({ title: 'Fehler', description: 'Daten konnten nicht geladen werden', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleAddEntry = async () => {
    try {
      let table = activeTab === 'versicherungen' ? 'admin_versicherungen' : activeTab === 'reparaturen' ? 'admin_reparaturen' : 'admin_tuev_wartungen';
      let data: any = { bereich_anlage: newEntry.bereich_anlage, faellig_am: newEntry.faellig_am || null, zustaendig: newEntry.zustaendig };
      if (activeTab === 'versicherungen') data.versicherungsart = newEntry.versicherungsart;
      else if (activeTab === 'reparaturen') { data.massnahme = newEntry.massnahme; data.kategorie = newEntry.kategorie; data.dringlichkeit = newEntry.dringlichkeit; }
      else { data.wartung_pruefung = newEntry.wartung_pruefung; data.intervall = newEntry.intervall; }
      const { error } = await supabase.from(table).insert(data);
      if (error) throw error;
      toast({ title: 'Erfolg', description: 'Eintrag erstellt' });
      setShowAddDialog(false);
      setNewEntry({ bereich_anlage: '', versicherungsart: '', massnahme: '', wartung_pruefung: '', kategorie: '', dringlichkeit: '', intervall: '', faellig_am: '', zustaendig: '' });
      loadData();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht erstellt werden', variant: 'destructive' });
    }
  };

  const handleAbnahme = async () => {
    if (!selectedItem) return;
    try {
      let table = activeTab === 'versicherungen' ? 'admin_versicherungen' : activeTab === 'reparaturen' ? 'admin_reparaturen' : 'admin_tuev_wartungen';
      const { error } = await supabase.from(table).update({
        status: 'Erledigt', erledigt_am: new Date().toISOString().split('T')[0], abgenommen_von: 'Admin',
        check_1: abnahme.check_1 ? '✓' : '✗', check_2: abnahme.check_2 ? '✓' : '✗', check_3: abnahme.check_3 ? '✓' : '✗',
        check_4: abnahme.check_4 ? '✓' : '✗', check_5: abnahme.check_5 ? '✓' : '✗', check_6: abnahme.check_6 ? '✓' : '✗', abnahme_notiz: abnahme.abnahme_notiz
      }).eq('id', selectedItem.id);
      if (error) throw error;
      toast({ title: 'Erfolg', description: 'Abnahme gespeichert' });
      setShowAbnahmeDialog(false);
      setSelectedItem(null);
      setAbnahme({ check_1: false, check_2: false, check_3: false, check_4: false, check_5: false, check_6: false, abnahme_notiz: '' });
      loadData();
    } catch (error) {
      toast({ title: 'Fehler', description: 'Abnahme fehlgeschlagen', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { 'Offen': 'bg-yellow-500', 'In Bearbeitung': 'bg-blue-500', 'Erledigt': 'bg-green-500', 'Prüfung': 'bg-orange-500' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{status || 'Offen'}</Badge>;
  };

  const handleCalendarExport = async (item: any) => {
    try {
      const response = await fetch('https://zxyvfdvmyftefrkoaave.supabase.co/functions/v1/create-calendar-event', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eXZmZHZteWZ0ZWZya29hYXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDMxODIsImV4cCI6MjA4MzM3OTE4Mn0.EtMbx8fY-BCItyi_VTgFqiBRTahPlHNgbM5mFj7Yi1U' },
        body: JSON.stringify({ auto_id: item.auto_id, bereich_anlage: item.bereich_anlage, faellig_am: item.faellig_am })
      });
      const data = await response.json();
      if (data.ics_download) { const link = document.createElement('a'); link.href = data.ics_download; link.download = `${item.auto_id}.ics`; link.click(); toast({ title: 'Erfolg', description: 'Kalender heruntergeladen' }); }
    } catch (error) { toast({ title: 'Fehler', description: 'Export fehlgeschlagen', variant: 'destructive' }); }
  };

  const renderTable = (data: any[], type: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Bereich/Anlage</TableHead>
          <TableHead>{type === 'versicherungen' ? 'Versicherungsart' : type === 'reparaturen' ? 'Maßnahme' : 'Wartung/Prüfung'}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fällig am</TableHead>
          <TableHead>Zuständig</TableHead>
          <TableHead>Erinnerung</TableHead>
          <TableHead>Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm">{item.auto_id}</TableCell>
            <TableCell>{item.bereich_anlage}</TableCell>
            <TableCell>{type === 'versicherungen' ? item.versicherungsart : type === 'reparaturen' ? item.massnahme : item.wartung_pruefung}</TableCell>
            <TableCell>{getStatusBadge(item.status)}</TableCell>
            <TableCell>{item.faellig_am}</TableCell>
            <TableCell>{item.zustaendig}</TableCell>
            <TableCell>{item.reminder_sent ? <Badge variant="outline" className="text-green-500"><Mail className="w-3 h-3 mr-1" />Gesendet</Badge> : <Badge variant="outline" className="text-gray-400"><Clock className="w-3 h-3 mr-1" />Ausstehend</Badge>}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                {item.faellig_am && <Button size="sm" variant="outline" onClick={() => handleCalendarExport(item)}><Calendar className="w-4 h-4" /></Button>}
                {isAdmin && item.status !== 'Erledigt' && <Button size="sm" variant="default" onClick={() => { setSelectedItem(item); setShowAbnahmeDialog(true); }}><CheckCircle className="w-4 h-4" /></Button>}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Verwaltungs-Tracker</h1><p className="text-muted-foreground">Versicherungen, Reparaturen & TÜV/Wartungen</p></div>
        <Button onClick={() => setShowAddDialog(true)}><Plus className="w-4 h-4 mr-2" />Neuer Eintrag</Button>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="versicherungen"><FileText className="w-4 h-4 mr-2" />Versicherungen ({versicherungen.length})</TabsTrigger>
          <TabsTrigger value="reparaturen"><AlertTriangle className="w-4 h-4 mr-2" />Reparaturen ({reparaturen.length})</TabsTrigger>
          <TabsTrigger value="tuev"><CheckCircle className="w-4 h-4 mr-2" />TÜV & Wartungen ({tuevWartungen.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="versicherungen"><Card><CardHeader><CardTitle>Versicherungsschäden</CardTitle></CardHeader><CardContent><ScrollArea className="h-[600px]">{renderTable(versicherungen, 'versicherungen')}</ScrollArea></CardContent></Card></TabsContent>
        <TabsContent value="reparaturen"><Card><CardHeader><CardTitle>Reparaturen & Maßnahmen</CardTitle></CardHeader><CardContent><ScrollArea className="h-[600px]">{renderTable(reparaturen, 'reparaturen')}</ScrollArea></CardContent></Card></TabsContent>
        <TabsContent value="tuev"><Card><CardHeader><CardTitle>TÜV & Wartungen</CardTitle></CardHeader><CardContent><ScrollArea className="h-[600px]">{renderTable(tuevWartungen, 'tuev')}</ScrollArea></CardContent></Card></TabsContent>
      </Tabs>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuer Eintrag</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Bereich/Anlage *</Label><Input value={newEntry.bereich_anlage} onChange={(e) => setNewEntry({ ...newEntry, bereich_anlage: e.target.value })} placeholder="z.B. Chlordioxidanlage" /></div>
            {activeTab === 'versicherungen' && <div><Label>Versicherungsart</Label><Select value={newEntry.versicherungsart} onValueChange={(v) => setNewEntry({ ...newEntry, versicherungsart: v })}><SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger><SelectContent><SelectItem value="Maschinenbruch">Maschinenbruch</SelectItem><SelectItem value="Glasbruch">Glasbruch</SelectItem><SelectItem value="Leitungswasser">Leitungswasser</SelectItem><SelectItem value="Feuer">Feuer</SelectItem></SelectContent></Select></div>}
            {activeTab === 'reparaturen' && <><div><Label>Maßnahme</Label><Input value={newEntry.massnahme} onChange={(e) => setNewEntry({ ...newEntry, massnahme: e.target.value })} /></div><div><Label>Kategorie</Label><Select value={newEntry.kategorie} onValueChange={(v) => setNewEntry({ ...newEntry, kategorie: v })}><SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger><SelectContent><SelectItem value="Reparatur">Reparatur</SelectItem><SelectItem value="Ersatz">Ersatz</SelectItem><SelectItem value="Sanierung">Sanierung</SelectItem></SelectContent></Select></div></>}
            {activeTab === 'tuev' && <><div><Label>Wartung/Prüfung</Label><Input value={newEntry.wartung_pruefung} onChange={(e) => setNewEntry({ ...newEntry, wartung_pruefung: e.target.value })} /></div><div><Label>Intervall</Label><Select value={newEntry.intervall} onValueChange={(v) => setNewEntry({ ...newEntry, intervall: v })}><SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger><SelectContent><SelectItem value="Monatlich">Monatlich</SelectItem><SelectItem value="Jährlich">Jährlich</SelectItem><SelectItem value="Alle 2 Jahre">Alle 2 Jahre</SelectItem></SelectContent></Select></div></>}
            <div><Label>Fällig am</Label><Input type="date" value={newEntry.faellig_am} onChange={(e) => setNewEntry({ ...newEntry, faellig_am: e.target.value })} /></div>
            <div><Label>Zuständig</Label><Input value={newEntry.zustaendig} onChange={(e) => setNewEntry({ ...newEntry, zustaendig: e.target.value })} placeholder="z.B. Technik" /></div>
            <Button onClick={handleAddEntry} className="w-full" disabled={!newEntry.bereich_anlage}>Eintrag erstellen</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAbnahmeDialog} onOpenChange={setShowAbnahmeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abnahme - {selectedItem?.auto_id}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selectedItem?.bereich_anlage}</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_1} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_1: !!c })} /><Label>✓1: Maßnahme vollständig?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_2} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_2: !!c })} /><Label>✓2: Dokumentation vorhanden?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_3} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_3: !!c })} /><Label>✓3: Qualität geprüft?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_4} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_4: !!c })} /><Label>✓4: Nächster Termin eingetragen?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_5} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_5: !!c })} /><Label>✓5: Alle informiert?</Label></div>
              <div className="flex items-center space-x-2"><Checkbox checked={abnahme.check_6} onCheckedChange={(c) => setAbnahme({ ...abnahme, check_6: !!c })} /><Label>✓6: Keine Mängel?</Label></div>
            </div>
            <div><Label>Notiz</Label><Input value={abnahme.abnahme_notiz} onChange={(e) => setAbnahme({ ...abnahme, abnahme_notiz: e.target.value })} /></div>
            <Button onClick={handleAbnahme} className="w-full"><CheckCircle className="w-4 h-4 mr-2" />Abnahme bestätigen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
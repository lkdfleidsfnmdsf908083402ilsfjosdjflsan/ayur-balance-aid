import { useState, useEffect } from 'react';
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
import { Plus, Pencil, Trash2, Users, Building2, Clock, Euro, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

const ABTEILUNGEN = [
  'Logis', 'F&B', 'Spa', 'Ärztin', 'Shop', 
  'Verwaltung', 'Technik', 'Energie', 'Marketing', 
  'Personal', 'Finanzierung', 'Sonstiges',
  'Housekeeping', 'Küche', 'Service', 'Rezeption'
];

const ANSTELLUNGSARTEN: Employee['anstellungsart'][] = [
  'Vollzeit', 'Teilzeit', 'Mini-Job', 'Aushilfe', 'Praktikant', 'Azubi'
];

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

export function MitarbeiterStammdatenView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>(initialFormData);
  const [filter, setFilter] = useState({ abteilung: 'alle', aktiv: 'alle' });
  const [lohnaufwandMonat, setLohnaufwandMonat] = useState<number>(0);

  // Berechne Stundenlohn aus monatlichem Lohnaufwand (Österreich: 14 Monatsgehälter)
  // Formel: (Monatslohn * 14) / (Wochenstunden * 52 Wochen/Jahr)
  const berechneStundenlohn = (monatslohn: number, wochenstunden: number): number => {
    if (wochenstunden <= 0) return 0;
    const jahresbrutto = monatslohn * 14; // 14 Monatsgehälter in Österreich
    const jahresstunden = wochenstunden * 52; // 52 Wochen pro Jahr
    return jahresbrutto / jahresstunden;
  };

  // Berechne Lohnaufwand aus Stundenlohn (für Bearbeitung)
  const berechneLohnaufwand = (stundenlohn: number, wochenstunden: number): number => {
    const jahresstunden = wochenstunden * 52;
    const jahresbrutto = stundenlohn * jahresstunden;
    return jahresbrutto / 14; // Zurück auf Monatslohn
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
      toast.error('Fehler beim Laden der Mitarbeiter');
      console.error(error);
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.personalnummer || !formData.vorname || !formData.nachname) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    if (formData.wochenstunden_soll < 0 || formData.wochenstunden_soll > 60) {
      toast.error('Wochenstunden müssen zwischen 0 und 60 liegen');
      return;
    }

    if (formData.stundenlohn < 0) {
      toast.error('Stundenlohn kann nicht negativ sein');
      return;
    }

    const payload = {
      ...formData,
      email: formData.email || null,
      telefon: formData.telefon || null,
      position: formData.position || null,
    };

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', editingEmployee.id);

      if (error) {
        toast.error('Fehler beim Aktualisieren');
        console.error(error);
      } else {
        toast.success('Mitarbeiter aktualisiert');
        loadEmployees();
      }
    } else {
      const { error } = await supabase
        .from('employees')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') {
          toast.error('Personalnummer existiert bereits');
        } else {
          toast.error('Fehler beim Anlegen');
          console.error(error);
        }
      } else {
        toast.success('Mitarbeiter angelegt');
        loadEmployees();
      }
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
    // Berechne Lohnaufwand aus bestehendem Stundenlohn
    setLohnaufwandMonat(berechneLohnaufwand(employee.stundenlohn, employee.wochenstunden_soll));
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mitarbeiter wirklich löschen?')) return;

    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    } else {
      toast.success('Mitarbeiter gelöscht');
      loadEmployees();
    }
  };

  const filteredEmployees = employees.filter((e) => {
    if (filter.abteilung !== 'alle' && e.abteilung !== filter.abteilung) return false;
    if (filter.aktiv === 'aktiv' && !e.aktiv) return false;
    if (filter.aktiv === 'inaktiv' && e.aktiv) return false;
    return true;
  });

  // Statistiken
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Mitarbeiter Stammdaten</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingEmployee(null);
            setFormData(initialFormData);
            setLohnaufwandMonat(0);
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Neuer Mitarbeiter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="personalnummer">Personalnummer *</Label>
                <Input
                  id="personalnummer"
                  value={formData.personalnummer}
                  onChange={(e) => setFormData({ ...formData, personalnummer: e.target.value })}
                  placeholder="z.B. MA001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abteilung">Abteilung *</Label>
                <Select value={formData.abteilung} onValueChange={(v) => setFormData({ ...formData, abteilung: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ABTEILUNGEN.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname *</Label>
                <Input
                  id="vorname"
                  value={formData.vorname}
                  onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname *</Label>
                <Input
                  id="nachname"
                  value={formData.nachname}
                  onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.telefon || ''}
                  onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="z.B. Rezeptionist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anstellungsart">Anstellungsart *</Label>
                <Select 
                  value={formData.anstellungsart} 
                  onValueChange={(v) => setFormData({ ...formData, anstellungsart: v as Employee['anstellungsart'] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANSTELLUNGSARTEN.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wochenstunden">Wochenstunden Soll *</Label>
                <Input
                  id="wochenstunden"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.wochenstunden_soll}
                  onChange={(e) => {
                    const neueStunden = parseFloat(e.target.value) || 0;
                    const neuerStundenlohn = berechneStundenlohn(lohnaufwandMonat, neueStunden);
                    setFormData({ 
                      ...formData, 
                      wochenstunden_soll: neueStunden,
                      stundenlohn: Math.round(neuerStundenlohn * 100) / 100
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="lohnaufwand">Gesamter Lohnaufwand p.m. (€) *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Österreichisches System: Berechnung basiert auf 14 Monatsgehältern (inkl. Urlaubs- und Weihnachtsgeld im Juni und November).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="lohnaufwand"
                  type="number"
                  min={0}
                  step={0.01}
                  value={lohnaufwandMonat}
                  onChange={(e) => {
                    const neuerLohnaufwand = parseFloat(e.target.value) || 0;
                    setLohnaufwandMonat(neuerLohnaufwand);
                    const neuerStundenlohn = berechneStundenlohn(neuerLohnaufwand, formData.wochenstunden_soll);
                    setFormData({ 
                      ...formData, 
                      stundenlohn: Math.round(neuerStundenlohn * 100) / 100
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jahresbrutto">Jahresbrutto (€) - berechnet</Label>
                <Input
                  id="jahresbrutto"
                  type="text"
                  value={(lohnaufwandMonat * 14).toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stundenlohn">Stundenlohn (€) - berechnet</Label>
                <Input
                  id="stundenlohn"
                  type="number"
                  value={formData.stundenlohn.toFixed(2)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eintrittsdatum">Eintrittsdatum *</Label>
                <Input
                  id="eintrittsdatum"
                  type="date"
                  value={formData.eintrittsdatum}
                  onChange={(e) => setFormData({ ...formData, eintrittsdatum: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="austrittsdatum">Austrittsdatum</Label>
                <Input
                  id="austrittsdatum"
                  type="date"
                  value={formData.austrittsdatum || ''}
                  onChange={(e) => setFormData({ ...formData, austrittsdatum: e.target.value || null })}
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="aktiv"
                  checked={formData.aktiv}
                  onCheckedChange={(checked) => setFormData({ ...formData, aktiv: checked })}
                />
                <Label htmlFor="aktiv">Aktiv</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={handleSubmit}>{editingEmployee ? 'Speichern' : 'Anlegen'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistik-Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Gesamt</span>
            </div>
            <p className="text-2xl font-bold">{stats.gesamt}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Aktiv</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.aktiv}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Vollzeit</span>
            </div>
            <p className="text-2xl font-bold">{stats.vollzeit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Teilzeit</span>
            </div>
            <p className="text-2xl font-bold">{stats.teilzeit}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Wochenstunden</span>
            </div>
            <p className="text-2xl font-bold">{stats.gesamtStunden.toFixed(0)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Ø Stundenlohn</span>
            </div>
            <p className="text-2xl font-bold">{stats.durchschnittLohn.toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="min-w-[200px]">
              <Label>Abteilung</Label>
              <Select value={filter.abteilung} onValueChange={(v) => setFilter({ ...filter, abteilung: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Abteilungen</SelectItem>
                  {ABTEILUNGEN.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <Label>Status</Label>
              <Select value={filter.aktiv} onValueChange={(v) => setFilter({ ...filter, aktiv: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle</SelectItem>
                  <SelectItem value="aktiv">Nur Aktive</SelectItem>
                  <SelectItem value="inaktiv">Nur Inaktive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mitarbeiter-Tabelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mitarbeiterliste ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nr.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Art</TableHead>
                    <TableHead className="text-right">Std/Woche</TableHead>
                    <TableHead className="text-right">€/Std</TableHead>
                    <TableHead>Eintritt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => (
                    <TableRow key={e.id} className={!e.aktiv ? 'opacity-50' : ''}>
                      <TableCell className="font-mono">{e.personalnummer}</TableCell>
                      <TableCell className="font-medium">{e.nachname}, {e.vorname}</TableCell>
                      <TableCell>{e.abteilung}</TableCell>
                      <TableCell>{e.position || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={e.anstellungsart === 'Vollzeit' ? 'default' : 'secondary'}>
                          {e.anstellungsart}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{e.wochenstunden_soll}h</TableCell>
                      <TableCell className="text-right">{e.stundenlohn.toFixed(2)}€</TableCell>
                      <TableCell>{format(new Date(e.eintrittsdatum), 'dd.MM.yyyy', { locale: de })}</TableCell>
                      <TableCell>
                        <Badge variant={e.aktiv ? 'default' : 'destructive'}>
                          {e.aktiv ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        Keine Mitarbeiter gefunden
                      </TableCell>
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

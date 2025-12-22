import { useState, useEffect } from 'react';
import { Plus, Trash2, Mail, User, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFinanceStore } from '@/store/financeStore';

interface Abteilungsleiter {
  id: string;
  abteilung: string;
  name: string;
  email: string;
  aktiv: boolean;
}

const abteilungen = [
  'Küche', 'Restaurant', 'Bar', 'Bankett', 'Housekeeping', 
  'Rezeption', 'Spa', 'Verwaltung', 'Technik', 'Einkauf'
];

export const AbteilungsleiterView = () => {
  const [leiter, setLeiter] = useState<Abteilungsleiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const { selectedYear, selectedMonth } = useFinanceStore();

  const [newLeiter, setNewLeiter] = useState({
    abteilung: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    loadLeiter();
  }, []);

  const loadLeiter = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('abteilungsleiter')
        .select('*')
        .order('abteilung');

      if (error) throw error;
      setLeiter(data || []);
    } catch (error) {
      console.error('Error loading Abteilungsleiter:', error);
      toast.error('Fehler beim Laden der Abteilungsleiter');
    } finally {
      setIsLoading(false);
    }
  };

  const addLeiter = async () => {
    if (!newLeiter.abteilung || !newLeiter.name || !newLeiter.email) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    try {
      const { error } = await supabase
        .from('abteilungsleiter')
        .upsert({
          abteilung: newLeiter.abteilung,
          name: newLeiter.name,
          email: newLeiter.email,
          aktiv: true
        }, { onConflict: 'abteilung' });

      if (error) throw error;

      toast.success('Abteilungsleiter hinzugefügt');
      setIsDialogOpen(false);
      setNewLeiter({ abteilung: '', name: '', email: '' });
      loadLeiter();
    } catch (error) {
      console.error('Error adding Abteilungsleiter:', error);
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const toggleAktiv = async (id: string, currentAktiv: boolean) => {
    try {
      const { error } = await supabase
        .from('abteilungsleiter')
        .update({ aktiv: !currentAktiv })
        .eq('id', id);

      if (error) throw error;
      loadLeiter();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Fehler beim Ändern des Status');
    }
  };

  const deleteLeiter = async (id: string) => {
    try {
      const { error } = await supabase
        .from('abteilungsleiter')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Abteilungsleiter gelöscht');
      loadLeiter();
    } catch (error) {
      console.error('Error deleting Abteilungsleiter:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const sendMonthlyReports = async () => {
    setIsSendingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-monthly-report', {
        body: { jahr: selectedYear, monat: selectedMonth }
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      toast.success(`${successCount} Report(s) erfolgreich versendet`);
    } catch (error) {
      console.error('Error sending reports:', error);
      toast.error('Fehler beim Versenden der Reports');
    } finally {
      setIsSendingReport(false);
    }
  };

  const monatNamen = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Abteilungsleiter" 
        description="Verwalten Sie die Kontaktdaten der Abteilungsleiter für E-Mail-Benachrichtigungen"
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Abteilungsleiter hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Abteilungsleiter hinzufügen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Abteilung</Label>
                    <Select
                      value={newLeiter.abteilung}
                      onValueChange={(value) => setNewLeiter({ ...newLeiter, abteilung: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Abteilung wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {abteilungen.map((abt) => (
                          <SelectItem key={abt} value={abt}>{abt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newLeiter.name}
                      onChange={(e) => setNewLeiter({ ...newLeiter, name: e.target.value })}
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={newLeiter.email}
                      onChange={(e) => setNewLeiter({ ...newLeiter, email: e.target.value })}
                      placeholder="max.mustermann@hotel.de"
                    />
                  </div>
                  <Button onClick={addLeiter} className="w-full">
                    Speichern
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Button 
            variant="outline" 
            onClick={sendMonthlyReports}
            disabled={isSendingReport || leiter.filter(l => l.aktiv).length === 0}
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSendingReport ? 'Sende...' : `Reports für ${monatNamen[selectedMonth - 1]} ${selectedYear} senden`}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Abteilungsleiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Lade...</p>
            ) : leiter.length === 0 ? (
              <p className="text-muted-foreground">Noch keine Abteilungsleiter konfiguriert</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leiter.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {l.abteilung}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {l.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {l.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.aktiv ? "default" : "secondary"}>
                          {l.aktiv ? 'Aktiv' : 'Inaktiv'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAktiv(l.id, l.aktiv)}
                          >
                            {l.aktiv ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLeiter(l.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

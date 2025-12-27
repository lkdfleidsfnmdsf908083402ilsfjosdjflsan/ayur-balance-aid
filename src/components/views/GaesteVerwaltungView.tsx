import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  UserCheck,
  Heart,
  Sparkles,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Guest {
  id: string;
  gast_nummer: string;
  anrede: string | null;
  vorname: string;
  nachname: string;
  geburtsdatum: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
  newsletter_optin: boolean;
  marketing_optin: boolean;
  herkunftsland: string | null;
  sprache: string | null;
  allergien: string[] | null;
  ernaehrungshinweise: string | null;
  zimmerpraeferenz: string | null;
  sonderwuensche: string | null;
  arzt_freigabe: boolean;
  medizinische_hinweise: string | null;
  erstbesuch_datum: string | null;
  letzter_besuch: string | null;
  anzahl_aufenthalte: number;
  gesamtumsatz: number;
  vip_status: boolean;
  notizen: string | null;
}

interface GuestStay {
  id: string;
  guest_id: string;
  anreise: string;
  abreise: string;
  naechte: number;
  buchungskanal: string | null;
  gasttyp: string;
  kurtyp: string | null;
  verpflegung: string | null;
  zimmer_nummer: string | null;
  zimmer_kategorie: string | null;
  zimmerpreis_nacht: number;
  gesamtpreis: number;
  spa_umsatz: number;
  fb_umsatz: number;
  sonstige_umsaetze: number;
  bewertung_gesamt: number | null;
  status: string;
}

interface GuestStats {
  totalGuests: number;
  newThisMonth: number;
  vipGuests: number;
  avgRevenue: number;
  returningRate: number;
}

const guestTypes = ['Wellness', 'Kurgast', 'Retreat', 'Tagesgast', 'Geschäftsreisend', 'Privat'];
const bookingChannels = ['Website', 'Telefon', 'Email', 'Booking.com', 'Expedia', 'HRS', 'Reisebüro', 'Empfehlung', 'Stammgast', 'Kooperation', 'Sonstige'];
const cureTypes = ['Fastenkur', 'Basenkur', 'Detox', 'Ayurveda', 'TCM', 'Physiotherapie', 'Rehabilitation', 'Mental Wellness', 'Gewichtsmanagement', 'Burnout-Prävention', 'Keine'];
const mealPlans = ['Vollpension', 'Halbpension', 'Frühstück', 'Ohne Verpflegung', 'Spezialdiät'];

export function GaesteVerwaltungView() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestStays, setGuestStays] = useState<GuestStay[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStayDialogOpen, setIsStayDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for new guest
  const [newGuest, setNewGuest] = useState({
    anrede: '',
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    mobil: '',
    geburtsdatum: '',
    strasse: '',
    plz: '',
    ort: '',
    land: 'Deutschland',
    herkunftsland: 'Deutschland',
    sprache: 'Deutsch',
    newsletter_optin: false,
    marketing_optin: false,
    allergien: '',
    ernaehrungshinweise: '',
    zimmerpraeferenz: '',
    sonderwuensche: '',
    arzt_freigabe: false,
    medizinische_hinweise: '',
    vip_status: false,
    notizen: ''
  });

  // Form state for new stay
  const [newStay, setNewStay] = useState({
    anreise: '',
    abreise: '',
    gasttyp: 'Wellness',
    kurtyp: 'Keine',
    buchungskanal: 'Website',
    verpflegung: 'Halbpension',
    zimmer_nummer: '',
    zimmer_kategorie: '',
    zimmerpreis_nacht: 0,
    gesamtpreis: 0,
    spa_umsatz: 0,
    fb_umsatz: 0,
    sonstige_umsaetze: 0,
    status: 'Gebucht'
  });

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('nachname', { ascending: true });

      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error('Error loading guests:', error);
      toast({
        title: 'Fehler',
        description: 'Gäste konnten nicht geladen werden',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGuestStays = async (guestId: string) => {
    try {
      const { data, error } = await supabase
        .from('guest_stays')
        .select('*')
        .eq('guest_id', guestId)
        .order('anreise', { ascending: false });

      if (error) throw error;
      setGuestStays(data || []);
    } catch (error) {
      console.error('Error loading stays:', error);
    }
  };

  const generateGuestNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `G${year}-${random}`;
  };

  const handleAddGuest = async () => {
    try {
      const guestData = {
        gast_nummer: generateGuestNumber(),
        anrede: newGuest.anrede || null,
        vorname: newGuest.vorname,
        nachname: newGuest.nachname,
        email: newGuest.email || null,
        telefon: newGuest.telefon || null,
        mobil: newGuest.mobil || null,
        geburtsdatum: newGuest.geburtsdatum || null,
        strasse: newGuest.strasse || null,
        plz: newGuest.plz || null,
        ort: newGuest.ort || null,
        land: newGuest.land,
        herkunftsland: newGuest.herkunftsland || null,
        sprache: newGuest.sprache,
        newsletter_optin: newGuest.newsletter_optin,
        marketing_optin: newGuest.marketing_optin,
        allergien: newGuest.allergien ? newGuest.allergien.split(',').map(a => a.trim()) : null,
        ernaehrungshinweise: newGuest.ernaehrungshinweise || null,
        zimmerpraeferenz: newGuest.zimmerpraeferenz || null,
        sonderwuensche: newGuest.sonderwuensche || null,
        arzt_freigabe: newGuest.arzt_freigabe,
        medizinische_hinweise: newGuest.medizinische_hinweise || null,
        vip_status: newGuest.vip_status,
        notizen: newGuest.notizen || null,
        erstbesuch_datum: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('guests').insert(guestData);

      if (error) throw error;

      toast({
        title: 'Erfolg',
        description: 'Gast wurde erfolgreich angelegt'
      });

      setIsAddDialogOpen(false);
      loadGuests();
      resetNewGuestForm();
    } catch (error) {
      console.error('Error adding guest:', error);
      toast({
        title: 'Fehler',
        description: 'Gast konnte nicht angelegt werden',
        variant: 'destructive'
      });
    }
  };

  const handleAddStay = async () => {
    if (!selectedGuest) return;

    try {
      const { error } = await supabase.from('guest_stays').insert([{
        guest_id: selectedGuest.id,
        anreise: newStay.anreise,
        abreise: newStay.abreise,
        gasttyp: newStay.gasttyp as any,
        kurtyp: newStay.kurtyp as any,
        buchungskanal: newStay.buchungskanal as any,
        verpflegung: newStay.verpflegung as any,
        zimmer_nummer: newStay.zimmer_nummer || null,
        zimmer_kategorie: newStay.zimmer_kategorie || null,
        zimmerpreis_nacht: newStay.zimmerpreis_nacht,
        gesamtpreis: newStay.gesamtpreis,
        spa_umsatz: newStay.spa_umsatz,
        fb_umsatz: newStay.fb_umsatz,
        sonstige_umsaetze: newStay.sonstige_umsaetze,
        status: newStay.status
      }]);

      if (error) throw error;

      // Update guest stats
      const totalStayRevenue = newStay.gesamtpreis + newStay.spa_umsatz + newStay.fb_umsatz + newStay.sonstige_umsaetze;
      await supabase
        .from('guests')
        .update({
          anzahl_aufenthalte: selectedGuest.anzahl_aufenthalte + 1,
          gesamtumsatz: selectedGuest.gesamtumsatz + totalStayRevenue,
          letzter_besuch: newStay.abreise
        })
        .eq('id', selectedGuest.id);

      toast({
        title: 'Erfolg',
        description: 'Aufenthalt wurde erfolgreich angelegt'
      });

      setIsStayDialogOpen(false);
      loadGuestStays(selectedGuest.id);
      loadGuests();
      resetNewStayForm();
    } catch (error) {
      console.error('Error adding stay:', error);
      toast({
        title: 'Fehler',
        description: 'Aufenthalt konnte nicht angelegt werden',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('Möchten Sie diesen Gast wirklich löschen?')) return;

    try {
      const { error } = await supabase.from('guests').delete().eq('id', guestId);
      if (error) throw error;

      toast({
        title: 'Erfolg',
        description: 'Gast wurde gelöscht'
      });

      loadGuests();
      setSelectedGuest(null);
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast({
        title: 'Fehler',
        description: 'Gast konnte nicht gelöscht werden',
        variant: 'destructive'
      });
    }
  };

  const resetNewGuestForm = () => {
    setNewGuest({
      anrede: '',
      vorname: '',
      nachname: '',
      email: '',
      telefon: '',
      mobil: '',
      geburtsdatum: '',
      strasse: '',
      plz: '',
      ort: '',
      land: 'Deutschland',
      herkunftsland: 'Deutschland',
      sprache: 'Deutsch',
      newsletter_optin: false,
      marketing_optin: false,
      allergien: '',
      ernaehrungshinweise: '',
      zimmerpraeferenz: '',
      sonderwuensche: '',
      arzt_freigabe: false,
      medizinische_hinweise: '',
      vip_status: false,
      notizen: ''
    });
  };

  const resetNewStayForm = () => {
    setNewStay({
      anreise: '',
      abreise: '',
      gasttyp: 'Wellness',
      kurtyp: 'Keine',
      buchungskanal: 'Website',
      verpflegung: 'Halbpension',
      zimmer_nummer: '',
      zimmer_kategorie: '',
      zimmerpreis_nacht: 0,
      gesamtpreis: 0,
      spa_umsatz: 0,
      fb_umsatz: 0,
      sonstige_umsaetze: 0,
      status: 'Gebucht'
    });
  };

  const filteredGuests = useMemo(() => {
    if (!searchTerm) return guests;
    const term = searchTerm.toLowerCase();
    return guests.filter(g => 
      g.vorname.toLowerCase().includes(term) ||
      g.nachname.toLowerCase().includes(term) ||
      g.gast_nummer.toLowerCase().includes(term) ||
      g.email?.toLowerCase().includes(term)
    );
  }, [guests, searchTerm]);

  const stats: GuestStats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const newThisMonth = guests.filter(g => g.erstbesuch_datum?.startsWith(thisMonth)).length;
    const vipGuests = guests.filter(g => g.vip_status).length;
    const totalRevenue = guests.reduce((sum, g) => sum + g.gesamtumsatz, 0);
    const avgRevenue = guests.length > 0 ? totalRevenue / guests.length : 0;
    const returning = guests.filter(g => g.anzahl_aufenthalte > 1).length;
    const returningRate = guests.length > 0 ? (returning / guests.length) * 100 : 0;

    return {
      totalGuests: guests.length,
      newThisMonth,
      vipGuests,
      avgRevenue,
      returningRate
    };
  }, [guests]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const getGuestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Wellness': 'bg-emerald-500/20 text-emerald-400',
      'Kurgast': 'bg-blue-500/20 text-blue-400',
      'Retreat': 'bg-purple-500/20 text-purple-400',
      'Tagesgast': 'bg-amber-500/20 text-amber-400',
      'Geschäftsreisend': 'bg-slate-500/20 text-slate-400',
      'Privat': 'bg-rose-500/20 text-rose-400'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Gästeverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Gäste und deren Aufenthalte</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Neuer Gast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neuen Gast anlegen</DialogTitle>
              <DialogDescription>Erfassen Sie die Stammdaten des Gastes</DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Anrede</Label>
                <Select value={newGuest.anrede} onValueChange={v => setNewGuest({...newGuest, anrede: v})}>
                  <SelectTrigger><SelectValue placeholder="Auswählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Herr">Herr</SelectItem>
                    <SelectItem value="Frau">Frau</SelectItem>
                    <SelectItem value="Divers">Divers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Geburtsdatum</Label>
                <Input 
                  type="date" 
                  value={newGuest.geburtsdatum} 
                  onChange={e => setNewGuest({...newGuest, geburtsdatum: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Vorname *</Label>
                <Input 
                  value={newGuest.vorname} 
                  onChange={e => setNewGuest({...newGuest, vorname: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nachname *</Label>
                <Input 
                  value={newGuest.nachname} 
                  onChange={e => setNewGuest({...newGuest, nachname: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>E-Mail</Label>
                <Input 
                  type="email"
                  value={newGuest.email} 
                  onChange={e => setNewGuest({...newGuest, email: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input 
                  value={newGuest.telefon} 
                  onChange={e => setNewGuest({...newGuest, telefon: e.target.value})}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Straße</Label>
                <Input 
                  value={newGuest.strasse} 
                  onChange={e => setNewGuest({...newGuest, strasse: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>PLZ</Label>
                <Input 
                  value={newGuest.plz} 
                  onChange={e => setNewGuest({...newGuest, plz: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Ort</Label>
                <Input 
                  value={newGuest.ort} 
                  onChange={e => setNewGuest({...newGuest, ort: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Land</Label>
                <Input 
                  value={newGuest.land} 
                  onChange={e => setNewGuest({...newGuest, land: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Sprache</Label>
                <Input 
                  value={newGuest.sprache} 
                  onChange={e => setNewGuest({...newGuest, sprache: e.target.value})}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Allergien (kommagetrennt)</Label>
                <Input 
                  value={newGuest.allergien} 
                  onChange={e => setNewGuest({...newGuest, allergien: e.target.value})}
                  placeholder="z.B. Gluten, Laktose, Nüsse"
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Ernährungshinweise</Label>
                <Textarea 
                  value={newGuest.ernaehrungshinweise} 
                  onChange={e => setNewGuest({...newGuest, ernaehrungshinweise: e.target.value})}
                  placeholder="z.B. Vegetarisch, Vegan, etc."
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Sonderwünsche</Label>
                <Textarea 
                  value={newGuest.sonderwuensche} 
                  onChange={e => setNewGuest({...newGuest, sonderwuensche: e.target.value})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="newsletter" 
                  checked={newGuest.newsletter_optin}
                  onCheckedChange={c => setNewGuest({...newGuest, newsletter_optin: !!c})}
                />
                <Label htmlFor="newsletter">Newsletter abonniert</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="marketing" 
                  checked={newGuest.marketing_optin}
                  onCheckedChange={c => setNewGuest({...newGuest, marketing_optin: !!c})}
                />
                <Label htmlFor="marketing">Marketing erlaubt</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="vip" 
                  checked={newGuest.vip_status}
                  onCheckedChange={c => setNewGuest({...newGuest, vip_status: !!c})}
                />
                <Label htmlFor="vip">VIP-Status</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="arzt" 
                  checked={newGuest.arzt_freigabe}
                  onCheckedChange={c => setNewGuest({...newGuest, arzt_freigabe: !!c})}
                />
                <Label htmlFor="arzt">Arzt-Freigabe</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={handleAddGuest} disabled={!newGuest.vorname || !newGuest.nachname}>
                Gast anlegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalGuests}</p>
                <p className="text-xs text-muted-foreground">Gäste gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Plus className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.newThisMonth}</p>
                <p className="text-xs text-muted-foreground">Neu diesen Monat</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.vipGuests}</p>
                <p className="text-xs text-muted-foreground">VIP-Gäste</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.avgRevenue)}</p>
                <p className="text-xs text-muted-foreground">Ø Umsatz/Gast</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <UserCheck className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.returningRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Wiederkehrerquote</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest List */}
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gästeliste</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Suchen..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Gast-Nr.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead className="text-center">Aufenthalte</TableHead>
                    <TableHead className="text-right">Umsatz</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Lade Gäste...
                      </TableCell>
                    </TableRow>
                  ) : filteredGuests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Keine Gäste gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredGuests.slice(0, 20).map(guest => (
                      <TableRow 
                        key={guest.id} 
                        className={cn(
                          "cursor-pointer hover:bg-muted/30",
                          selectedGuest?.id === guest.id && "bg-primary/10"
                        )}
                        onClick={() => {
                          setSelectedGuest(guest);
                          loadGuestStays(guest.id);
                        }}
                      >
                        <TableCell className="font-mono text-sm">{guest.gast_nummer}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {guest.vip_status && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                            <span className="font-medium">{guest.anrede} {guest.vorname} {guest.nachname}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-0.5">
                            {guest.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {guest.email}
                              </div>
                            )}
                            {guest.telefon && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {guest.telefon}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{guest.anzahl_aufenthalte}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(guest.gesamtumsatz)}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGuest(guest.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredGuests.length > 20 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Zeige 20 von {filteredGuests.length} Gästen
              </p>
            )}
          </CardContent>
        </Card>

        {/* Guest Detail */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>
              {selectedGuest ? (
                <div className="flex items-center gap-2">
                  {selectedGuest.vip_status && <Star className="h-5 w-5 text-amber-400 fill-amber-400" />}
                  {selectedGuest.vorname} {selectedGuest.nachname}
                </div>
              ) : (
                'Gast auswählen'
              )}
            </CardTitle>
            {selectedGuest && (
              <CardDescription>{selectedGuest.gast_nummer}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedGuest ? (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
                  <TabsTrigger value="stays" className="flex-1">Aufenthalte</TabsTrigger>
                  <TabsTrigger value="prefs" className="flex-1">Präferenzen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {selectedGuest.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.email}</span>
                      </div>
                    )}
                    {selectedGuest.telefon && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.telefon}</span>
                      </div>
                    )}
                    {selectedGuest.ort && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedGuest.plz} {selectedGuest.ort}, {selectedGuest.land}</span>
                      </div>
                    )}
                    {selectedGuest.erstbesuch_datum && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Erstbesuch: {new Date(selectedGuest.erstbesuch_datum).toLocaleDateString('de-DE')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{selectedGuest.anzahl_aufenthalte}</p>
                      <p className="text-xs text-muted-foreground">Aufenthalte</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-lg font-bold">{formatCurrency(selectedGuest.gesamtumsatz)}</p>
                      <p className="text-xs text-muted-foreground">Gesamtumsatz</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <div className="flex items-center gap-1">
                      {selectedGuest.newsletter_optin && <Badge variant="outline" className="text-xs">Newsletter</Badge>}
                      {selectedGuest.marketing_optin && <Badge variant="outline" className="text-xs">Marketing</Badge>}
                      {selectedGuest.arzt_freigabe && <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400">Arzt ✓</Badge>}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stays" className="space-y-4 mt-4">
                  <Button 
                    className="w-full gap-2" 
                    variant="outline"
                    onClick={() => setIsStayDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Aufenthalt hinzufügen
                  </Button>
                  
                  <div className="space-y-2">
                    {guestStays.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Keine Aufenthalte erfasst
                      </p>
                    ) : (
                      guestStays.map(stay => (
                        <div key={stay.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={getGuestTypeBadge(stay.gasttyp)}>
                              {stay.gasttyp}
                            </Badge>
                            <Badge variant="outline">{stay.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(stay.anreise).toLocaleDateString('de-DE')} - {new Date(stay.abreise).toLocaleDateString('de-DE')}
                            <span className="text-muted-foreground">({stay.naechte} N)</span>
                          </div>
                          <div className="text-sm font-medium">
                            {formatCurrency(stay.gesamtpreis + stay.spa_umsatz + stay.fb_umsatz + stay.sonstige_umsaetze)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="prefs" className="space-y-4 mt-4">
                  {selectedGuest.allergien && selectedGuest.allergien.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Allergien</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedGuest.allergien.map((a, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedGuest.ernaehrungshinweise && (
                    <div>
                      <p className="text-sm font-medium mb-1">Ernährung</p>
                      <p className="text-sm text-muted-foreground">{selectedGuest.ernaehrungshinweise}</p>
                    </div>
                  )}
                  
                  {selectedGuest.zimmerpraeferenz && (
                    <div>
                      <p className="text-sm font-medium mb-1">Zimmerpräferenz</p>
                      <p className="text-sm text-muted-foreground">{selectedGuest.zimmerpraeferenz}</p>
                    </div>
                  )}
                  
                  {selectedGuest.sonderwuensche && (
                    <div>
                      <p className="text-sm font-medium mb-1">Sonderwünsche</p>
                      <p className="text-sm text-muted-foreground">{selectedGuest.sonderwuensche}</p>
                    </div>
                  )}
                  
                  {selectedGuest.medizinische_hinweise && (
                    <div>
                      <p className="text-sm font-medium mb-1 flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-400" />
                        Medizinische Hinweise
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedGuest.medizinische_hinweise}</p>
                    </div>
                  )}
                  
                  {selectedGuest.notizen && (
                    <div>
                      <p className="text-sm font-medium mb-1">Notizen</p>
                      <p className="text-sm text-muted-foreground">{selectedGuest.notizen}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>Wählen Sie einen Gast aus der Liste</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Stay Dialog */}
      <Dialog open={isStayDialogOpen} onOpenChange={setIsStayDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aufenthalt hinzufügen</DialogTitle>
            <DialogDescription>
              Neuen Aufenthalt für {selectedGuest?.vorname} {selectedGuest?.nachname}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Anreise *</Label>
              <Input 
                type="date" 
                value={newStay.anreise} 
                onChange={e => setNewStay({...newStay, anreise: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Abreise *</Label>
              <Input 
                type="date" 
                value={newStay.abreise} 
                onChange={e => setNewStay({...newStay, abreise: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Gasttyp</Label>
              <Select value={newStay.gasttyp} onValueChange={v => setNewStay({...newStay, gasttyp: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {guestTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Kurtyp</Label>
              <Select value={newStay.kurtyp} onValueChange={v => setNewStay({...newStay, kurtyp: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cureTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Buchungskanal</Label>
              <Select value={newStay.buchungskanal} onValueChange={v => setNewStay({...newStay, buchungskanal: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {bookingChannels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Verpflegung</Label>
              <Select value={newStay.verpflegung} onValueChange={v => setNewStay({...newStay, verpflegung: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mealPlans.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Zimmer-Nr.</Label>
              <Input 
                value={newStay.zimmer_nummer} 
                onChange={e => setNewStay({...newStay, zimmer_nummer: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Zimmerkategorie</Label>
              <Input 
                value={newStay.zimmer_kategorie} 
                onChange={e => setNewStay({...newStay, zimmer_kategorie: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Zimmerpreis/Nacht (€)</Label>
              <Input 
                type="number"
                value={newStay.zimmerpreis_nacht} 
                onChange={e => setNewStay({...newStay, zimmerpreis_nacht: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Gesamtpreis (€)</Label>
              <Input 
                type="number"
                value={newStay.gesamtpreis} 
                onChange={e => setNewStay({...newStay, gesamtpreis: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Spa-Umsatz (€)</Label>
              <Input 
                type="number"
                value={newStay.spa_umsatz} 
                onChange={e => setNewStay({...newStay, spa_umsatz: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>F&B-Umsatz (€)</Label>
              <Input 
                type="number"
                value={newStay.fb_umsatz} 
                onChange={e => setNewStay({...newStay, fb_umsatz: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStayDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleAddStay} disabled={!newStay.anreise || !newStay.abreise}>
              Aufenthalt speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

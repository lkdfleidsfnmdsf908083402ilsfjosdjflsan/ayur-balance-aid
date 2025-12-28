import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserCog, User, Users, Trash2, Edit, Plus, Search, MessageCircle, Loader2, UserPlus, KeyRound, Eye, Copy, CheckCircle, Link } from 'lucide-react';

type AppRole = 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'readonly';

interface UserWithRole {
  id: string;
  email: string;
  name: string | null;
  abteilung: string | null;
  role: AppRole;
  created_at: string;
}

const ROLE_LABELS: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: 'Administrator',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  abteilungsleiter: {
    label: 'Abteilungsleiter',
    icon: <UserCog className="h-4 w-4" />,
    color: 'bg-primary/20 text-primary border-primary/30',
  },
  mitarbeiter: {
    label: 'Mitarbeiter',
    icon: <User className="h-4 w-4" />,
    color: 'bg-muted text-muted-foreground border-muted-foreground/30',
  },
  readonly: {
    label: 'Nur-Lesen',
    icon: <Eye className="h-4 w-4" />,
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  },
};

const ABTEILUNGEN = [
  'Logis',
  'F&B',
  'Rezeption',
  'Spa',
  'Ärztin',
  'Shop',
  'Verwaltung',
  'Technik',
  'Energie',
  'Marketing',
  'Personal',
];

export function BenutzerVerwaltungView() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'abteilungsleiter' as AppRole,
    abteilung: '',
  });
  const [editForm, setEditForm] = useState({
    role: 'mitarbeiter' as AppRole,
    abteilung: '',
  });

  const { isAdmin, user: currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          abteilung: profile.abteilung,
          role: (userRole?.role as AppRole) || 'mitarbeiter',
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Benutzer konnten nicht geladen werden',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      abteilung: user.abteilung || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleResetPassword = (user: UserWithRole) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmNewPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!selectedUser) return;

    if (newPassword !== confirmNewPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwörter stimmen nicht überein',
        description: 'Bitte geben Sie dasselbe Passwort ein',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Passwort zu kurz',
        description: 'Das Passwort muss mindestens 6 Zeichen lang sein',
      });
      return;
    }

    setResettingPassword(true);
    try {
      const { error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: selectedUser.id,
          newPassword: newPassword,
        },
      });

      if (error) throw error;

      toast({
        title: 'Passwort geändert',
        description: `Das Passwort für ${selectedUser.name || selectedUser.email} wurde erfolgreich geändert.`,
      });

      setIsResetPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Passwort konnte nicht geändert werden',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      // Update role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.id,
          role: editForm.role,
        });

      if (insertError) throw insertError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ abteilung: editForm.abteilung || null })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      toast({
        title: 'Gespeichert',
        description: `Benutzer ${selectedUser.name || selectedUser.email} wurde aktualisiert.`,
      });

      setIsEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message,
      });
    }
  };

  const handleSendWhatsAppInvite = async () => {
    if (!inviteForm.email || !inviteForm.abteilung) {
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Bitte füllen Sie E-Mail und Abteilung aus.',
      });
      return;
    }

    try {
      // Create invitation in database
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: inviteForm.email.trim().toLowerCase(),
          role: inviteForm.role,
          abteilung: inviteForm.abteilung,
          invited_by: currentUser?.id,
        })
        .select()
        .single();

      if (inviteError) {
        throw new Error(inviteError.message);
      }

      // Prepare invite URL
      const appUrl = window.location.origin;
      const inviteUrl = `${appUrl}/invite/${invitation.token}`;
      
      // Store the URL for the link dialog
      setGeneratedInviteUrl(inviteUrl);
      setLinkCopied(false);

      if (phoneNumber) {
        // Prepare WhatsApp message with token link
        const roleName = ROLE_LABELS[inviteForm.role].label;
        const greeting = inviteForm.name ? `Hallo ${inviteForm.name}!` : 'Hallo!';
        
        const message = `${greeting}

Du wurdest zum Hotel Mandira KPI Dashboard eingeladen.

📊 *Deine Rolle:* ${roleName}
🏢 *Abteilung:* ${inviteForm.abteilung}

Klicke einfach auf diesen Link, gib deinen Namen und ein Passwort ein – fertig!

👉 ${inviteUrl}

Bei Fragen melde dich gerne!

Viele Grüße,
${userProfile?.name || 'Das Mandira Team'}`;

        // Format phone number (remove spaces, add country code if needed)
        let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0/, '43');
        if (!formattedPhone.startsWith('+') && !formattedPhone.startsWith('43')) {
          formattedPhone = '43' + formattedPhone;
        }
        formattedPhone = formattedPhone.replace('+', '');

        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = whatsappUrl;
        }

        toast({
          title: 'Einladung erstellt',
          description: 'WhatsApp wurde mit dem Einladungslink geöffnet.',
        });
      }

      // Close invite dialog and show link dialog
      setIsInviteDialogOpen(false);
      setIsInviteLinkDialogOpen(true);
      setInviteForm({ email: '', name: '', role: 'mitarbeiter', abteilung: '' });
      setPhoneNumber('');

    } catch (error: any) {
      console.error('Error creating invitation:', error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: error.message || 'Einladung konnte nicht erstellt werden',
      });
    }
  };

  const handleCopyInviteLink = async () => {
    await navigator.clipboard.writeText(generatedInviteUrl);
    setLinkCopied(true);
    toast({
      title: 'Link kopiert!',
      description: 'Der Einladungslink wurde in die Zwischenablage kopiert.',
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const roleStats = {
    admin: users.filter((u) => u.role === 'admin').length,
    abteilungsleiter: users.filter((u) => u.role === 'abteilungsleiter').length,
    mitarbeiter: users.filter((u) => u.role === 'mitarbeiter').length,
    readonly: users.filter((u) => u.role === 'readonly').length,
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Benutzerverwaltung" description="Zugriff verweigert" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="glass-card max-w-md">
            <CardContent className="pt-6 text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Zugriff verweigert</h2>
              <p className="text-muted-foreground">
                Sie benötigen Administrator-Rechte, um auf diese Seite zuzugreifen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Benutzerverwaltung" description="Benutzer und Rollen verwalten" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Shield className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats.admin}</p>
                  <p className="text-sm text-muted-foreground">Administratoren</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats.abteilungsleiter}</p>
                  <p className="text-sm text-muted-foreground">Abteilungsleiter</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats.mitarbeiter}</p>
                  <p className="text-sm text-muted-foreground">Mitarbeiter</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Eye className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats.readonly}</p>
                  <p className="text-sm text-muted-foreground">Nur-Lesen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Benutzer suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Rolle filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Rollen</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="abteilungsleiter">Abteilungsleiter</SelectItem>
                  <SelectItem value="mitarbeiter">Mitarbeiter</SelectItem>
                  <SelectItem value="readonly">Nur-Lesen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Benutzer ({filteredUsers.length})
              </CardTitle>
            </div>
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Einladen
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Abteilung</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Registriert</TableHead>
                    <TableHead className="w-20">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Wird geladen...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Keine Benutzer gefunden
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name || '-'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.abteilung || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ROLE_LABELS[user.role].color}>
                            {ROLE_LABELS[user.role].icon}
                            <span className="ml-1">{ROLE_LABELS[user.role].label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('de-DE')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              disabled={user.id === currentUser?.id}
                              title="Bearbeiten"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              disabled={user.id === currentUser?.id}
                              title="Passwort zurücksetzen"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedUser.name || 'Unbekannt'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: AppRole) => setEditForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrator
                      </div>
                    </SelectItem>
                    <SelectItem value="abteilungsleiter">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Abteilungsleiter
                      </div>
                    </SelectItem>
                    <SelectItem value="mitarbeiter">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Mitarbeiter
                      </div>
                    </SelectItem>
                    <SelectItem value="readonly">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Nur-Lesen
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Abteilung</Label>
                <Select
                  value={editForm.abteilung}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, abteilung: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Abteilung auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ABTEILUNGEN.map((abt) => (
                      <SelectItem key={abt} value={abt}>
                        {abt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveUser}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Neuen Benutzer einladen
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-Mail-Adresse *</Label>
              <Input
                type="email"
                placeholder="name@mandira-ayurveda.at"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                placeholder="Vor- und Nachname"
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Für die persönliche Begrüßung in der Einladung
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rolle *</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: AppRole) => setInviteForm((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mitarbeiter">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Mitarbeiter
                      </div>
                    </SelectItem>
                    <SelectItem value="abteilungsleiter">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Abteilungsleiter
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrator
                      </div>
                    </SelectItem>
                    <SelectItem value="readonly">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Nur-Lesen
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Abteilung *</Label>
                <Select
                  value={inviteForm.abteilung}
                  onValueChange={(value) => setInviteForm((prev) => ({ ...prev, abteilung: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ABTEILUNGEN.map((abt) => (
                      <SelectItem key={abt} value={abt}>
                        {abt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Telefonnummer (optional)</Label>
              <Input
                type="tel"
                placeholder="+43 664 1234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wenn angegeben, öffnet sich WhatsApp mit der Einladung
              </p>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
              <p className="text-primary font-medium">So funktioniert's:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Einladungslink wird erstellt (7 Tage gültig)</li>
                <li>Empfänger gibt nur Name + Passwort ein</li>
                <li>Account mit korrekter Rolle & Abteilung wird erstellt</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSendWhatsAppInvite}>
              {phoneNumber ? (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Per WhatsApp einladen
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Einladungslink erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={isInviteLinkDialogOpen} onOpenChange={setIsInviteLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Einladung erstellt!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                Der Einladungslink wurde erfolgreich erstellt.
              </p>
              <p className="text-sm text-muted-foreground">
                Senden Sie diesen Link an den neuen Benutzer. Er muss nur noch seinen Namen und ein Passwort eingeben.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Einladungslink
              </Label>
              <div className="flex gap-2">
                <Input
                  value={generatedInviteUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant={linkCopied ? 'default' : 'outline'}
                  size="icon"
                  onClick={handleCopyInviteLink}
                  className={linkCopied ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <p className="text-amber-600 dark:text-amber-400 font-medium">Wichtig:</p>
              <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>Der Link ist 7 Tage gültig</li>
                <li>Der Link kann nur einmal verwendet werden</li>
                <li>Kopieren Sie den Link und senden Sie ihn per E-Mail, SMS oder WhatsApp</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsInviteLinkDialogOpen(false)}>
              Fertig
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Passwort zurücksetzen
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedUser.name || 'Unbekannt'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>

              <div className="space-y-2">
                <Label>Neues Passwort *</Label>
                <Input
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Passwort bestätigen *</Label>
                <Input
                  type="password"
                  placeholder="Passwort wiederholen"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                />
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                <p className="text-amber-600 dark:text-amber-400 font-medium">Hinweis:</p>
                <p className="text-muted-foreground mt-1">
                  Das neue Passwort wird sofort aktiv. Der Benutzer sollte das Passwort bei der nächsten Anmeldung ändern.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirmResetPassword} disabled={resettingPassword}>
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird geändert...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Passwort ändern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

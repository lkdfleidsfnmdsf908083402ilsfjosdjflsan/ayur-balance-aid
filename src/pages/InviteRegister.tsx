import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Loader2, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Invitation {
  id: string;
  token: string;
  email: string;
  role: string;
  abteilung: string | null;
  expires_at: string;
}

const InviteRegister = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Kein Einladungstoken vorhanden');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError || !data) {
        setError('Diese Einladung ist ungültig oder abgelaufen.');
        setIsLoading(false);
        return;
      }

      setInvitation(data);
      setIsLoading(false);
    };

    fetchInvitation();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;

    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name erforderlich',
        description: 'Bitte geben Sie Ihren Namen ein',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Passwort zu kurz',
        description: 'Das Passwort muss mindestens 6 Zeichen lang sein',
      });
      return;
    }

    if (password !== passwordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Passwörter stimmen nicht überein',
        description: 'Bitte überprüfen Sie Ihre Eingabe',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the edge function to register with invitation
      const { data, error: registerError } = await supabase.functions.invoke('register-with-invitation', {
        body: {
          token: invitation.token,
          name: name.trim(),
          password,
        },
      });

      if (registerError) {
        throw new Error(registerError.message || 'Registrierung fehlgeschlagen');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast({
        title: 'Registrierung erfolgreich!',
        description: 'Sie können sich jetzt anmelden.',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: err.message || 'Ein Fehler ist aufgetreten',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'abteilungsleiter': return 'Abteilungsleiter';
      case 'mitarbeiter': return 'Mitarbeiter';
      case 'readonly': return 'Nur Lesen';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <MandiraLogo className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-bold text-destructive">
              Einladung ungültig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full mt-4" 
              variant="outline"
              onClick={() => navigate('/auth')}
            >
              Zur Anmeldung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Willkommen im Team!
            </CardTitle>
            <CardDescription>
              Ihr Account wurde erfolgreich erstellt. Sie werden zur Anmeldung weitergeleitet...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <MandiraLogo className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Willkommen bei Hotel Mandira!</CardTitle>
          <CardDescription>
            Vervollständigen Sie Ihre Registrierung
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show invitation details */}
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">E-Mail:</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rolle:</span>
              <span className="font-medium">{getRoleLabel(invitation?.role || '')}</span>
            </div>
            {invitation?.abteilung && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Abteilung:</span>
                <span className="font-medium">{invitation.abteilung}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ihr Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort erstellen *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">Passwort bestätigen *</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder="Passwort wiederholen"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird registriert...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrierung abschließen
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteRegister;
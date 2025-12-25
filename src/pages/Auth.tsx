import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

const ABTEILUNGEN = [
  'Housekeeping',
  'Küche',
  'Service',
  'Front Office',
  'Spa & Wellness',
  'Technik',
  'Administration',
];

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupAbteilung, setSignupAbteilung] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      let message = 'Ein Fehler ist aufgetreten';
      if (error.message.includes('Invalid login credentials')) {
        message = 'E-Mail oder Passwort ist falsch';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Bitte bestätigen Sie Ihre E-Mail-Adresse';
      }
      toast({
        variant: 'destructive',
        title: 'Anmeldung fehlgeschlagen',
        description: message,
      });
    } else {
      toast({
        title: 'Erfolgreich angemeldet',
        description: 'Willkommen zurück!',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!signupName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name erforderlich',
        description: 'Bitte geben Sie Ihren Namen ein',
      });
      setIsLoading(false);
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Passwort zu kurz',
        description: 'Das Passwort muss mindestens 6 Zeichen lang sein',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupName, signupAbteilung);

    if (error) {
      let message = 'Ein Fehler ist aufgetreten';
      if (error.message.includes('already registered')) {
        message = 'Diese E-Mail-Adresse ist bereits registriert';
      }
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: message,
      });
    } else {
      toast({
        title: 'Registrierung erfolgreich',
        description: 'Sie wurden automatisch angemeldet.',
      });
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <MandiraLogo className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Hotel Mandira</CardTitle>
          <CardDescription>
            KPI Dashboard - Melden Sie sich an oder registrieren Sie sich
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="gap-2">
                <LogIn className="h-4 w-4" />
                Anmelden
              </TabsTrigger>
              <TabsTrigger value="signup" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Registrieren
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="ihre.email@hotel.de"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passwort</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird angemeldet...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Anmelden
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Max Mustermann"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-Mail *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ihre.email@hotel.de"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passwort *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mindestens 6 Zeichen"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-abteilung">Abteilung</Label>
                  <Select value={signupAbteilung} onValueChange={setSignupAbteilung}>
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird registriert...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Registrieren
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

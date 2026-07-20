import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  userProfile: {
    id: string;
    email: string;
    vorname: string | null;
    nachname: string | null;
    name: string | null;
    abteilung: string | null;
    telefon: string | null;
    ist_aktiv: boolean;
    sprache: string;
    letzter_login: string | null;
  } | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, abteilung?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAbteilungsleiter: boolean;
  isMitarbeiter: boolean;
  isMedical: boolean;
  isCeo: boolean;
  isAdvisor: boolean;
  isReadonly: boolean;
  // canEdit: true = darf Daten ändern (nur Admin)
  // canEditInfluencer: true = darf Influencer anlegen/bearbeiten (Admin + CEO)
  canEdit: boolean;
  canEditInfluencer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<AuthContextType['userProfile']>(null);

  const fetchUserData = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileData) {
      setUserRole(profileData.role || 'mitarbeiter');
      setUserProfile({
        id: profileData.id,
        email: profileData.email,
        vorname: profileData.full_name ? profileData.full_name.split(' ')[0] : null,
        nachname: profileData.full_name ? profileData.full_name.split(' ').slice(1).join(' ') : null,
        name: profileData.full_name || profileData.email,
        abteilung: profileData.abteilung,
        telefon: null,
        ist_aktiv: true,
        sprache: 'de',
        letzter_login: null,
      });
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => { fetchUserData(session.user.id); }, 0);
        } else {
          setUserRole(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string, abteilung?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, abteilung },
      },
    });

    if (!error && data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email,
        full_name: name,
        abteilung: abteilung || null,
        role: 'mitarbeiter',
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
  };

  const isAdmin = userRole === 'admin';
  const isAbteilungsleiter = userRole === 'abteilungsleiter' || userRole === 'admin';
  const isMitarbeiter = userRole === 'mitarbeiter';
  // Medizinisches/Spa-Personal: Zugriff auf Gesundheitsdaten (Erstanamnese)
  const isMedical = userRole === 'medical';
  const isCeo = userRole === 'ceo';
  const isAdvisor = userRole === 'advisor';

  // CEO + Advisor + alle anderen = readonly (nur Admin darf alles ändern)
  const isReadonly = userRole === 'ceo' || userRole === 'advisor' || userRole === 'readonly';

  // canEdit: nur Admin darf Buchhaltungsdaten, Budget, Konten, Upload ändern
  const canEdit = userRole === 'admin';

  // canEditInfluencer: Admin + CEO dürfen Influencer anlegen/bearbeiten
  // Admin darf zusätzlich löschen (wird in der InfluencerView geprüft)
  const canEditInfluencer = userRole === 'admin' || userRole === 'ceo';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userRole,
        userProfile,
        signIn,
        signUp,
        signOut,
        isAdmin,
        isAbteilungsleiter,
        isMitarbeiter,
        isMedical,
        isCeo,
        isAdvisor,
        isReadonly,
        canEdit,
        canEditInfluencer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

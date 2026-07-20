import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Upload,
  Table2,
  BarChart3,
  GitCompare,
  ChevronDown,
  ShieldCheck,
  PieChart,
  TrendingUp,
  Target,
  Bell,
  Users,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
  ConciergeBell,
  Flower2,
  Wrench,
  Building2,
  UserCircle,
  CalendarDays,
  Clock,
  ClipboardList,
  Heart,
  Sun,
  LogOut,
  LucideIcon,
  ClipboardCheck,
  Package,
  Menu,
  X,
  Star,
  Key,
  Wine,
  Stethoscope,
  ScanLine,
} from 'lucide-react';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigation } from '@/contexts/NavigationContext';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor' | 'medical';
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  items: NavItem[];
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor' | 'medical';
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry;

const abteilungToKpiView: Record<string, string> = {
  'Housekeeping': 'housekeeping',
  'Küche': 'kitchen',
  'Service': 'service',
  'Front Office': 'frontoffice',
  'Rezeption': 'frontoffice',
  'Spa & Wellness': 'spa',
  'Spa': 'spa',
  'Technik': 'technical',
  'Administration': 'admin',
  'Verwaltung': 'admin',
};

const navStructure: NavEntry[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, requiredRole: 'abteilungsleiter' },
  { id: 'gaeste', labelKey: 'nav.guestManagement', icon: Heart, requiredRole: 'abteilungsleiter' },
  { id: 'sommer-kampagne', labelKey: 'Sommer-Kampagne', icon: Sun, requiredRole: 'abteilungsleiter' },
  { id: 'influencer', labelKey: 'nav.influencer', icon: Star, requiredRole: 'ceo' },
  { id: 'token-verwaltung', labelKey: 'nav.tokenVerwaltung', icon: Key, requiredRole: 'admin' },
  { id: 'kampagnen', labelKey: 'nav.kampagnen', icon: Users, requiredRole: 'admin' },
  { id: 'menue-weinbegleitung', labelKey: 'Menü & Weinbegleitung', icon: Wine },
  { id: 'weinscanner', labelKey: 'Weinscanner', icon: ScanLine },
  { id: 'erstanamnese', labelKey: 'Erstanamnese', icon: Stethoscope, requiredRole: 'medical' },
  {
    id: 'abteilung-kpis',
    labelKey: 'nav.departmentKpis',
    icon: PieChart,
    items: [
      { id: 'abteilung-kpi', labelKey: 'nav.overview', icon: PieChart, requiredRole: 'ceo' },
      { id: 'kpi-trends', labelKey: 'nav.kpiTrends', icon: TrendingUp, requiredRole: 'ceo' },
      { id: 'housekeeping', labelKey: 'nav.housekeeping', icon: Sparkles },
      { id: 'kitchen', labelKey: 'nav.kitchen', icon: ChefHat },
      { id: 'service', labelKey: 'nav.service', icon: UtensilsCrossed },
      { id: 'frontoffice', labelKey: 'nav.frontoffice', icon: ConciergeBell },
      { id: 'spa', labelKey: 'nav.spa', icon: Flower2 },
      { id: 'technical', labelKey: 'nav.technical', icon: Wrench },
      { id: 'admin', labelKey: 'nav.admin', icon: Building2 },
    ],
  },
  {
    id: 'personal-gruppe',
    labelKey: 'nav.personnelManagement',
    icon: Users,
    requiredRole: 'abteilungsleiter',
    items: [
      { id: 'mitarbeiter', labelKey: 'nav.employees', icon: UserCircle, requiredRole: 'abteilungsleiter' },
      { id: 'schichtplanung', labelKey: 'nav.shiftPlanningAll', icon: CalendarDays, requiredRole: 'abteilungsleiter' },
      { id: 'abteilung-schichtplanung', labelKey: 'nav.departmentShiftPlan', icon: ClipboardList },
      { id: 'zeitkonten', labelKey: 'nav.timeAccounts', icon: Clock, requiredRole: 'abteilungsleiter' },
      { id: 'personal-kpis', labelKey: 'nav.personnelKpis', icon: Users, requiredRole: 'abteilungsleiter' },
    ],
  },
  { id: 'verwaltung', labelKey: 'nav.adminTracker', icon: ClipboardCheck, requiredRole: 'admin' },
  { id: 'technik-bestellungen', labelKey: 'nav.technikBestellungen', icon: Package, requiredRole: 'abteilungsleiter' },
  {
    id: 'planung-gruppe',
    labelKey: 'nav.planningAlarms',
    icon: Target,
    requiredRole: 'abteilungsleiter',
    items: [
      { id: 'budget', labelKey: 'nav.budgetPlanning', icon: Target },
      { id: 'alarme', labelKey: 'nav.kpiAlarms', icon: Bell, requiredRole: 'abteilungsleiter' },
      { id: 'abteilungsleiter', labelKey: 'nav.departmentHeads', icon: Users, requiredRole: 'admin' },
      { id: 'benutzerverwaltung', labelKey: 'nav.userManagement', icon: ShieldCheck, requiredRole: 'admin' },
    ],
  },
  {
    id: 'daten-gruppe',
    labelKey: 'nav.dataAnalysis',
    icon: BarChart3,
    requiredRole: 'abteilungsleiter',
    items: [
      { id: 'upload', labelKey: 'nav.dataImport', icon: Upload, requiredRole: 'admin' },
      { id: 'konten', labelKey: 'nav.accountMaster', icon: Table2 },
      { id: 'vergleich', labelKey: 'nav.periodComparison', icon: GitCompare },
      { id: 'bereiche', labelKey: 'nav.areaAnalysis', icon: BarChart3 },
      { id: 'datenqualitaet', labelKey: 'nav.dataQuality', icon: ShieldCheck, requiredRole: 'abteilungsleiter' },
      { id: 'revenue-intelligence', labelKey: 'nav.revenueIntelligence', icon: TrendingUp, requiredRole: 'admin' },
      { id: 'gast-analytics', labelKey: 'nav.gastAnalytics', icon: Users, requiredRole: 'admin' },
      { id: 'enterprise-value', labelKey: 'nav.enterpriseValue', icon: TrendingUp, requiredRole: 'ceo' },
      { id: 'protel-comparison', labelKey: 'nav.protelComparison', icon: GitCompare, requiredRole: 'ceo' },
    ],
  },
];

// MobileNav reads activeView/onViewChange from a global store or prop-drilling via context.
// Since Header doesn't pass these props, we use window events to communicate.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['abteilung-kpis']);
  const { t } = useLanguage();
  const { userRole, userProfile, isAdmin } = useAuth();
  const { activeView, setActiveView } = useNavigation();

  const userAbteilungKpiView = userProfile?.abteilung
    ? abteilungToKpiView[userProfile.abteilung]
    : null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const hasRole = (requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor' | 'medical') => {
    if (!requiredRole) return true;
    if (userRole === 'admin') return true;
    // Gesundheitsdaten ('medical') ausschließlich für admin + medical
    if (requiredRole === 'medical') return userRole === 'medical';
    if (userRole === 'medical') return requiredRole === 'mitarbeiter';
    if (userRole === 'ceo') return requiredRole !== 'admin';
    if (userRole === 'advisor') return requiredRole !== 'admin' && requiredRole !== 'ceo';
    if (userRole === 'abteilungsleiter') return requiredRole === 'abteilungsleiter' || requiredRole === 'mitarbeiter';
    if (userRole === 'mitarbeiter') return requiredRole === 'mitarbeiter';
    return false;
  };

  const advisorAllowedGroups = ['dashboard', 'abteilung-kpis', 'planung-gruppe', 'daten-gruppe', 'influencer'];
  const advisorAllowedItems = [
    'dashboard', 'abteilung-kpi', 'kpi-trends',
    'housekeeping', 'kitchen', 'service', 'frontoffice', 'spa', 'technical', 'admin',
    'budget', 'konten', 'vergleich', 'bereiche', 'influencer',
  ];

  const filteredNav = useMemo(() => {
    return navStructure
      .filter(entry => {
        if (userRole === 'advisor') return advisorAllowedGroups.includes(entry.id);
        return hasRole(isNavGroup(entry) ? entry.requiredRole : entry.requiredRole);
      })
      .map(entry => {
        if (isNavGroup(entry)) {
          let items = entry.items.filter(item => {
            if (userRole === 'advisor') return advisorAllowedItems.includes(item.id);
            return hasRole(item.requiredRole);
          });
          if (userRole === 'mitarbeiter' && entry.id === 'abteilung-kpis') {
            items = items.filter(i => i.id === userAbteilungKpiView);
          }
          if (userRole === 'abteilungsleiter' && !isAdmin && entry.id === 'abteilung-kpis') {
            items = items.filter(i => i.id === userAbteilungKpiView);
          }
          if (items.length === 0) return null;
          return { ...entry, items };
        }
        return entry;
      })
      .filter(Boolean) as NavEntry[];
  }, [userRole, userAbteilungKpiView, isAdmin]);

  const navigateTo = (id: string) => {
    setActiveView(id);
    setOpen(false);
  };

  const toggleGroup = (id: string) => {
    setOpenGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const renderItem = (item: NavItem, sub = false) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        onClick={() => navigateTo(item.id)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
          sub && 'pl-9 text-sm',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
        <span className={cn('text-sm font-medium truncate', isActive && 'text-foreground')}>{t(item.labelKey)}</span>
      </button>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups.includes(group.id);
    return (
      <Collapsible key={group.id} open={isOpen} onOpenChange={() => toggleGroup(group.id)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/70 transition-colors">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium flex-1 text-left truncate">{t(group.labelKey)}</span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {(group as NavGroup).items.map(item => renderItem(item, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors text-foreground">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3">
            <MandiraLogo className="h-8 w-8 text-primary shrink-0" />
            <div>
              <h1 className="text-base font-semibold text-sidebar-foreground leading-tight">{t('nav.financialAnalysis')}</h1>
              <p className="text-xs text-muted-foreground">{t('nav.hotelBalanceLists')}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filteredNav.map(entry =>
            isNavGroup(entry) ? renderGroup(entry) : renderItem(entry)
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          {userProfile && (
            <div className="mb-2 px-3 py-2 text-xs text-sidebar-foreground/60">
              <div className="font-medium text-sidebar-foreground/80 truncate">{userProfile.name}</div>
              <div className="truncate">{userProfile.email}</div>
              <div className="capitalize text-primary/70">{userRole}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Abmelden</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

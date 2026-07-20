import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  Upload, 
  Table2, 
    BarChart3, 
  GitCompare,
  ChevronLeft,
  ChevronRight,
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
  Activity,
  Hotel,
  Star,
  Key,
  Wine,
  Stethoscope,
  ScanLine,
  Megaphone,
  Clapperboard,
} from 'lucide-react';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor';
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  items: NavItem[];
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor';
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
  return 'items' in entry;
};

// Map abteilung to KPI view ID
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

const SIDEBAR_STORAGE_KEY = 'sidebar-open-groups';

const navStructure: NavEntry[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, requiredRole: 'abteilungsleiter' },
  { id: 'gaeste', labelKey: 'nav.guestManagement', icon: Heart, requiredRole: 'abteilungsleiter' },
  { id: 'sommer-kampagne', labelKey: 'Sommer-Kampagne', icon: Sun, requiredRole: 'admin' },
  // Influencer-Kalender: sichtbar für Admin, CEO, Advisor — kein requiredRole = alle sehen es
  // Sichtbarkeitssteuerung erfolgt in filteredNavStructure via advisorAllowedItems
  { id: 'influencer', labelKey: 'nav.influencer', icon: Star, requiredRole: 'ceo' },
  { id: 'token-verwaltung', labelKey: 'nav.tokenVerwaltung', icon: Key, requiredRole: 'admin' },
  { id: 'kampagnen', labelKey: 'nav.kampagnen', icon: Users, requiredRole: 'admin' },
  { id: 'social-agent', labelKey: 'Social Media Agent', icon: Megaphone, requiredRole: 'admin' },
  { id: 'social-medien', labelKey: 'Medien-Bibliothek', icon: Clapperboard, requiredRole: 'admin' },
  { id: 'menue-weinbegleitung', labelKey: 'Menü & Weinbegleitung', icon: Wine },
  { id: 'weinscanner', labelKey: 'Weinscanner', icon: ScanLine },
  { id: 'erstanamnese', labelKey: 'Erstanamnese', icon: Stethoscope },
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
    ]
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
    ]
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
    ]
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
    ]  
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();
  const { userRole, userProfile, isAdmin, isAbteilungsleiter } = useAuth();
  
  const userAbteilungKpiView = userProfile?.abteilung 
    ? abteilungToKpiView[userProfile.abteilung] 
    : null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const hasRole = (requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter' | 'ceo' | 'advisor') => {
    if (!requiredRole) return true;

    // Admin sieht alles
    if (userRole === 'admin') return true;

    // CEO: alles außer admin-only
    if (userRole === 'ceo') {
      return requiredRole !== 'admin';
    }

    // Advisor: nur dashboard, abteilung-kpis (alle), budget, konten, vergleich, bereiche
    if (userRole === 'advisor') {
      if (requiredRole === 'admin') return false;
      if (requiredRole === 'ceo') return false;
      return true;
    }

    // Abteilungsleiter
    if (userRole === 'abteilungsleiter') {
      return requiredRole === 'abteilungsleiter' || requiredRole === 'mitarbeiter';
    }

    // Mitarbeiter
    if (userRole === 'mitarbeiter') {
      return requiredRole === 'mitarbeiter';
    }

    return false;
  };

  // Advisor: welche Gruppen-IDs und Items darf er sehen?
  const advisorAllowedGroups = ['dashboard', 'abteilung-kpis', 'planung-gruppe', 'daten-gruppe', 'influencer'];
  const advisorAllowedItems = [
    'dashboard', 'abteilung-kpi', 'kpi-trends',
    'housekeeping', 'kitchen', 'service', 'frontoffice', 'spa', 'technical', 'admin',
    'budget', 'konten', 'vergleich', 'bereiche',
    'influencer',
  ];

  const filteredNavStructure = useMemo(() => {
    return navStructure
      .filter(entry => {
        // Advisor: nur erlaubte Gruppen/Items
        if (userRole === 'advisor') {
          return advisorAllowedGroups.includes(entry.id);
        }
        if (isNavGroup(entry)) {
          return hasRole(entry.requiredRole);
        } else {
          return hasRole(entry.requiredRole);
        }
      })
      .map(entry => {
        if (isNavGroup(entry)) {
          let filteredItems = entry.items.filter(item => {
            // Advisor: nur erlaubte Items
            if (userRole === 'advisor') {
              return advisorAllowedItems.includes(item.id);
            }
            return hasRole(item.requiredRole);
          });
          
          // Für mitarbeiter: nur ihre Abteilung
          if (userRole === 'mitarbeiter' && entry.id === 'abteilung-kpis') {
            filteredItems = filteredItems.filter(item => item.id === userAbteilungKpiView);
          }
          
          // Für abteilungsleiter (nicht admin): nur ihre Abteilung
          if (userRole === 'abteilungsleiter' && !isAdmin && entry.id === 'abteilung-kpis') {
            filteredItems = filteredItems.filter(item => item.id === userAbteilungKpiView);
          }
          
          if (filteredItems.length === 0) return null;
          return { ...entry, items: filteredItems };
        }
        return entry;
      })
      .filter(Boolean) as NavEntry[];
  }, [userRole, userAbteilungKpiView, isAdmin, isAbteilungsleiter]);
  
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading sidebar state:', e);
    }
    return ['abteilung-kpis', 'personal-gruppe'];
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(openGroups));
    } catch (e) {
      console.error('Error saving sidebar state:', e);
    }
  }, [openGroups]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isActiveInGroup = (group: NavGroup) => {
    return group.items.some(item => item.id === activeView);
  };

  const renderNavItem = (item: NavItem, isSubItem = false) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    
    return (
      <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
          "hover:bg-sidebar-accent",
          isSubItem && !collapsed && "pl-9",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground glow-primary" 
            : "text-sidebar-foreground/70"
        )}
      >
        <Icon className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive && "text-primary"
        )} />
        {!collapsed && (
          <span className={cn(
            "text-sm font-medium animate-fade-in truncate",
            isActive && "text-foreground"
          )}>
            {t(item.labelKey)}
          </span>
        )}
      </button>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups.includes(group.id);
    const hasActiveItem = isActiveInGroup(group);

    if (collapsed) {
      return (
        <div key={group.id} className="space-y-1">
          <button
            onClick={() => {
              setCollapsed(false);
              if (!isOpen) toggleGroup(group.id);
            }}
            className={cn(
              "w-full flex items-center justify-center p-2 rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent",
              hasActiveItem 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70"
            )}
            title={t(group.labelKey)}
          >
            <Icon className={cn(
              "h-5 w-5 shrink-0",
              hasActiveItem && "text-primary"
            )} />
          </button>
        </div>
      );
    }

    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent",
              hasActiveItem 
                ? "text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/70"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              hasActiveItem && "text-primary"
            )} />
            <span className={cn(
              "text-sm font-medium flex-1 text-left truncate",
              hasActiveItem && "text-foreground"
            )}>
              {t(group.labelKey)}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {group.items.map(item => renderNavItem(item, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300 hidden md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <MandiraLogo className="h-8 w-8 text-primary shrink-0" />
        {!collapsed && (
          <div className="ml-3 animate-fade-in">
            <h1 className="text-lg font-semibold text-sidebar-foreground">{t('nav.financialAnalysis')}</h1>
            <p className="text-xs text-muted-foreground">{t('nav.hotelBalanceLists')}</p>
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavStructure.map((entry) => {
          if (isNavGroup(entry)) {
            return renderNavGroup(entry);
          }
          return renderNavItem(entry);
        })}
      </nav>
      
      {/* User Info & Logout */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && userProfile && (
          <div className="mb-2 px-3 py-2 text-xs text-sidebar-foreground/60">
            <div className="font-medium text-sidebar-foreground/80 truncate">
              {userProfile.name}
            </div>
            <div className="truncate">{userProfile.email}</div>
            <div className="truncate capitalize text-primary/70">{userRole}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            "bg-red-600 text-white hover:bg-red-700"
          )}
          title="Abmelden"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium animate-fade-in">
              Abmelden
            </span>
          )}
        </button>
      </div>
      
      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}

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
  LucideIcon
} from 'lucide-react';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter';
}

interface NavGroup {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  items: NavItem[];
  requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter';
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
  { 
    id: 'abteilung-kpis',
    labelKey: 'nav.departmentKpis',
    icon: PieChart,
    items: [
      { id: 'abteilung-kpi', labelKey: 'nav.overview', icon: PieChart, requiredRole: 'abteilungsleiter' },
      { id: 'kpi-trends', labelKey: 'nav.kpiTrends', icon: TrendingUp, requiredRole: 'abteilungsleiter' },
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
    items: [
      { id: 'mitarbeiter', labelKey: 'nav.employees', icon: UserCircle, requiredRole: 'abteilungsleiter' },
      { id: 'schichtplanung', labelKey: 'nav.shiftPlanningAll', icon: CalendarDays, requiredRole: 'abteilungsleiter' },
      { id: 'abteilung-schichtplanung', labelKey: 'nav.departmentShiftPlan', icon: ClipboardList },
      { id: 'zeitkonten', labelKey: 'nav.timeAccounts', icon: Clock, requiredRole: 'abteilungsleiter' },
      { id: 'personal-kpis', labelKey: 'nav.personnelKpis', icon: Users, requiredRole: 'abteilungsleiter' },
    ]
  },
  {
    id: 'planung-gruppe',
    labelKey: 'nav.planningAlarms',
    icon: Target,
    requiredRole: 'abteilungsleiter',
    items: [
      { id: 'budget', labelKey: 'nav.budgetPlanning', icon: Target },
      { id: 'alarme', labelKey: 'nav.kpiAlarms', icon: Bell },
      { id: 'abteilungsleiter', labelKey: 'nav.departmentHeads', icon: Users, requiredRole: 'admin' },
      { id: 'benutzerverwaltung', labelKey: 'nav.userManagement', icon: ShieldCheck, requiredRole: 'admin' },
    ]
  },
  {
    id: 'daten-gruppe',
    labelKey: 'nav.dataAnalysis',
    icon: BarChart3,
    requiredRole: 'admin',
    items: [
      { id: 'upload', labelKey: 'nav.dataImport', icon: Upload },
      { id: 'konten', labelKey: 'nav.accountMaster', icon: Table2 },
      { id: 'vergleich', labelKey: 'nav.periodComparison', icon: GitCompare },
      { id: 'bereiche', labelKey: 'nav.areaAnalysis', icon: BarChart3 },
      { id: 'datenqualitaet', labelKey: 'nav.dataQuality', icon: ShieldCheck },
    ]
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();
  const { userRole, userProfile, isAdmin, isAbteilungsleiter } = useAuth();
  
  // Get the user's department KPI view
  const userAbteilungKpiView = userProfile?.abteilung 
    ? abteilungToKpiView[userProfile.abteilung] 
    : null;

  // Role hierarchy check
  const hasRole = (requiredRole?: 'admin' | 'abteilungsleiter' | 'mitarbeiter') => {
    if (!requiredRole) return true;
    const roleHierarchy = { admin: 3, abteilungsleiter: 2, mitarbeiter: 1, readonly: 1 };
    const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 1;
    const requiredRoleLevel = roleHierarchy[requiredRole];
    return userRoleLevel >= requiredRoleLevel;
  };

  // Filter navigation based on role and department
  const filteredNavStructure = useMemo(() => {
    return navStructure
      .filter(entry => {
        // Check group-level permission
        if (isNavGroup(entry)) {
          if (!hasRole(entry.requiredRole)) return false;
        } else {
          if (!hasRole(entry.requiredRole)) return false;
        }
        return true;
      })
      .map(entry => {
        if (isNavGroup(entry)) {
          // Filter items within the group
          let filteredItems = entry.items.filter(item => hasRole(item.requiredRole));
          
          // For mitarbeiter: only show their department's KPI
          if (userRole === 'mitarbeiter' && entry.id === 'abteilung-kpis') {
            filteredItems = filteredItems.filter(item => 
              item.id === userAbteilungKpiView
            );
          }
          
          // Don't show empty groups
          if (filteredItems.length === 0) return null;
          
          return { ...entry, items: filteredItems };
        }
        return entry;
      })
      .filter(Boolean) as NavEntry[];
  }, [userRole, userAbteilungKpiView, isAdmin, isAbteilungsleiter]);
  
  // Load saved state from LocalStorage
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading sidebar state:', e);
    }
    return ['abteilung-kpis', 'personal-gruppe'];
  });

  // Save state to LocalStorage whenever it changes
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
      // Im eingeklappten Zustand nur das Icon der Gruppe zeigen
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

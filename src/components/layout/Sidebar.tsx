import { useState, useEffect } from 'react';
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
  LucideIcon
} from 'lucide-react';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

const isNavGroup = (entry: NavEntry): entry is NavGroup => {
  return 'items' in entry;
};

const SIDEBAR_STORAGE_KEY = 'sidebar-open-groups';

const navStructure: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    id: 'abteilung-kpis',
    label: 'Abteilungs-KPIs',
    icon: PieChart,
    items: [
      { id: 'abteilung-kpi', label: 'Übersicht', icon: PieChart },
      { id: 'kpi-trends', label: 'KPI-Trends', icon: TrendingUp },
      { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles },
      { id: 'kitchen', label: 'Küche', icon: ChefHat },
      { id: 'service', label: 'Service', icon: UtensilsCrossed },
      { id: 'frontoffice', label: 'Rezeption', icon: ConciergeBell },
      { id: 'spa', label: 'Spa', icon: Flower2 },
      { id: 'technical', label: 'Technik', icon: Wrench },
      { id: 'admin', label: 'Verwaltung', icon: Building2 },
    ]
  },
  {
    id: 'personal-gruppe',
    label: 'Personalmanagement',
    icon: Users,
    items: [
      { id: 'mitarbeiter', label: 'Mitarbeiter', icon: UserCircle },
      { id: 'schichtplanung', label: 'Schichtplanung (Alle)', icon: CalendarDays },
      { id: 'abteilung-schichtplanung', label: 'Abteilungs-Schichtplan', icon: ClipboardList },
      { id: 'zeitkonten', label: 'Zeitkonten', icon: Clock },
      { id: 'personal-kpis', label: 'Personal-KPIs', icon: Users },
    ]
  },
  {
    id: 'planung-gruppe',
    label: 'Planung & Alarme',
    icon: Target,
    items: [
      { id: 'budget', label: 'Budgetplanung', icon: Target },
      { id: 'alarme', label: 'KPI-Alarme', icon: Bell },
      { id: 'abteilungsleiter', label: 'Abteilungsleiter', icon: Users },
    ]
  },
  {
    id: 'daten-gruppe',
    label: 'Daten & Analysen',
    icon: BarChart3,
    items: [
      { id: 'upload', label: 'Datenimport', icon: Upload },
      { id: 'konten', label: 'Kontenstamm', icon: Table2 },
      { id: 'vergleich', label: 'Periodenvergleich', icon: GitCompare },
      { id: 'bereiche', label: 'Bereichsanalyse', icon: BarChart3 },
      { id: 'datenqualitaet', label: 'Datenqualität', icon: ShieldCheck },
    ]
  },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  
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
            {item.label}
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
            title={group.label}
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
              {group.label}
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
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <MandiraLogo className="h-8 w-8 text-primary shrink-0" />
        {!collapsed && (
          <div className="ml-3 animate-fade-in">
            <h1 className="text-lg font-semibold text-sidebar-foreground">FinanzAnalyse</h1>
            <p className="text-xs text-muted-foreground">Hotel Saldenlisten</p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navStructure.map((entry) => {
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

import { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MandiraLogo } from '@/components/MandiraLogo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigation } from '@/contexts/NavigationContext';
import { 
  LayoutDashboard, 
  Upload, 
  Table2, 
  BarChart3, 
  GitCompare,
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
      { id: 'benutzerverwaltung', label: 'Benutzerverwaltung', icon: ShieldCheck },
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

export function MobileNav() {
  const { activeView, setActiveView } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['abteilung-kpis', 'personal-gruppe']);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId);
    setIsOpen(false);
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
        onClick={() => handleNavClick(item.id)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
          isSubItem && "pl-10",
          isActive 
            ? "bg-primary/10 text-primary font-medium" 
            : "text-foreground/70 hover:bg-muted"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="text-sm">{item.label}</span>
      </button>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const Icon = group.icon;
    const isOpen = openGroups.includes(group.id);
    const hasActiveItem = isActiveInGroup(group);

    return (
      <Collapsible
        key={group.id}
        open={isOpen}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
              hasActiveItem 
                ? "text-primary font-medium" 
                : "text-foreground/70 hover:bg-muted"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm flex-1 text-left">{group.label}</span>
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {group.items.map(item => renderNavItem(item, true))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button 
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Menü öffnen"
          >
            <Menu className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b">
              <div className="flex items-center gap-3">
                <MandiraLogo className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">FinanzAnalyse</h1>
                  <p className="text-xs text-muted-foreground">Hotel Saldenlisten</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Menü schließen"
              >
                <X className="h-5 w-5" />
              </button>
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

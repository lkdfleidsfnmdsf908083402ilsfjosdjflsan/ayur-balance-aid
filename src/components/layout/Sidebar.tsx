import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Upload, 
  Table2, 
  BarChart3, 
  GitCompare,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Datenimport', icon: Upload },
  { id: 'konten', label: 'Kontenstamm', icon: Table2 },
  { id: 'vergleich', label: 'Periodenvergleich', icon: GitCompare },
  { id: 'bereiche', label: 'Bereichsanalyse', icon: BarChart3 },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Database className="h-8 w-8 text-secondary shrink-0" />
        {!collapsed && (
          <div className="ml-3 animate-fade-in">
            <h1 className="text-lg font-semibold text-sidebar-foreground">FinanzAnalyse</h1>
            <p className="text-xs text-muted-foreground">Hotel Saldenlisten</p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground glow-primary" 
                  : "text-sidebar-foreground/70"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 shrink-0 transition-colors",
                isActive && "text-primary"
              )} />
              {!collapsed && (
                <span className={cn(
                  "text-sm font-medium animate-fade-in",
                  isActive && "text-foreground"
                )}>
                  {item.label}
                </span>
              )}
            </button>
          );
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

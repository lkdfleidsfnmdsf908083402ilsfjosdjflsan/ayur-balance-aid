import { useFinanceStore } from '@/store/financeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const months = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const { selectedYear, selectedMonth, setSelectedPeriod, uploadedFiles } = useFinanceStore();
  
  // Ermittle verfügbare Jahre aus hochgeladenen Dateien
  const availableYears = [...new Set(uploadedFiles.map(f => f.year))].sort((a, b) => b - a);
  const years = availableYears.length > 0 ? availableYears : [2024, 2025];

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        
        <Select 
          value={selectedMonth.toString()} 
          onValueChange={(v) => setSelectedPeriod(selectedYear, parseInt(v))}
        >
          <SelectTrigger className="w-32 bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={selectedYear.toString()} 
          onValueChange={(v) => setSelectedPeriod(parseInt(v), selectedMonth)}
        >
          <SelectTrigger className="w-24 bg-muted border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-6 bg-border mx-1" />
        
        <ThemeToggle />
      </div>
    </header>
  );
}

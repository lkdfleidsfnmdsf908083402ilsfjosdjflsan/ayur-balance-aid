import { useFinanceStore } from '@/store/financeStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const months = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' },
];

export function PeriodSelector() {
  const { selectedYear, selectedMonth, setSelectedPeriod, salden } = useFinanceStore();
  
  // Ermittle verfügbare Jahre und Monate aus den Salden
  const availablePeriods = salden.reduce((acc, s) => {
    const key = `${s.jahr}-${s.monat}`;
    if (!acc.has(key)) {
      acc.set(key, { year: s.jahr, month: s.monat });
    }
    return acc;
  }, new Map<string, { year: number; month: number }>());
  
  const availableYears = [...new Set(salden.map(s => s.jahr))].sort((a, b) => b - a);
  const availableMonthsForYear = [...availablePeriods.values()]
    .filter(p => p.year === selectedYear)
    .map(p => p.month)
    .sort((a, b) => b - a);

  const handleYearChange = (value: string) => {
    const year = parseInt(value);
    // Wähle den neuesten verfügbaren Monat für das Jahr
    const monthsForNewYear = [...availablePeriods.values()]
      .filter(p => p.year === year)
      .map(p => p.month)
      .sort((a, b) => b - a);
    
    const month = monthsForNewYear.includes(selectedMonth) 
      ? selectedMonth 
      : monthsForNewYear[0] || 1;
    
    setSelectedPeriod(year, month);
  };

  const handleMonthChange = (value: string) => {
    setSelectedPeriod(selectedYear, parseInt(value));
  };

  if (availableYears.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Monat" />
        </SelectTrigger>
        <SelectContent>
          {months.map(month => (
            <SelectItem 
              key={month.value} 
              value={month.value.toString()}
              disabled={!availableMonthsForYear.includes(month.value)}
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Jahr" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map(year => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

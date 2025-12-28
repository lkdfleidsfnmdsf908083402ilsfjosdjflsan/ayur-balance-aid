import { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AbsenceReason = Database["public"]["Enums"]["absence_reason"];

interface Employee {
  id: string;
  personalnummer: string;
  vorname: string;
  nachname: string;
  abteilung: string;
  wochenstunden_soll: number;
}

interface Shift {
  id: string;
  employee_id: string;
  datum: string;
  soll_stunden: number;
  schicht_beginn: string | null;
  schicht_ende: string | null;
  vormittag_beginn: string | null;
  vormittag_ende: string | null;
  nachmittag_beginn: string | null;
  nachmittag_ende: string | null;
  abwesenheit: AbsenceReason;
}

interface SchichtplanDruckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  abteilung: string;
  employees: Employee[];
  shifts: Shift[];
  weekStart: Date;
  weekDays: Date[];
}

const ABWESENHEIT_COLORS: Record<AbsenceReason, { bg: string; text: string; print: string }> = {
  'Arbeit': { bg: 'bg-green-100', text: 'text-green-800', print: '#dcfce7' },
  'Urlaub': { bg: 'bg-blue-100', text: 'text-blue-800', print: '#dbeafe' },
  'Krank': { bg: 'bg-red-100', text: 'text-red-800', print: '#fee2e2' },
  'Fortbildung': { bg: 'bg-purple-100', text: 'text-purple-800', print: '#f3e8ff' },
  'Frei': { bg: 'bg-gray-100', text: 'text-gray-800', print: '#f3f4f6' },
  'Überstundenabbau': { bg: 'bg-orange-100', text: 'text-orange-800', print: '#ffedd5' },
  'Elternzeit': { bg: 'bg-pink-100', text: 'text-pink-800', print: '#fce7f3' },
  'Sonstiges': { bg: 'bg-yellow-100', text: 'text-yellow-800', print: '#fef9c3' },
};

export function SchichtplanDruckModal({
  open,
  onOpenChange,
  abteilung,
  employees,
  shifts,
  weekStart,
  weekDays,
}: SchichtplanDruckModalProps) {
  const getShiftForDay = (employeeId: string, date: Date): Shift | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.find((s) => s.employee_id === employeeId && s.datum === dateStr) || null;
  };

  const formatShiftDisplay = (shift: Shift) => {
    if (shift.abwesenheit !== 'Arbeit') {
      return shift.abwesenheit;
    }
    if (shift.vormittag_beginn && shift.nachmittag_beginn) {
      return `${shift.vormittag_beginn?.slice(0, 5)}-${shift.vormittag_ende?.slice(0, 5)} / ${shift.nachmittag_beginn?.slice(0, 5)}-${shift.nachmittag_ende?.slice(0, 5)}`;
    }
    return `${shift.schicht_beginn?.slice(0, 5) || '?'}-${shift.schicht_ende?.slice(0, 5) || '?'}`;
  };

  const weekStats = useMemo(() => {
    let arbeitsTage = 0;
    let urlaubTage = 0;
    let krankTage = 0;
    let totalStunden = 0;

    shifts.forEach((shift) => {
      if (shift.abwesenheit === 'Arbeit') arbeitsTage++;
      if (shift.abwesenheit === 'Urlaub') urlaubTage++;
      if (shift.abwesenheit === 'Krank') krankTage++;
      totalStunden += shift.soll_stunden || 0;
    });

    return { arbeitsTage, urlaubTage, krankTage, totalStunden };
  }, [shifts]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    const kwNumber = format(weekStart, 'ww', { locale: de });
    const yearNumber = format(weekStart, 'yyyy');
    const weekStartStr = format(weekStart, 'dd.MM.yyyy', { locale: de });
    const weekEndStr = format(addDays(weekStart, 6), 'dd.MM.yyyy', { locale: de });

    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246);
    doc.text('MANDIRA', 14, 18);
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(16);
    doc.text(`Schichtplan ${abteilung}`, 14, 30);
    doc.setFontSize(11);
    doc.text(`KW ${kwNumber}/${yearNumber} (${weekStartStr} - ${weekEndStr})`, 14, 38);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 14, 45);
    doc.setTextColor(0, 0, 0);

    const headers = [
      'Mitarbeiter',
      ...weekDays.map((day) => format(day, 'EEE dd.MM', { locale: de })),
      'Woche',
    ];

    const rows = employees.map((employee) => {
      const employeeShifts = weekDays.map((day) => getShiftForDay(employee.id, day));
      const weekTotal = employeeShifts.reduce((sum, shift) => sum + (shift?.soll_stunden || 0), 0);

      return [
        `${employee.vorname} ${employee.nachname}`,
        ...employeeShifts.map((shift) => {
          if (!shift) return '-';
          if (shift.abwesenheit !== 'Arbeit') {
            return shift.abwesenheit;
          }
          return formatShiftDisplay(shift) + `\n(${shift.soll_stunden}h)`;
        }),
        `${weekTotal}h / ${employee.wochenstunden_soll}h`,
      ];
    });

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 52,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: { 0: { cellWidth: 45 } },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0 && data.column.index < 8) {
          const cellText = String(data.cell.raw);
          if (cellText.includes('Urlaub')) {
            data.cell.styles.fillColor = [219, 234, 254];
          } else if (cellText.includes('Krank')) {
            data.cell.styles.fillColor = [254, 226, 226];
          } else if (cellText.includes('Fortbildung')) {
            data.cell.styles.fillColor = [243, 232, 255];
          } else if (cellText.includes('Frei')) {
            data.cell.styles.fillColor = [243, 244, 246];
          } else if (cellText.includes('Überstunden')) {
            data.cell.styles.fillColor = [255, 237, 213];
          } else if (cellText.includes('-') && cellText.length < 3) {
            data.cell.styles.fillColor = [249, 250, 251];
          } else if (cellText.includes(':')) {
            data.cell.styles.fillColor = [220, 252, 231];
          }
        }
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Zusammenfassung:', 14, finalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Mitarbeiter: ${employees.length}`, 14, finalY + 18);
    doc.text(`• Soll-Stunden gesamt: ${weekStats.totalStunden.toFixed(1)}h`, 14, finalY + 24);
    doc.text(`• Arbeitstage: ${weekStats.arbeitsTage} | Urlaub: ${weekStats.urlaubTage} | Krank: ${weekStats.krankTage}`, 14, finalY + 30);

    doc.save(`Schichtplan_${abteilung}_KW${kwNumber}_${yearNumber}.pdf`);
    toast.success('PDF erfolgreich erstellt');
  };

  const kwNumber = format(weekStart, 'ww', { locale: de });
  const yearNumber = format(weekStart, 'yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center justify-between">
            <span>Schichtplan Druckansicht - {abteilung}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Drucken
              </Button>
              <Button size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Print-optimized content */}
        <div className="print:block">
          {/* Header */}
          <div className="mb-4 print:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">MANDIRA</h1>
                <h2 className="text-lg font-semibold">Schichtplan {abteilung}</h2>
                <p className="text-sm text-muted-foreground">
                  KW {kwNumber}/{yearNumber} ({format(weekStart, 'dd.MM.yyyy', { locale: de })} - {format(addDays(weekStart, 6), 'dd.MM.yyyy', { locale: de })})
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground print:text-black">
                <p>Erstellt: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                <p>Mitarbeiter: {employees.length}</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4 print:mb-4">
            {Object.entries(ABWESENHEIT_COLORS).slice(0, 6).map(([key, colors]) => (
              <Badge key={key} className={`${colors.bg} ${colors.text} print:border`}>
                {key}
              </Badge>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto touch-pan-x touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground print:bg-blue-500 print:text-white">
                  <th className="border p-2 text-left font-medium sticky left-0 bg-primary print:bg-blue-500">
                    Mitarbeiter
                  </th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="border p-2 text-center font-medium min-w-[100px]">
                      {format(day, 'EEE', { locale: de })}
                      <br />
                      <span className="text-xs font-normal">{format(day, 'dd.MM')}</span>
                    </th>
                  ))}
                  <th className="border p-2 text-center font-medium">Woche</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const employeeShifts = weekDays.map((day) => getShiftForDay(employee.id, day));
                  const weekTotal = employeeShifts.reduce((sum, shift) => sum + (shift?.soll_stunden || 0), 0);

                  return (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <td className="border p-2 font-medium sticky left-0 bg-background print:bg-white">
                        {employee.vorname} {employee.nachname}
                        <br />
                        <span className="text-xs text-muted-foreground">{employee.personalnummer}</span>
                      </td>
                      {employeeShifts.map((shift, idx) => {
                        const colors = shift ? ABWESENHEIT_COLORS[shift.abwesenheit] : null;
                        return (
                          <td
                            key={idx}
                            className={`border p-2 text-center text-xs ${colors ? `${colors.bg} ${colors.text}` : 'bg-muted/30'}`}
                            style={colors ? { backgroundColor: colors.print } : undefined}
                          >
                            {shift ? (
                              <>
                                {formatShiftDisplay(shift)}
                                {shift.abwesenheit === 'Arbeit' && (
                                  <div className="text-[10px] mt-0.5">({shift.soll_stunden}h)</div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="border p-2 text-center font-medium">
                        <span className={weekTotal >= employee.wochenstunden_soll ? 'text-green-600' : 'text-orange-600'}>
                          {weekTotal}h
                        </span>
                        <span className="text-muted-foreground"> / {employee.wochenstunden_soll}h</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg print:bg-gray-100 print:mt-6">
            <h3 className="font-semibold mb-2">Zusammenfassung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mitarbeiter:</span>
                <span className="ml-2 font-medium">{employees.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Soll-Stunden:</span>
                <span className="ml-2 font-medium">{weekStats.totalStunden.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Arbeitstage:</span>
                <span className="ml-2 font-medium">{weekStats.arbeitsTage}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Urlaub/Krank:</span>
                <span className="ml-2 font-medium">{weekStats.urlaubTage}/{weekStats.krankTage}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AbteilungKpi } from '@/types/finance';
import { formatCurrency } from './calculations';

const months = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

interface GesamtKpis {
  gesamtUmsatz: number;
  gesamtWareneinsatz: number;
  gesamtPersonal: number;
  gesamtDB1: number;
  gesamtDB2: number;
  gesamtEnergie: number;
  gesamtMarketing: number;
}

export function exportKpiToPdf(
  abteilungKpis: AbteilungKpi[],
  gesamtKpis: GesamtKpis,
  jahr: number,
  monat: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('KPI-Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${months[monat]} ${jahr}`, pageWidth / 2, 28, { align: 'center' });
  
  // Datum
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, pageWidth - 15, 15, { align: 'right' });
  
  // Gesamt-KPIs Box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, 35, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('Gesamt-Übersicht', 20, 43);
  
  const gesamtDb1Marge = gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB1 / gesamtKpis.gesamtUmsatz) * 100 : 0;
  const gesamtDb2Marge = gesamtKpis.gesamtUmsatz > 0 ? (gesamtKpis.gesamtDB2 / gesamtKpis.gesamtUmsatz) * 100 : 0;
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  const col1 = 20;
  const col2 = 70;
  const col3 = 120;
  const col4 = 170;
  
  doc.text(`Umsatz: ${formatCurrency(gesamtKpis.gesamtUmsatz)}`, col1, 53);
  doc.text(`Wareneinsatz: ${formatCurrency(gesamtKpis.gesamtWareneinsatz)}`, col2, 53);
  doc.text(`DB I: ${formatCurrency(gesamtKpis.gesamtDB1)} (${gesamtDb1Marge.toFixed(1)}%)`, col3, 53);
  doc.text(`Personal: ${formatCurrency(gesamtKpis.gesamtPersonal)}`, col1, 63);
  doc.text(`Energie: ${formatCurrency(gesamtKpis.gesamtEnergie)}`, col2, 63);
  doc.text(`DB II: ${formatCurrency(gesamtKpis.gesamtDB2)} (${gesamtDb2Marge.toFixed(1)}%)`, col3, 63);
  
  // Abteilungs-Tabelle
  const tableData = abteilungKpis
    .filter(k => k.umsatz > 0 || k.wareneinsatz > 0 || k.personal > 0)
    .sort((a, b) => b.umsatz - a.umsatz)
    .map(kpi => {
      const db1Marge = kpi.umsatz > 0 ? (kpi.db1 / kpi.umsatz) * 100 : 0;
      const db2Marge = kpi.umsatz > 0 ? (kpi.db2 / kpi.umsatz) * 100 : 0;
      
      return [
        kpi.abteilung,
        formatCurrency(kpi.umsatz),
        formatCurrency(kpi.wareneinsatz),
        `${formatCurrency(kpi.db1)} (${db1Marge.toFixed(1)}%)`,
        formatCurrency(kpi.personal),
        `${formatCurrency(kpi.db2)} (${db2Marge.toFixed(1)}%)`,
        formatCurrency(kpi.energie),
      ];
    });

  autoTable(doc, {
    startY: 80,
    head: [['Abteilung', 'Umsatz', 'Wareneinsatz', 'DB I', 'Personal', 'DB II', 'Energie']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  // Vorjahresvergleich Tabelle (wenn Daten vorhanden)
  const kpisWithVorjahr = abteilungKpis.filter(k => k.umsatzVorjahr && k.umsatzVorjahr > 0);
  
  if (kpisWithVorjahr.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Jahresvergleich', 15, finalY + 15);
    
    const vergleichData = kpisWithVorjahr
      .sort((a, b) => b.umsatz - a.umsatz)
      .map(kpi => {
        const umsatzDiff = kpi.umsatzDiffProzent || 0;
        const db1DiffProzent = kpi.db1Vorjahr && kpi.db1Vorjahr !== 0 
          ? ((kpi.db1 - kpi.db1Vorjahr) / Math.abs(kpi.db1Vorjahr)) * 100 
          : 0;
        
        return [
          kpi.abteilung,
          formatCurrency(kpi.umsatz),
          formatCurrency(kpi.umsatzVorjahr || 0),
          `${umsatzDiff >= 0 ? '+' : ''}${umsatzDiff.toFixed(1)}%`,
          formatCurrency(kpi.db1),
          formatCurrency(kpi.db1Vorjahr || 0),
          `${db1DiffProzent >= 0 ? '+' : ''}${db1DiffProzent.toFixed(1)}%`,
        ];
      });

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Abteilung', 'Umsatz aktuell', 'Umsatz VJ', 'Δ %', 'DB I aktuell', 'DB I VJ', 'Δ %']],
      body: vergleichData,
      theme: 'striped',
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Seite ${i} von ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`KPI-Report_${jahr}-${String(monat).padStart(2, '0')}.pdf`);
}

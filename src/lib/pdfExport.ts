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

// Trend-Datentyp
interface TrendDataPoint {
  monat: string;
  monatNum: number;
  umsatz: number;
  umsatzVorjahr: number;
  db1: number;
  db1Vorjahr: number;
  db2: number;
  db2Vorjahr: number;
  personal: number;
  personalVorjahr: number;
  energie: number;
  energieVorjahr: number;
  wareneinsatz: number;
  wareneinsatzVorjahr: number;
  db1Marge: number;
  db2Marge: number;
}

interface YtdSummary {
  umsatz: number;
  umsatzVorjahr: number;
  db1: number;
  db1Vorjahr: number;
  db2: number;
  db2Vorjahr: number;
  personal: number;
  energie: number;
}

export function exportTrendToPdf(
  trendData: TrendDataPoint[],
  ytdSummary: YtdSummary,
  jahr: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('KPI-Trend Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Year-to-Date ${jahr}`, pageWidth / 2, 28, { align: 'center' });
  
  // Datum
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, pageWidth - 15, 15, { align: 'right' });
  
  // YTD Summary Box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, 35, pageWidth - 30, 45, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('YTD-Zusammenfassung', 20, 43);
  
  const umsatzDiff = ytdSummary.umsatzVorjahr > 0 
    ? ((ytdSummary.umsatz - ytdSummary.umsatzVorjahr) / ytdSummary.umsatzVorjahr) * 100 
    : 0;
  const db1Diff = ytdSummary.db1Vorjahr !== 0 
    ? ((ytdSummary.db1 - ytdSummary.db1Vorjahr) / Math.abs(ytdSummary.db1Vorjahr)) * 100 
    : 0;
  const db2Diff = ytdSummary.db2Vorjahr !== 0 
    ? ((ytdSummary.db2 - ytdSummary.db2Vorjahr) / Math.abs(ytdSummary.db2Vorjahr)) * 100 
    : 0;
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  const col1 = 20;
  const col2 = 110;
  
  doc.text(`Umsatz YTD: ${formatCurrency(ytdSummary.umsatz)}`, col1, 53);
  doc.text(`vs. Vorjahr: ${umsatzDiff >= 0 ? '+' : ''}${umsatzDiff.toFixed(1)}%`, col2, 53);
  doc.text(`DB I YTD: ${formatCurrency(ytdSummary.db1)}`, col1, 63);
  doc.text(`vs. Vorjahr: ${db1Diff >= 0 ? '+' : ''}${db1Diff.toFixed(1)}%`, col2, 63);
  doc.text(`DB II YTD: ${formatCurrency(ytdSummary.db2)}`, col1, 73);
  doc.text(`vs. Vorjahr: ${db2Diff >= 0 ? '+' : ''}${db2Diff.toFixed(1)}%`, col2, 73);
  
  // Monatliche Entwicklung Tabelle
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Monatliche Entwicklung', 15, 95);
  
  const tableData = trendData.map(month => {
    const monthUmsatzDiff = month.umsatzVorjahr > 0 
      ? ((month.umsatz - month.umsatzVorjahr) / month.umsatzVorjahr) * 100 
      : 0;
    const monthDb1Diff = month.db1Vorjahr !== 0 
      ? ((month.db1 - month.db1Vorjahr) / Math.abs(month.db1Vorjahr)) * 100 
      : 0;
    const monthDb2Diff = month.db2Vorjahr !== 0 
      ? ((month.db2 - month.db2Vorjahr) / Math.abs(month.db2Vorjahr)) * 100 
      : 0;
    
    return [
      month.monat,
      formatCurrency(month.umsatz),
      `${monthUmsatzDiff >= 0 ? '+' : ''}${monthUmsatzDiff.toFixed(1)}%`,
      formatCurrency(month.db1),
      `${month.db1Marge.toFixed(1)}%`,
      formatCurrency(month.db2),
      `${month.db2Marge.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: 100,
    head: [['Monat', 'Umsatz', 'Δ VJ', 'DB I', 'Marge', 'DB II', 'Marge']],
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

  // Kostenstruktur Tabelle
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Kostenstruktur pro Monat', 15, finalY + 15);
  
  const kostenData = trendData.map(month => [
    month.monat,
    formatCurrency(month.wareneinsatz),
    formatCurrency(month.personal),
    formatCurrency(month.energie),
  ]);

  autoTable(doc, {
    startY: finalY + 20,
    head: [['Monat', 'Wareneinsatz', 'Personal', 'Energie']],
    body: kostenData,
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
    },
    margin: { left: 15, right: 15 },
  });

  // Formeln-Info auf neuer Seite
  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Kennzahlen-Definitionen', 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  
  const definitions = [
    { title: 'DB I (Deckungsbeitrag I)', formula: 'Umsatz − Wareneinsatz', desc: 'Zeigt den Rohertrag nach Abzug der direkten Warenkosten.' },
    { title: 'DB II (Deckungsbeitrag II)', formula: 'DB I − Personalkosten', desc: 'Zeigt den Ertrag nach Abzug der Personalkosten.' },
    { title: 'DB I Marge', formula: '(DB I / Umsatz) × 100', desc: 'Prozentualer Anteil des DB I am Umsatz.' },
    { title: 'DB II Marge', formula: '(DB II / Umsatz) × 100', desc: 'Prozentualer Anteil des DB II am Umsatz.' },
  ];
  
  let yPos = 35;
  definitions.forEach(def => {
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(def.title, 20, yPos);
    
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(`Formel: ${def.formula}`, 20, yPos + 6);
    
    doc.setTextColor(100, 100, 100);
    doc.text(def.desc, 20, yPos + 12);
    
    yPos += 25;
  });

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
  doc.save(`KPI-Trend-Report_${jahr}.pdf`);
}

/**
 * Exportiert die vollständige KPI-Dokumentation als PDF
 */
export function exportKpiDocumentation() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('KPI-Dokumentation', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Vollständige Übersicht aller Key Performance Indicators', pageWidth / 2, 33, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, pageWidth - 15, 15, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════
  // FINANZ-KPIs
  // ═══════════════════════════════════════════════════════════════
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('1. Finanz-KPIs (Operativ)', 15, 50);

  const finanzKpis = [
    ['Umsatz', 'Gesamtumsatz in €', 'Summe aller Erlöskonten'],
    ['DB I', 'Deckungsbeitrag I', 'Umsatz − Wareneinsatz'],
    ['DB II', 'Deckungsbeitrag II', 'DB I − Personalkosten'],
    ['DB I Marge %', 'DB I als Prozent vom Umsatz', '(DB I / Umsatz) × 100'],
    ['DB II Marge %', 'DB II als Prozent vom Umsatz', '(DB II / Umsatz) × 100'],
    ['Wareneinsatz', 'Wareneinsatz in €', 'Summe aller Wareneinsatzkonten'],
    ['Wareneinsatz %', 'Wareneinsatz als % vom Umsatz', '(Wareneinsatz / Umsatz) × 100'],
  ];

  autoTable(doc, {
    startY: 55,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: finanzKpis,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 65 }, 2: { cellWidth: 70 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONAL & KOSTEN
  // ═══════════════════════════════════════════════════════════════
  let y = (doc as any).lastAutoTable?.finalY + 10 || 120;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('2. Personal & Kosten', 15, y);

  const personalKpis = [
    ['Personalkosten', 'Personalkosten in €', 'Summe aller Personalkonten'],
    ['Personalkosten %', 'Personalkosten als % vom Umsatz', '(Personal / Umsatz) × 100'],
    ['Energiekosten', 'Energiekosten in €', 'Strom, Gas, Wasser, Heizung'],
    ['Marketingkosten', 'Marketingkosten in €', 'Werbung, Provision, Portale'],
    ['Betriebsaufwand', 'Sonstige Betriebskosten in €', 'Alle übrigen Aufwendungen'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: personalKpis,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 65 }, 2: { cellWidth: 70 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // HOUSEKEEPING
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('3. Housekeeping KPIs', 15, 20);

  const hkKpis = [
    ['Zimmer pro Mitarbeiter', 'Anzahl gereinigter Zimmer pro Mitarbeiter', 'Gereinigte Zimmer / Mitarbeiter im Dienst'],
    ['Inspektions-Bestehensquote %', 'Prozent der bestandenen Zimmerinspektionen', '(Bestandene Inspektionen / Geprüfte Zimmer) × 100'],
    ['Beschwerdequote %', 'Reinigungsbeschwerden pro Übernachtung', '(Beschwerden / Belegte Zimmer) × 100'],
    ['Ø Minuten pro Zimmer', 'Durchschnittliche Reinigungszeit', 'Gesamte Reinigungszeit / Gereinigte Zimmer'],
  ];

  autoTable(doc, {
    startY: 25,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: hkKpis,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // KÜCHE
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 10 || 80;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('4. Küche KPIs', 15, y);

  const kitchenKpis = [
    ['Food Cost %', 'Wareneinsatz zu F&B-Umsatz', '(Wareneinsatz / F&B-Umsatz) × 100'],
    ['Kitchen Labour %', 'Küchenpersonalkosten zu Umsatz', '(Küchenarbeit / F&B-Umsatz) × 100'],
    ['Prime Cost %', 'Gesamtkosten Food + Labour', 'Food Cost % + Kitchen Labour %'],
    ['Reklamationsquote %', 'Essens-Reklamationen pro Bestellung', '(Reklamationen / Bestellungen) × 100'],
    ['Bestellgenauigkeit %', 'Korrekt ausgeführte Bestellungen', '(Korrekte Bestellungen / Gesamt) × 100'],
    ['Lebensmittelabfall %', 'Abfallwert zu Wareneinsatz', '(Abfallwert / Wareneinsatz) × 100'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: kitchenKpis,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // SERVICE
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 10 || 150;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('5. Service KPIs', 15, y);

  const serviceKpis = [
    ['Umsatz pro Gast', 'Durchschnittsumsatz pro Gast', 'Umsatz / Anzahl Gäste (Covers)'],
    ['Beschwerdequote %', 'Service-Beschwerden pro Gast', '(Beschwerden / Gäste) × 100'],
    ['Fehlerquote %', 'Servicefehler pro Bestellung', '(Fehler / Bestellungen) × 100'],
    ['Ø Bewertung', 'Durchschnittliche Gästebewertung', 'Summe Bewertungen / Anzahl (Skala 1-5)'],
    ['Tischumschlag', 'Belegungen pro Tisch pro Tag', 'Belegungen / Verfügbare Tische'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: serviceKpis,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // SPA
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('6. Spa KPIs', 15, 20);

  const spaKpis = [
    ['Raumauslastung %', 'Gebuchte zu verfügbaren Behandlungsstunden', '(Gebuchte Stunden / Verfügbare Stunden) × 100'],
    ['Therapeuten-Auslastung %', 'Behandlungszeit zu Arbeitszeit', '(Behandlungszeit / Arbeitszeit) × 100'],
    ['Umsatz pro Gast', 'Durchschnittsumsatz pro Spa-Gast', 'Spa-Umsatz / Anzahl Gäste'],
    ['No-Show-Rate %', 'Nicht erschienene Buchungen', '(No-Shows / Buchungen) × 100'],
    ['Beschwerdequote %', 'Spa-Beschwerden pro Gast', '(Beschwerden / Gäste) × 100'],
    ['Ø Bewertung', 'Durchschnittliche Spa-Bewertung', 'Summe Bewertungen / Anzahl (Skala 1-5)'],
  ];

  autoTable(doc, {
    startY: 25,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: spaKpis,
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // FRONT OFFICE
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 10 || 90;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('7. Front Office KPIs', 15, y);

  const foKpis = [
    ['Ø Check-in Zeit (Sek.)', 'Durchschnittliche Check-in-Dauer', 'Gesamte Check-in-Zeit / Anzahl Ankünfte'],
    ['Beschwerdequote %', 'FO-Beschwerden pro Gast', '(Beschwerden / Gäste) × 100'],
    ['Upsell Conversion %', 'Erfolgreiche Upsell-Verkäufe', '(Erfolgreiche Upsells / Versuche) × 100'],
    ['First Contact Resolution %', 'Beim ersten Kontakt gelöste Anfragen', '(Gelöst beim 1. Kontakt / Gesamt) × 100'],
    ['Ø Bewertung', 'Durchschnittliche FO-Bewertung', 'Summe Bewertungen / Anzahl (Skala 1-5)'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: foKpis,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // TECHNIK
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 10 || 160;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('8. Technik KPIs', 15, y);

  const techKpis = [
    ['Ticket-Backlog %', 'Offene zu Gesamt-Tickets', '(Offene Tickets / Gesamt-Tickets) × 100'],
    ['Same-Day Resolution %', 'Am selben Tag gelöste Tickets', '(Gelöst am selben Tag / Neue Tickets) × 100'],
    ['Präventive Wartung %', 'Durchgeführte zu geplanter Wartung', '(Durchgeführt / Geplant) × 100'],
    ['Notfall-Rate %', 'Notfallreparaturen zu Gesamtarbeiten', '(Notfälle / Gesamtarbeiten) × 100'],
    ['kWh pro Zimmer', 'Energieverbrauch pro belegtes Zimmer', 'Energieverbrauch kWh / Belegte Zimmer'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: techKpis,
    theme: 'striped',
    headStyles: { fillColor: [107, 114, 128], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // VERWALTUNG/HR
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('9. Verwaltung/HR KPIs', 15, 20);

  const adminKpis = [
    ['Krankenquote %', 'Kranke Mitarbeiter zu Gesamt', '(Kranke / Gesamt-Mitarbeiter) × 100'],
    ['Offene Stellen %', 'Unbesetzte zu geplanten Stellen', '(Offene Stellen / Geplante Stellen) × 100'],
    ['Fluktuation %', 'Monatliche Mitarbeiterwechselrate', '(Austritte / Mitarbeiter) × 100'],
    ['IT-Verfügbarkeit %', 'Systemuptime', '((1440 - Ausfallminuten) / 1440) × 100'],
    ['Zahlungstreue %', 'Pünktlich bezahlte Rechnungen', '(Bezahlt / Gesamt-Rechnungen) × 100'],
  ];

  autoTable(doc, {
    startY: 25,
    head: [['KPI', 'Beschreibung', 'Formel/Berechnung']],
    body: adminKpis,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // VERFÜGBARE BEREICHE
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 15 || 90;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('Verfügbare Bereiche für Alarme', 15, y);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const bereiche = [
    { kategorie: 'Übergreifend', bereiche: 'Gesamt' },
    { kategorie: 'Operative Abteilungen', bereiche: 'Logis, F&B, Spa, Ärztin, Shop' },
    { kategorie: 'Service-Abteilungen', bereiche: 'Verwaltung, Technik, Energie, Marketing, Personal' },
    { kategorie: 'Daily Report Bereiche', bereiche: 'Housekeeping, Kitchen, Service, Spa, FrontOffice, Technical, Admin' },
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['Kategorie', 'Bereiche']],
    body: bereiche.map(b => [b.kategorie, b.bereiche]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // EMPFOHLENE SCHWELLENWERTE
  // ═══════════════════════════════════════════════════════════════
  y = (doc as any).lastAutoTable?.finalY + 15 || 160;
  
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text('Empfohlene Schwellenwerte', 15, y);

  const empfehlungen = [
    ['Krankenquote %', 'Admin', '-', '10%', 'Maximale Krankenquote'],
    ['Food Cost %', 'Kitchen', '-', '30%', 'Branchenstandard F&B'],
    ['Beschwerdequote %', 'Housekeeping', '-', '2%', 'Qualitätsziel'],
    ['IT-Verfügbarkeit %', 'Admin', '99%', '-', 'Mindest-Uptime'],
    ['Inspektionsquote %', 'Housekeeping', '95%', '-', 'Qualitätsziel'],
    ['No-Show-Rate %', 'Spa', '-', '5%', 'Maximale No-Shows'],
  ];

  autoTable(doc, {
    startY: y + 5,
    head: [['KPI', 'Bereich', 'Min', 'Max', 'Begründung']],
    body: empfehlungen,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    margin: { left: 15, right: 15 },
  });

  // Footer auf allen Seiten
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Seite ${i} von ${pageCount} | KPI-Dokumentation | ${new Date().toLocaleDateString('de-DE')}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`KPI-Dokumentation_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Exportiert eine Benutzer-Anleitung für Abteilungsleiter als PDF
 */
export function exportUserDocumentation() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('Benutzerhandbuch', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text('Hotel Mandira KPI Dashboard', pageWidth / 2, 33, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Version ${new Date().getFullYear()}.1`, pageWidth - 15, 15, { align: 'right' });

  // ═══════════════════════════════════════════════════════════════
  // ERSTE SCHRITTE
  // ═══════════════════════════════════════════════════════════════
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('1. Erste Schritte', 15, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  let y = 60;
  const steps = [
    '1. Öffnen Sie die App-URL in Ihrem Browser (Desktop oder Mobil)',
    '2. Auf der Login-Seite: Geben Sie Ihre E-Mail-Adresse und Passwort ein',
    '3. Falls Sie noch kein Konto haben: Klicken Sie auf "Registrieren"',
    '4. Nach erfolgreicher Anmeldung sehen Sie Ihr persönliches Dashboard',
  ];
  
  steps.forEach(step => {
    doc.text(step, 20, y);
    y += 8;
  });

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD ÜBERSICHT
  // ═══════════════════════════════════════════════════════════════
  y += 10;
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('2. Ihr Dashboard', 15, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const dashboardInfo = [
    'Das Dashboard zeigt Ihnen auf einen Blick:',
    '• Aktuelle Mitarbeiter-Statistiken (Anwesend, Urlaub, Krank)',
    '• Anwesenheitsquote und Arbeitsstunden des Tages',
    '• Schnellzugriff auf wichtige Funktionen',
    '• Aktive KPI-Alarme Ihrer Abteilung',
  ];
  
  dashboardInfo.forEach(info => {
    doc.text(info, 20, y);
    y += 7;
  });

  // ═══════════════════════════════════════════════════════════════
  // SCHICHTPLANUNG
  // ═══════════════════════════════════════════════════════════════
  y += 10;
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('3. Schichtplanung', 15, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const schichtInfo = [
    'In der Schichtplanung können Sie:',
    '• Wochenansicht der Mitarbeiter-Schichten einsehen',
    '• Schichten hinzufügen, bearbeiten und löschen',
    '• Abwesenheiten (Urlaub, Krank, Fortbildung) erfassen',
    '• Ist-Zeiten nach der Schicht nachtragen',
    '• Den Schichtplan per E-Mail an Mitarbeiter senden',
  ];
  
  schichtInfo.forEach(info => {
    doc.text(info, 20, y);
    y += 7;
  });

  // ═══════════════════════════════════════════════════════════════
  // MITARBEITERVERWALTUNG
  // ═══════════════════════════════════════════════════════════════
  y += 10;
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('4. Mitarbeiterverwaltung', 15, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const maInfo = [
    'Hier verwalten Sie Ihre Mitarbeiter-Stammdaten:',
    '• Neue Mitarbeiter anlegen',
    '• Personalnummer, Name, Kontaktdaten pflegen',
    '• Anstellungsart (Vollzeit, Teilzeit, Mini-Job) festlegen',
    '• Wöchentliche Soll-Stunden und Stundenlohn definieren',
    '• Mitarbeiter aktivieren/deaktivieren',
  ];
  
  maInfo.forEach(info => {
    doc.text(info, 20, y);
    y += 7;
  });

  // Neue Seite
  doc.addPage();

  // ═══════════════════════════════════════════════════════════════
  // ZEITKONTEN
  // ═══════════════════════════════════════════════════════════════
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('5. Zeitkonten', 15, 20);
  
  y = 30;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const zeitInfo = [
    'Die Zeitkonten zeigen pro Mitarbeiter und Monat:',
    '• Überstunden-Saldo (neu angefallen, abgebaut, aktueller Stand)',
    '• Urlaubsanspruch, genommene Urlaubstage, Resturlaub',
    '• Krankheitstage',
    '• Automatische Berechnung aus den Schichtdaten',
  ];
  
  zeitInfo.forEach(info => {
    doc.text(info, 20, y);
    y += 7;
  });

  // ═══════════════════════════════════════════════════════════════
  // KPI ÜBERSICHT
  // ═══════════════════════════════════════════════════════════════
  y += 10;
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('6. KPI-Übersicht', 15, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const kpiInfo = [
    'In der KPI-Ansicht Ihrer Abteilung sehen Sie:',
    '• Aktuelle Finanzkennzahlen (Umsatz, DB I, DB II)',
    '• Personalkosten und Personalquote',
    '• Vergleich zum Vorjahr und Budget',
    '• Trend-Entwicklung über die letzten Monate',
  ];
  
  kpiInfo.forEach(info => {
    doc.text(info, 20, y);
    y += 7;
  });

  // ═══════════════════════════════════════════════════════════════
  // TIPPS
  // ═══════════════════════════════════════════════════════════════
  y += 15;
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('7. Tipps & Tricks', 15, y);
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const tipps = [
    '💡 Mobile Nutzung: Die App ist für Smartphones optimiert',
    '💡 Schnellzugriff: Nutzen Sie die Kacheln im Dashboard',
    '💡 Daten aktualisieren: Ziehen Sie nach unten (Pull-to-Refresh)',
    '💡 PDF-Export: Schichtpläne können als PDF exportiert werden',
    '💡 E-Mail: Senden Sie Schichtpläne direkt an Ihre Mitarbeiter',
  ];
  
  tipps.forEach(tipp => {
    doc.text(tipp, 20, y);
    y += 8;
  });

  // ═══════════════════════════════════════════════════════════════
  // SUPPORT
  // ═══════════════════════════════════════════════════════════════
  y += 15;
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, y, pageWidth - 30, 35, 3, 3, 'F');
  
  y += 10;
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229);
  doc.text('Hilfe & Support', 20, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Bei Fragen wenden Sie sich bitte an Ihren Administrator.', 20, y);
  y += 6;
  doc.text('Technischer Support: support@hotel-mandira.de', 20, y);

  // Footer auf allen Seiten
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Seite ${i} von ${pageCount} | Benutzerhandbuch | ${new Date().toLocaleDateString('de-DE')}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(`Benutzerhandbuch_Hotel-Mandira.pdf`);
}

/**
 * Exportiert den Rohertrag-Report als PDF
 */
interface AufwandKlasse {
  klasse: string;
  name: string;
  value: number;
  color: string;
}

interface BereichErloes {
  bereich: string;
  saldoAktuell: number;
  saldoVormonat: number | null;
}

export function exportRohertragToPdf(
  erloese: number,
  aufwand: number,
  rohertrag: number,
  rohmarge: number,
  aufwandNachKlassen: AufwandKlasse[],
  bereicheErloese: BereichErloes[],
  jahr: number,
  monat: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Rohertrag-Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${months[monat]} ${jahr}`, pageWidth / 2, 28, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, pageWidth - 15, 15, { align: 'right' });
  
  // Hauptkennzahlen Box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, 38, pageWidth - 30, 40, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Übersicht', 20, 48);
  
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  // Formel visualisieren
  doc.text(`Erlöse: ${formatCurrency(Math.abs(erloese))}`, 25, 58);
  doc.text(`−  Aufwand: ${formatCurrency(aufwand)}`, 25, 66);
  
  doc.setDrawColor(150, 150, 150);
  doc.line(25, 69, 95, 69);
  
  doc.setFontSize(12);
  doc.setTextColor(rohertrag >= 0 ? 34 : 185, rohertrag >= 0 ? 139 : 28, rohertrag >= 0 ? 34 : 28);
  doc.text(`=  Rohertrag: ${formatCurrency(rohertrag)}`, 25, 75);
  
  // Rohmarge rechts
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Rohmarge:', 130, 58);
  doc.setFontSize(18);
  doc.setTextColor(rohmarge >= 0 ? 34 : 185, rohmarge >= 0 ? 139 : 28, rohmarge >= 0 ? 34 : 28);
  doc.text(`${rohmarge.toFixed(1)}%`, 130, 70);
  
  // Aufwand nach Kontoklassen
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Aufwand nach Kontoklassen', 15, 95);
  
  const aufwandTableData = aufwandNachKlassen.map(k => {
    const prozent = aufwand > 0 ? (k.value / aufwand) * 100 : 0;
    return [
      `Klasse ${k.klasse}`,
      k.name,
      formatCurrency(k.value),
      `${prozent.toFixed(1)}%`,
    ];
  });
  
  // Summenzeile
  aufwandTableData.push([
    '',
    'Gesamt',
    formatCurrency(aufwand),
    '100%',
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['Klasse', 'Bezeichnung', 'Betrag', 'Anteil']],
    body: aufwandTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { halign: 'right', cellWidth: 45 },
      3: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      // Letzte Zeile (Summe) fett machen
      if (data.row.index === aufwandTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  // Erlöse nach Bereich
  const y = (doc as any).lastAutoTable?.finalY + 15 || 170;
  
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text('Erlöse nach Bereich', 15, y);
  
  const sortedBereiche = [...bereicheErloese].sort((a, b) => 
    Math.abs(b.saldoAktuell) - Math.abs(a.saldoAktuell)
  );
  
  const erloeseTableData = sortedBereiche.map(b => {
    const value = Math.abs(b.saldoAktuell);
    const prozent = Math.abs(erloese) > 0 ? (value / Math.abs(erloese)) * 100 : 0;
    return [
      b.bereich,
      formatCurrency(value),
      `${prozent.toFixed(1)}%`,
      b.saldoVormonat !== null ? formatCurrency(Math.abs(b.saldoVormonat)) : '–',
    ];
  });
  
  // Summenzeile
  erloeseTableData.push([
    'Gesamt',
    formatCurrency(Math.abs(erloese)),
    '100%',
    '',
  ]);

  autoTable(doc, {
    startY: y + 5,
    head: [['Bereich', 'Betrag', 'Anteil', 'Vormonat']],
    body: erloeseTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      if (data.row.index === erloeseTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  // Erklärung
  const finalY = (doc as any).lastAutoTable?.finalY + 15 || 250;
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, finalY, pageWidth - 30, 25, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Formeln:', 20, finalY + 8);
  doc.setFontSize(9);
  doc.text('Rohertrag = Erlöse − Aufwand (Klassen 5, 6, 7, 8)', 20, finalY + 16);
  doc.text('Rohmarge = (Rohertrag / Erlöse) × 100', 20, finalY + 22);

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
  doc.save(`Rohertrag-Report_${jahr}-${String(monat).padStart(2, '0')}.pdf`);
}

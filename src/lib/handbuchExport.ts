import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { branchenueblicheSchwellenwerte } from './kpiSchwellenwerteExport';

const currentDate = () => new Date().toLocaleDateString('de-DE');
const currentDateTime = () => new Date().toLocaleString('de-DE');

interface HandbuchData {
  schwellenwerte: any[];
  abteilungsleiter: any[];
  employees: any[];
  guests: any[];
}

// KPI Typ Labels für bessere Lesbarkeit
const kpiTypLabels: Record<string, string> = {
  'umsatz': 'Umsatz',
  'db1_marge': 'DB I Marge',
  'db2_marge': 'DB II Marge',
  'wareneinsatz_pct': 'Wareneinsatz %',
  'personal_pct': 'Personal %',
  'hk_rooms_per_attendant': 'Zimmer pro MA',
  'hk_inspection_pass_rate': 'Inspektionsquote',
  'hk_complaint_rate': 'Beschwerdequote HK',
  'hk_avg_minutes_per_room': 'Min. pro Zimmer',
  'kitchen_food_cost_pct': 'Food Cost %',
  'kitchen_labour_pct': 'Küchen-Personal %',
  'kitchen_prime_cost_pct': 'Prime Cost %',
  'kitchen_complaint_rate': 'Beschwerdequote Küche',
  'kitchen_order_accuracy': 'Bestellgenauigkeit',
  'kitchen_food_waste_pct': 'Verschwendung %',
  'service_sales_per_cover': 'Umsatz/Gast',
  'service_complaint_rate': 'Beschwerdequote Service',
  'service_error_rate': 'Fehlerquote',
  'service_avg_rating': 'Ø Service-Bewertung',
  'service_table_turnover': 'Tischumschlag',
  'spa_room_utilization': 'Raumauslastung Spa',
  'spa_therapist_utilization': 'Therapeuten-Ausl.',
  'spa_revenue_per_guest': 'Spa-Umsatz/Gast',
  'spa_no_show_rate': 'No-Show % Spa',
  'spa_complaint_rate': 'Beschwerdequote Spa',
  'spa_avg_rating': 'Ø Spa-Bewertung',
  'fo_avg_checkin_time': 'Check-in Zeit',
  'fo_complaint_rate': 'Beschwerdequote FO',
  'fo_upsell_conversion': 'Upsell %',
  'fo_fcr_rate': 'FCR Rate',
  'fo_avg_rating': 'Ø FO-Bewertung',
  'tech_ticket_backlog': 'Offene Tickets %',
  'tech_same_day_resolution': 'Same-Day %',
  'tech_preventive_maintenance': 'Präventiv %',
  'tech_emergency_rate': 'Notfall %',
  'tech_energy_per_room': 'kWh/Zimmer',
  'admin_sick_rate': 'Krankenquote',
  'admin_open_positions_rate': 'Offene Stellen %',
  'admin_turnover_rate': 'Fluktuation',
  'admin_it_availability': 'IT-Verfügbarkeit',
  'admin_payment_compliance': 'Zahlungs-Compliance',
};

const abteilungLabels: Record<string, string> = {
  'Gesamt': 'Gesamt / Finanzen',
  'Housekeeping': 'Housekeeping',
  'Kitchen': 'Küche',
  'Service': 'Service / Restaurant',
  'Spa': 'Spa & Wellness',
  'FrontOffice': 'Rezeption / Front Office',
  'Technical': 'Technik / Haustechnik',
  'Admin': 'Administration / HR / IT',
  'Guests': 'Gästeverwaltung',
};

export async function exportHandbuch(): Promise<void> {
  // Lade alle relevanten Daten
  const [schwellenwerteRes, abteilungsleiterRes, employeesRes, guestsRes] = await Promise.all([
    supabase.from('kpi_schwellenwerte').select('*').order('abteilung'),
    supabase.from('abteilungsleiter').select('*').eq('aktiv', true),
    supabase.from('employees').select('*').eq('aktiv', true),
    supabase.from('guests').select('id, gast_nummer, vorname, nachname, vip_status').limit(100),
  ]);

  const data: HandbuchData = {
    schwellenwerte: schwellenwerteRes.data || [],
    abteilungsleiter: abteilungsleiterRes.data || [],
    employees: employeesRes.data || [],
    guests: guestsRes.data || [],
  };

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ═══════════════════════════════════════════════════════════════
  // TITELSEITE
  // ═══════════════════════════════════════════════════════════════
  doc.setFillColor(30, 58, 48); // Dark green
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo area
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2, 60, 25, 'F');
  doc.setTextColor(30, 58, 48);
  doc.setFontSize(24);
  doc.text('M', pageWidth / 2, 66, { align: 'center' });
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.text('Mandira Resort', pageWidth / 2, 110, { align: 'center' });
  
  doc.setFontSize(20);
  doc.text('KPI Management Handbuch', pageWidth / 2, 125, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text('Vollständige Dokumentation aller Kennzahlen und Konfigurationen', pageWidth / 2, 145, { align: 'center' });
  
  // Version info
  doc.setFontSize(10);
  doc.text(`Version: ${currentDateTime()}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
  doc.text('Automatisch generiert', pageWidth / 2, pageHeight - 32, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════
  // INHALTSVERZEICHNIS
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(22);
  doc.text('Inhaltsverzeichnis', 15, 25);
  
  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  
  const tocItems = [
    { title: '1. Einleitung & Systemübersicht', page: 3 },
    { title: '2. Finanz-KPIs', page: 4 },
    { title: '3. Operative KPIs nach Abteilung', page: 5 },
    { title: '4. Konfigurierte Schwellenwerte', page: 7 },
    { title: '5. Branchenübliche Benchmarks', page: 9 },
    { title: '6. Organisationsstruktur', page: 11 },
    { title: '7. Mitarbeiterübersicht', page: 12 },
    { title: '8. Gästeverwaltung', page: 13 },
    { title: '9. Formeln & Berechnungen', page: 14 },
    { title: '10. Glossar', page: 15 },
  ];
  
  let tocY = 45;
  tocItems.forEach(item => {
    doc.text(item.title, 20, tocY);
    doc.text(String(item.page), pageWidth - 20, tocY, { align: 'right' });
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(20 + doc.getTextWidth(item.title) + 5, tocY, pageWidth - 25, tocY);
    tocY += 10;
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. EINLEITUNG
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '1. Einleitung & Systemübersicht');
  
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  
  const introText = `Dieses Handbuch dokumentiert alle Key Performance Indicators (KPIs) des Mandira Resort KPI-Management-Systems. Es wird automatisch bei jedem Export aktualisiert und spiegelt immer den aktuellen Stand der Konfiguration wider.

Das System ermöglicht:
• Echtzeitüberwachung aller relevanten Geschäftskennzahlen
• Automatische Alarmierung bei Schwellenwertüberschreitungen
• Vergleich mit Branchenbenchmarks für Health Resorts
• Trend-Analysen und Vorjahresvergleiche
• Abteilungsspezifische Daily Reports

Zielgruppe: Geschäftsführung, Controlling, Abteilungsleiter`;

  const introLines = doc.splitTextToSize(introText, pageWidth - 30);
  doc.text(introLines, 15, 50);

  // System stats box
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(15, 120, pageWidth - 30, 50, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Aktuelle Systemstatistik:', 20, 130);
  
  doc.setTextColor(80, 80, 80);
  doc.text(`• ${data.schwellenwerte.length} konfigurierte KPI-Schwellenwerte`, 25, 142);
  doc.text(`• ${data.abteilungsleiter.length} aktive Abteilungsleiter`, 25, 150);
  doc.text(`• ${data.employees.length} aktive Mitarbeiter`, 25, 158);
  doc.text(`• ${data.guests.length} registrierte Gäste (Auszug)`, 25, 166);

  // ═══════════════════════════════════════════════════════════════
  // 2. FINANZ-KPIs
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '2. Finanz-KPIs');
  
  const finanzKpis = [
    ['Umsatz', 'Gesamtumsatz in €', 'Summe aller Erlöskonten (Klasse 4)', '> 420.000 €/Monat'],
    ['DB I', 'Deckungsbeitrag I', 'Umsatz − Wareneinsatz', 'Positiv'],
    ['DB I Marge', 'DB I in % vom Umsatz', '(DB I / Umsatz) × 100', '≥ 65%'],
    ['DB II', 'Deckungsbeitrag II', 'DB I − Personalkosten', 'Positiv'],
    ['DB II Marge', 'DB II in % vom Umsatz', '(DB II / Umsatz) × 100', '≥ 35%'],
    ['Wareneinsatz', 'Materialaufwand', 'Summe Klasse 5', '≤ 25% vom Umsatz'],
    ['Personalkosten', 'Löhne & Gehälter', 'Summe Klasse 6', '≤ 35% vom Umsatz'],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['KPI', 'Beschreibung', 'Berechnung', 'Zielwert']],
    body: finanzKpis,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 30 }, 
      1: { cellWidth: 45 }, 
      2: { cellWidth: 55 },
      3: { cellWidth: 40 }
    },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. OPERATIVE KPIs
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '3. Operative KPIs nach Abteilung');
  
  // Housekeeping
  addSubsectionHeader(doc, 'Housekeeping', 45);
  
  const hkKpis = [
    ['Zimmer pro MA', 'Produktivität', 'Gereinigte Zimmer ÷ MA', '12-16'],
    ['Inspektionsquote', 'Qualität', 'Bestandene ÷ Geprüfte × 100', '≥ 95%'],
    ['Beschwerdequote', 'Gästezufriedenheit', 'Beschwerden ÷ Belegte Zimmer', '≤ 1%'],
    ['Min. pro Zimmer', 'Effizienz', 'Gesamtzeit ÷ Zimmer', '20-35 Min'],
  ];

  autoTable(doc, {
    startY: 55,
    head: [['KPI', 'Kategorie', 'Berechnung', 'Zielwert']],
    body: hkKpis,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // Kitchen
  let y = (doc as any).lastAutoTable?.finalY + 10 || 100;
  addSubsectionHeader(doc, 'Küche', y);
  
  const kitchenKpis = [
    ['Food Cost %', 'Wareneinsatz', 'Food Cost ÷ Food Revenue', '25-32%'],
    ['Labour %', 'Personalkosten', 'Küchen-Personal ÷ Revenue', '≤ 35%'],
    ['Prime Cost %', 'Gesamtkosten', 'Food + Labour', '≤ 65%'],
    ['Beschwerdequote', 'Qualität', 'Beschwerden ÷ Gerichte', '≤ 0.5%'],
    ['Bestellgenauigkeit', 'Service', 'Korrekte ÷ Gesamt', '≥ 98%'],
    ['Verschwendung', 'Nachhaltigkeit', 'Waste ÷ Food Purchased', '≤ 3%'],
  ];

  autoTable(doc, {
    startY: y + 10,
    head: [['KPI', 'Kategorie', 'Berechnung', 'Zielwert']],
    body: kitchenKpis,
    theme: 'striped',
    headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // Spa - New Page
  doc.addPage();
  addSubsectionHeader(doc, 'Spa & Wellness', 20);
  
  const spaKpis = [
    ['Raumauslastung', 'Kapazität', 'Gebuchte ÷ Verfügbare Stunden', '≥ 70%'],
    ['Therapeuten-Ausl.', 'Produktivität', 'Behandlungszeit ÷ Arbeitszeit', '75-90%'],
    ['Umsatz/Gast', 'Revenue', 'Spa-Umsatz ÷ Gäste', '≥ 45 €'],
    ['No-Show %', 'Buchungsmanagement', 'No-Shows ÷ Buchungen', '≤ 5%'],
    ['Ø Bewertung', 'Qualität', 'Summe ÷ Anzahl Bewertungen', '≥ 4.5'],
  ];

  autoTable(doc, {
    startY: 30,
    head: [['KPI', 'Kategorie', 'Berechnung', 'Zielwert']],
    body: spaKpis,
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // Service
  y = (doc as any).lastAutoTable?.finalY + 10 || 80;
  addSubsectionHeader(doc, 'Service / Restaurant', y);
  
  const serviceKpis = [
    ['Umsatz/Cover', 'Revenue', 'Umsatz ÷ Gäste', '≥ 28 €'],
    ['Tischumschlag', 'Effizienz', 'Gäste ÷ Tische pro Service', '1.5-2.5x'],
    ['Fehlerquote', 'Qualität', 'Fehler ÷ Bestellungen', '≤ 2%'],
    ['Ø Bewertung', 'Zufriedenheit', 'Summe ÷ Anzahl', '≥ 4.2'],
  ];

  autoTable(doc, {
    startY: y + 10,
    head: [['KPI', 'Kategorie', 'Berechnung', 'Zielwert']],
    body: serviceKpis,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // Front Office & Technical
  y = (doc as any).lastAutoTable?.finalY + 10 || 140;
  addSubsectionHeader(doc, 'Front Office', y);
  
  const foKpis = [
    ['Check-in Zeit', 'Effizienz', 'Ø Dauer in Sekunden', '≤ 180 Sek'],
    ['FCR Rate', 'Service', 'Erst-Kontakt-Lösungen', '≥ 85%'],
    ['Upsell %', 'Revenue', 'Erfolgreiche ÷ Versuche', '≥ 15%'],
  ];

  autoTable(doc, {
    startY: y + 10,
    head: [['KPI', 'Kategorie', 'Berechnung', 'Zielwert']],
    body: foKpis,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. KONFIGURIERTE SCHWELLENWERTE
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '4. Konfigurierte Schwellenwerte');
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Stand: ${currentDateTime()} | ${data.schwellenwerte.length} Schwellenwerte konfiguriert`, 15, 45);
  
  // Group by department
  const schwellenwerteByAbt = data.schwellenwerte.reduce((acc: any, s: any) => {
    if (!acc[s.abteilung]) acc[s.abteilung] = [];
    acc[s.abteilung].push(s);
    return acc;
  }, {});

  y = 55;
  Object.entries(schwellenwerteByAbt).forEach(([abt, items]: [string, any]) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    const tableData = items.map((s: any) => {
      let wert = '';
      if (s.schwellenwert_min !== null && s.schwellenwert_max !== null) {
        wert = `${s.schwellenwert_min} - ${s.schwellenwert_max}`;
      } else if (s.schwellenwert_min !== null) {
        wert = `≥ ${s.schwellenwert_min}`;
      } else if (s.schwellenwert_max !== null) {
        wert = `≤ ${s.schwellenwert_max}`;
      }
      return [
        kpiTypLabels[s.kpi_typ] || s.kpi_typ,
        wert,
        s.alarm_aktiv ? '✓ Aktiv' : '✗ Inaktiv'
      ];
    });

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(abteilungLabels[abt] || abt, 15, y);

    autoTable(doc, {
      startY: y + 3,
      head: [['KPI', 'Schwellenwert', 'Alarm']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [70, 130, 180], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 } },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
    });
    
    y = (doc as any).lastAutoTable?.finalY + 10 || y + 50;
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. BRANCHENBENCHMARKS
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '5. Branchenübliche Benchmarks');
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Referenzwerte für Health Resorts und Wellness Hotels (DEHOGA, Hotelverband)', 15, 45);

  const benchmarkData = Object.entries(branchenueblicheSchwellenwerte)
    .slice(0, 30)
    .map(([key, val]) => {
      let wert = '';
      if (val.min !== undefined && val.max !== undefined) {
        wert = `${val.min} - ${val.max} ${val.einheit}`;
      } else if (val.min !== undefined) {
        wert = `≥ ${val.min} ${val.einheit}`;
      } else if (val.max !== undefined) {
        wert = `≤ ${val.max} ${val.einheit}`;
      }
      return [kpiTypLabels[key] || key, wert, val.beschreibung];
    });

  autoTable(doc, {
    startY: 55,
    head: [['KPI', 'Branchenwert', 'Beschreibung']],
    body: benchmarkData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 }, 2: { cellWidth: 95 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. ORGANISATIONSSTRUKTUR
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '6. Organisationsstruktur');
  
  if (data.abteilungsleiter.length > 0) {
    const abtLeiterData = data.abteilungsleiter.map((al: any) => [
      al.name,
      al.abteilung,
      al.email,
      al.aktiv ? 'Aktiv' : 'Inaktiv'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Name', 'Abteilung', 'E-Mail', 'Status']],
      body: abtLeiterData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Keine Abteilungsleiter konfiguriert.', 15, 50);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. MITARBEITER
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '7. Mitarbeiterübersicht');
  
  // Group employees by department
  const employeesByDept = data.employees.reduce((acc: any, e: any) => {
    if (!acc[e.abteilung]) acc[e.abteilung] = [];
    acc[e.abteilung].push(e);
    return acc;
  }, {});

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Gesamt: ${data.employees.length} aktive Mitarbeiter`, 15, 45);

  const deptSummary = Object.entries(employeesByDept).map(([dept, emps]: [string, any]) => [
    dept,
    String(emps.length),
    emps.filter((e: any) => e.anstellungsart === 'Vollzeit').length,
    emps.filter((e: any) => e.anstellungsart === 'Teilzeit').length,
    emps.filter((e: any) => e.anstellungsart === 'Mini-Job' || e.anstellungsart === 'Aushilfe').length,
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Abteilung', 'Gesamt', 'Vollzeit', 'Teilzeit', 'Mini-Job/Aushilfe']],
    body: deptSummary,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. GÄSTEVERWALTUNG
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '8. Gästeverwaltung');
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Registrierte Gäste: ${data.guests.length}+ | VIP-Gäste: ${data.guests.filter((g: any) => g.vip_status).length}`, 15, 45);

  const guestTypes = [
    ['Wellness', 'Gäste mit Fokus auf Entspannung und Wohlbefinden'],
    ['Kurgast', 'Medizinisch orientierte Aufenthalte mit ärztlicher Betreuung'],
    ['Retreat', 'Längere Aufenthalte mit spirituellem/mentalen Fokus'],
    ['Tagesgast', 'Tagesbesucher für Spa, Restaurant oder Veranstaltungen'],
    ['Geschäftsreisend', 'Business-Gäste für Tagungen und Meetings'],
  ];

  autoTable(doc, {
    startY: 55,
    head: [['Gasttyp', 'Beschreibung']],
    body: guestTypes,
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. FORMELN
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '9. Formeln & Berechnungen');
  
  const formeln = [
    ['DB I (Deckungsbeitrag I)', 'Umsatz − Wareneinsatz'],
    ['DB II (Deckungsbeitrag II)', 'DB I − Personalkosten'],
    ['DB I Marge %', '(DB I ÷ Umsatz) × 100'],
    ['DB II Marge %', '(DB II ÷ Umsatz) × 100'],
    ['Rohertrag', 'Erlöse − Gesamtaufwand'],
    ['Rohmarge %', '(Rohertrag ÷ Erlöse) × 100'],
    ['ADR (Average Daily Rate)', 'Logis-Umsatz ÷ Belegte Zimmer'],
    ['RevPAR', 'Logis-Umsatz ÷ Verfügbare Zimmer'],
    ['Belegungsrate %', '(Belegte ÷ Verfügbare Zimmer) × 100'],
    ['Food Cost %', '(Wareneinsatz Food ÷ Food Revenue) × 100'],
    ['Prime Cost %', '(Food Cost + Labour Cost) ÷ Revenue × 100'],
    ['Therapeuten-Auslastung %', '(Behandlungszeit ÷ Arbeitszeit) × 100'],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Kennzahl', 'Formel']],
    body: formeln,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 115 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. GLOSSAR
  // ═══════════════════════════════════════════════════════════════
  doc.addPage();
  addSectionHeader(doc, '10. Glossar');
  
  const glossar = [
    ['ADR', 'Average Daily Rate - Durchschnittlicher Zimmerpreis pro Nacht'],
    ['Cover', 'Ein Gast im Restaurant (für Umsatzberechnungen)'],
    ['DB I', 'Deckungsbeitrag I - Rohertrag nach Wareneinsatz'],
    ['DB II', 'Deckungsbeitrag II - Ertrag nach Personalkosten'],
    ['FCR', 'First Contact Resolution - Lösung beim ersten Kontakt'],
    ['KPI', 'Key Performance Indicator - Schlüsselkennzahl'],
    ['Prime Cost', 'Summe aus Wareneinsatz und Personalkosten'],
    ['RevPAR', 'Revenue per Available Room - Umsatz pro verfügbarem Zimmer'],
    ['RevPATH', 'Revenue per Available Treatment Hour - Spa-Kennzahl'],
    ['RLS', 'Row Level Security - Datenbankzugriffskontrolle'],
    ['YTD', 'Year to Date - Jahresverlauf bis heute'],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Begriff', 'Definition']],
    body: glossar,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 48], textColor: 255, fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 1: { cellWidth: 140 } },
    margin: { left: 15, right: 15 },
  });

  // ═══════════════════════════════════════════════════════════════
  // FOOTER auf allen Seiten
  // ═══════════════════════════════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Mandira Resort - KPI Handbuch | ${currentDate()}`, 15, pageHeight - 10);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
  }

  // Download
  doc.save(`Mandira_KPI_Handbuch_${currentDate().replace(/\./g, '-')}.pdf`);
}

function addSectionHeader(doc: jsPDF, title: string) {
  doc.setFillColor(30, 58, 48);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(title, 15, 20);
}

function addSubsectionHeader(doc: jsPDF, title: string, y: number) {
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(title, 15, y);
}

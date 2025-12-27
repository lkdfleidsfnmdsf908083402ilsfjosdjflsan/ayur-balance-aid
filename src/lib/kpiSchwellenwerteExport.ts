import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Schwellenwert {
  id: string;
  abteilung: string;
  kpi_typ: string;
  schwellenwert_min: number | null;
  schwellenwert_max: number | null;
  alarm_aktiv: boolean;
}

// Branchenübliche Schwellenwerte für Health Resorts / Wellness Hotels
export const branchenueblicheSchwellenwerte: Record<string, { min?: number; max?: number; einheit: string; beschreibung: string }> = {
  // Gesamt / Finanzen
  'umsatz': { min: 35000, einheit: '€', beschreibung: 'Monatlicher Mindestumsatz' },
  'db1_marge': { min: 60, max: 75, einheit: '%', beschreibung: 'Rohertragsmarge (DB I)' },
  'db2_marge': { min: 30, max: 45, einheit: '%', beschreibung: 'Deckungsbeitrag II nach Personal' },
  'wareneinsatz_pct': { max: 30, einheit: '%', beschreibung: 'Wareneinsatzquote' },
  'personal_pct': { max: 40, einheit: '%', beschreibung: 'Personalkostenquote' },
  
  // Housekeeping
  'hk_rooms_per_attendant': { min: 12, max: 16, einheit: 'Zimmer', beschreibung: 'Zimmer pro Mitarbeiter' },
  'hk_inspection_pass_rate': { min: 92, einheit: '%', beschreibung: 'Inspektions-Erfolgsrate' },
  'hk_complaint_rate': { max: 2, einheit: '%', beschreibung: 'Beschwerdequote Sauberkeit' },
  'hk_avg_minutes_per_room': { min: 20, max: 40, einheit: 'Min', beschreibung: 'Durchschnittliche Reinigungszeit' },
  
  // Kitchen
  'kitchen_food_cost_pct': { min: 28, max: 35, einheit: '%', beschreibung: 'Food Cost Quote' },
  'kitchen_labour_pct': { max: 38, einheit: '%', beschreibung: 'Küchen-Personalkosten' },
  'kitchen_prime_cost_pct': { max: 70, einheit: '%', beschreibung: 'Prime Cost (Food + Labour)' },
  'kitchen_complaint_rate': { max: 1, einheit: '%', beschreibung: 'Beschwerdequote Küche' },
  'kitchen_order_accuracy': { min: 95, einheit: '%', beschreibung: 'Bestellgenauigkeit' },
  'kitchen_food_waste_pct': { max: 5, einheit: '%', beschreibung: 'Lebensmittelverschwendung' },
  
  // Service
  'service_sales_per_cover': { min: 25, einheit: '€', beschreibung: 'Umsatz pro Gast' },
  'service_complaint_rate': { max: 2, einheit: '%', beschreibung: 'Beschwerdequote Service' },
  'service_error_rate': { max: 3, einheit: '%', beschreibung: 'Fehlerquote' },
  'service_avg_rating': { min: 4.0, einheit: '⭐', beschreibung: 'Durchschnittliche Bewertung' },
  'service_table_turnover': { min: 1.2, max: 2.0, einheit: 'x', beschreibung: 'Tischumschlag pro Service' },
  
  // Spa
  'spa_room_utilization': { min: 65, max: 85, einheit: '%', beschreibung: 'Raumauslastung' },
  'spa_therapist_utilization': { min: 70, max: 85, einheit: '%', beschreibung: 'Therapeuten-Auslastung' },
  'spa_revenue_per_guest': { min: 40, einheit: '€', beschreibung: 'Spa-Umsatz pro Gast' },
  'spa_no_show_rate': { max: 8, einheit: '%', beschreibung: 'No-Show-Quote' },
  'spa_complaint_rate': { max: 1, einheit: '%', beschreibung: 'Beschwerdequote Spa' },
  'spa_avg_rating': { min: 4.3, einheit: '⭐', beschreibung: 'Durchschnittliche Spa-Bewertung' },
  
  // Front Office
  'fo_avg_checkin_time': { max: 240, einheit: 'Sek', beschreibung: 'Durchschnittliche Check-in Zeit' },
  'fo_complaint_rate': { max: 2, einheit: '%', beschreibung: 'Beschwerdequote Rezeption' },
  'fo_upsell_conversion': { min: 10, einheit: '%', beschreibung: 'Upselling-Konversionsrate' },
  'fo_fcr_rate': { min: 80, einheit: '%', beschreibung: 'First Contact Resolution' },
  'fo_avg_rating': { min: 4.0, einheit: '⭐', beschreibung: 'Durchschnittliche FO-Bewertung' },
  
  // Technical
  'tech_ticket_backlog': { max: 20, einheit: 'Tickets', beschreibung: 'Offene Tickets' },
  'tech_same_day_resolution': { min: 60, einheit: '%', beschreibung: 'Same-Day-Lösung' },
  'tech_preventive_maintenance': { min: 85, einheit: '%', beschreibung: 'Präventive Wartung Quote' },
  'tech_emergency_rate': { max: 15, einheit: '%', beschreibung: 'Notfall-Reparatur-Quote' },
  'tech_energy_per_room': { max: 30, einheit: 'kWh', beschreibung: 'Energieverbrauch pro Zimmer' },
  
  // Admin/HR
  'admin_sick_rate': { max: 6, einheit: '%', beschreibung: 'Krankenquote' },
  'admin_open_positions_rate': { max: 10, einheit: '%', beschreibung: 'Offene Stellen Quote' },
  'admin_turnover_rate': { max: 15, einheit: '%', beschreibung: 'Jahresfluktuation' },
  'admin_it_availability': { min: 98, einheit: '%', beschreibung: 'IT-Verfügbarkeit' },
  'admin_payment_compliance': { min: 90, einheit: '%', beschreibung: 'Zahlungs-Compliance' },
  
  // Gäste
  'guest_occupancy_rate': { min: 65, max: 85, einheit: '%', beschreibung: 'Zimmerauslastung' },
  'guest_adr': { min: 120, einheit: '€', beschreibung: 'Average Daily Rate' },
  'guest_revpar': { min: 80, einheit: '€', beschreibung: 'Revenue per Available Room' },
  'guest_revenue_per_guest': { min: 150, einheit: '€', beschreibung: 'Gesamtumsatz pro Gast' },
  'guest_avg_rating': { min: 4.2, einheit: '⭐', beschreibung: 'Durchschnittliche Gästebewertung' },
  'guest_return_rate': { min: 25, einheit: '%', beschreibung: 'Wiederkehrerquote' },
};

const kpiTypLabels: Record<string, string> = {
  'umsatz': 'Umsatz',
  'db1_marge': 'DB I Marge',
  'db2_marge': 'DB II Marge',
  'wareneinsatz_pct': 'Wareneinsatz %',
  'personal_pct': 'Personal %',
  'hk_rooms_per_attendant': 'Zimmer pro MA',
  'hk_inspection_pass_rate': 'Inspektionsquote',
  'hk_complaint_rate': 'Beschwerdequote',
  'hk_avg_minutes_per_room': 'Min. pro Zimmer',
  'kitchen_food_cost_pct': 'Food Cost %',
  'kitchen_labour_pct': 'Küchen-Personal %',
  'kitchen_prime_cost_pct': 'Prime Cost %',
  'kitchen_complaint_rate': 'Beschwerdequote',
  'kitchen_order_accuracy': 'Bestellgenauigkeit',
  'kitchen_food_waste_pct': 'Verschwendung %',
  'service_sales_per_cover': 'Umsatz/Gast',
  'service_complaint_rate': 'Beschwerdequote',
  'service_error_rate': 'Fehlerquote',
  'service_avg_rating': 'Ø Bewertung',
  'service_table_turnover': 'Tischumschlag',
  'spa_room_utilization': 'Raumauslastung',
  'spa_therapist_utilization': 'Therapeuten-Ausl.',
  'spa_revenue_per_guest': 'Umsatz/Gast',
  'spa_no_show_rate': 'No-Show %',
  'spa_complaint_rate': 'Beschwerdequote',
  'spa_avg_rating': 'Ø Bewertung',
  'fo_avg_checkin_time': 'Check-in Zeit',
  'fo_complaint_rate': 'Beschwerdequote',
  'fo_upsell_conversion': 'Upsell %',
  'fo_fcr_rate': 'FCR Rate',
  'fo_avg_rating': 'Ø Bewertung',
  'tech_ticket_backlog': 'Offene Tickets',
  'tech_same_day_resolution': 'Same-Day %',
  'tech_preventive_maintenance': 'Präventiv %',
  'tech_emergency_rate': 'Notfall %',
  'tech_energy_per_room': 'kWh/Zimmer',
  'admin_sick_rate': 'Krankenquote',
  'admin_open_positions_rate': 'Offene Stellen',
  'admin_turnover_rate': 'Fluktuation',
  'admin_it_availability': 'IT-Verfügbarkeit',
  'admin_payment_compliance': 'Zahlungs-Kompl.',
  'guest_occupancy_rate': 'Belegungsrate',
  'guest_adr': 'ADR',
  'guest_revpar': 'RevPAR',
  'guest_revenue_per_guest': 'Umsatz/Gast',
  'guest_avg_rating': 'Ø Bewertung',
  'guest_return_rate': 'Wiederkehrerquote',
};

const abteilungLabels: Record<string, string> = {
  'Gesamt': 'Gesamt / Finanzen',
  'Housekeeping': 'Housekeeping',
  'Kitchen': 'Küche',
  'Service': 'Service / Restaurant',
  'Spa': 'Spa & Wellness',
  'FrontOffice': 'Rezeption',
  'Technical': 'Technik',
  'Admin': 'Administration / HR',
  'Guests': 'Gäste',
};

export function exportSchwellenwerteVergleich(aktuelleSchwellenwerte: Schwellenwert[]) {
  const doc = new jsPDF();
  const currentDate = new Date().toLocaleDateString('de-DE');
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('KPI Schwellenwerte - Vergleich', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Erstellt am: ${currentDate}`, 14, 30);
  doc.text('Branchenvergleich: Health Resort / Wellness Hotel', 14, 36);
  
  // Gruppiere nach Abteilung
  const abteilungen = [...new Set(aktuelleSchwellenwerte.map(s => s.abteilung))];
  
  let yPosition = 46;
  
  abteilungen.forEach((abteilung) => {
    const abteilungSchwellenwerte = aktuelleSchwellenwerte.filter(s => s.abteilung === abteilung);
    
    // Abteilungs-Header
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(abteilungLabels[abteilung] || abteilung, 14, yPosition);
    yPosition += 4;
    
    const tableData = abteilungSchwellenwerte.map(s => {
      const branche = branchenueblicheSchwellenwerte[s.kpi_typ];
      const label = kpiTypLabels[s.kpi_typ] || s.kpi_typ;
      
      // Aktuelle Werte formatieren
      let aktuelleWerte = '';
      if (s.schwellenwert_min !== null && s.schwellenwert_max !== null) {
        aktuelleWerte = `${s.schwellenwert_min} - ${s.schwellenwert_max}`;
      } else if (s.schwellenwert_min !== null) {
        aktuelleWerte = `≥ ${s.schwellenwert_min}`;
      } else if (s.schwellenwert_max !== null) {
        aktuelleWerte = `≤ ${s.schwellenwert_max}`;
      }
      
      // Branchenübliche Werte
      let branchenWerte = '-';
      let einheit = '';
      if (branche) {
        einheit = branche.einheit;
        if (branche.min !== undefined && branche.max !== undefined) {
          branchenWerte = `${branche.min} - ${branche.max}`;
        } else if (branche.min !== undefined) {
          branchenWerte = `≥ ${branche.min}`;
        } else if (branche.max !== undefined) {
          branchenWerte = `≤ ${branche.max}`;
        }
      }
      
      // Bewertung
      let bewertung = '✓';
      if (branche) {
        const isStricter = checkIfStricter(s, branche);
        if (isStricter === 'stricter') {
          bewertung = '⬆ Strenger';
        } else if (isStricter === 'looser') {
          bewertung = '⬇ Lockerer';
        } else {
          bewertung = '= Standard';
        }
      }
      
      return [
        label,
        einheit,
        aktuelleWerte,
        branchenWerte,
        bewertung,
        s.alarm_aktiv ? '✓' : '✗'
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['KPI', 'Einheit', 'Aktuell', 'Branche', 'Vergleich', 'Aktiv']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [70, 130, 180],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: { 
        fontSize: 8 
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 18 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25 },
        5: { cellWidth: 15 }
      },
      margin: { left: 14, right: 14 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  });
  
  // Legende
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Legende:', 14, yPosition + 5);
  doc.setFontSize(8);
  doc.text('⬆ Strenger = Ihre Schwellenwerte sind strenger als der Branchenstandard', 14, yPosition + 12);
  doc.text('⬇ Lockerer = Ihre Schwellenwerte sind lockerer als der Branchenstandard', 14, yPosition + 18);
  doc.text('= Standard = Ihre Schwellenwerte entsprechen dem Branchenstandard', 14, yPosition + 24);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Seite ${i} von ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    doc.text('Mandira Resort - KPI Management', 14, doc.internal.pageSize.height - 10);
  }
  
  doc.save(`KPI_Schwellenwerte_Vergleich_${currentDate.replace(/\./g, '-')}.pdf`);
}

function checkIfStricter(
  aktuell: Schwellenwert, 
  branche: { min?: number; max?: number }
): 'stricter' | 'looser' | 'equal' {
  const aktMin = aktuell.schwellenwert_min;
  const aktMax = aktuell.schwellenwert_max;
  const brMin = branche.min;
  const brMax = branche.max;
  
  // Vergleiche Minimum (höheres Minimum = strenger)
  if (aktMin !== null && brMin !== undefined) {
    if (aktMin > brMin) return 'stricter';
    if (aktMin < brMin) return 'looser';
  }
  
  // Vergleiche Maximum (niedrigeres Maximum = strenger)
  if (aktMax !== null && brMax !== undefined) {
    if (aktMax < brMax) return 'stricter';
    if (aktMax > brMax) return 'looser';
  }
  
  return 'equal';
}

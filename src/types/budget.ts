import { Bereich } from './finance';

export interface BudgetPlanung {
  id?: string;
  abteilung: Bereich;
  jahr: number;
  monat: number;
  umsatzBudget: number;
  wareneinsatzBudget: number;
  personalBudget: number;
  energieBudget: number;
  marketingBudget: number;
  db1Budget: number;
  db2Budget: number;
}

// Erweiterte KPI-Typen für alle Abteilungen und Daily Reports
export type KpiTyp = 
  // Operative KPIs (Finanz)
  | 'umsatz' 
  | 'db1' 
  | 'db2' 
  | 'db1_marge' 
  | 'db2_marge'
  | 'wareneinsatz'
  | 'wareneinsatz_pct'
  | 'personal'
  | 'personal_pct'
  | 'energie'
  | 'marketing'
  | 'betriebsaufwand'
  // Housekeeping KPIs
  | 'hk_rooms_per_attendant'
  | 'hk_inspection_pass_rate'
  | 'hk_complaint_rate'
  | 'hk_avg_minutes_per_room'
  // Kitchen KPIs
  | 'kitchen_food_cost_pct'
  | 'kitchen_labour_pct'
  | 'kitchen_prime_cost_pct'
  | 'kitchen_complaint_rate'
  | 'kitchen_order_accuracy'
  | 'kitchen_food_waste_pct'
  // Service KPIs
  | 'service_sales_per_cover'
  | 'service_complaint_rate'
  | 'service_error_rate'
  | 'service_avg_rating'
  | 'service_table_turnover'
  // Spa KPIs
  | 'spa_room_utilization'
  | 'spa_therapist_utilization'
  | 'spa_revenue_per_guest'
  | 'spa_no_show_rate'
  | 'spa_complaint_rate'
  | 'spa_avg_rating'
  // Front Office KPIs
  | 'fo_avg_checkin_time'
  | 'fo_complaint_rate'
  | 'fo_upsell_conversion'
  | 'fo_fcr_rate'
  | 'fo_avg_rating'
  // Technical KPIs
  | 'tech_ticket_backlog'
  | 'tech_same_day_resolution'
  | 'tech_preventive_maintenance'
  | 'tech_emergency_rate'
  | 'tech_energy_per_room'
  // Admin/HR KPIs
  | 'admin_sick_rate'
  | 'admin_open_positions_rate'
  | 'admin_turnover_rate'
  | 'admin_it_availability'
  | 'admin_payment_compliance';

export interface KpiSchwellenwert {
  id?: string;
  abteilung: Bereich | 'Gesamt' | 'Housekeeping' | 'Kitchen' | 'Service' | 'FrontOffice' | 'Technical' | 'Admin';
  kpiTyp: KpiTyp;
  schwellenwertMin?: number;
  schwellenwertMax?: number;
  alarmAktiv: boolean;
}

export const kpiTypLabels: Record<KpiTyp, string> = {
  // Operative Finanz-KPIs
  umsatz: 'Umsatz',
  db1: 'DB I',
  db2: 'DB II',
  db1_marge: 'DB I Marge %',
  db2_marge: 'DB II Marge %',
  wareneinsatz: 'Wareneinsatz',
  wareneinsatz_pct: 'Wareneinsatz %',
  personal: 'Personalkosten',
  personal_pct: 'Personalkosten %',
  energie: 'Energiekosten',
  marketing: 'Marketingkosten',
  betriebsaufwand: 'Betriebsaufwand',
  
  // Housekeeping
  hk_rooms_per_attendant: 'Zimmer pro Mitarbeiter',
  hk_inspection_pass_rate: 'Inspektions-Bestehensquote %',
  hk_complaint_rate: 'Beschwerdequote %',
  hk_avg_minutes_per_room: 'Ø Minuten pro Zimmer',
  
  // Kitchen
  kitchen_food_cost_pct: 'Food Cost %',
  kitchen_labour_pct: 'Kitchen Labour %',
  kitchen_prime_cost_pct: 'Prime Cost %',
  kitchen_complaint_rate: 'Reklamationsquote %',
  kitchen_order_accuracy: 'Bestellgenauigkeit %',
  kitchen_food_waste_pct: 'Lebensmittelabfall %',
  
  // Service
  service_sales_per_cover: 'Umsatz pro Gast',
  service_complaint_rate: 'Beschwerdequote %',
  service_error_rate: 'Fehlerquote %',
  service_avg_rating: 'Ø Bewertung',
  service_table_turnover: 'Tischumschlag',
  
  // Spa
  spa_room_utilization: 'Raumauslastung %',
  spa_therapist_utilization: 'Therapeuten-Auslastung %',
  spa_revenue_per_guest: 'Umsatz pro Gast',
  spa_no_show_rate: 'No-Show-Rate %',
  spa_complaint_rate: 'Beschwerdequote %',
  spa_avg_rating: 'Ø Bewertung',
  
  // Front Office
  fo_avg_checkin_time: 'Ø Check-in Zeit (Sek.)',
  fo_complaint_rate: 'Beschwerdequote %',
  fo_upsell_conversion: 'Upsell Conversion %',
  fo_fcr_rate: 'First Contact Resolution %',
  fo_avg_rating: 'Ø Bewertung',
  
  // Technical
  tech_ticket_backlog: 'Ticket-Backlog %',
  tech_same_day_resolution: 'Same-Day Resolution %',
  tech_preventive_maintenance: 'Präventive Wartung %',
  tech_emergency_rate: 'Notfall-Rate %',
  tech_energy_per_room: 'kWh pro Zimmer',
  
  // Admin/HR
  admin_sick_rate: 'Krankenquote %',
  admin_open_positions_rate: 'Offene Stellen %',
  admin_turnover_rate: 'Fluktuation %',
  admin_it_availability: 'IT-Verfügbarkeit %',
  admin_payment_compliance: 'Zahlungstreue %',
};

// Gruppierung der KPI-Typen nach Bereich für bessere UX
export const kpiTypGroups: Record<string, KpiTyp[]> = {
  'Finanz (Operativ)': ['umsatz', 'db1', 'db2', 'db1_marge', 'db2_marge', 'wareneinsatz', 'wareneinsatz_pct'],
  'Personal & Kosten': ['personal', 'personal_pct', 'energie', 'marketing', 'betriebsaufwand'],
  'Housekeeping': ['hk_rooms_per_attendant', 'hk_inspection_pass_rate', 'hk_complaint_rate', 'hk_avg_minutes_per_room'],
  'Küche': ['kitchen_food_cost_pct', 'kitchen_labour_pct', 'kitchen_prime_cost_pct', 'kitchen_complaint_rate', 'kitchen_order_accuracy', 'kitchen_food_waste_pct'],
  'Service': ['service_sales_per_cover', 'service_complaint_rate', 'service_error_rate', 'service_avg_rating', 'service_table_turnover'],
  'Spa': ['spa_room_utilization', 'spa_therapist_utilization', 'spa_revenue_per_guest', 'spa_no_show_rate', 'spa_complaint_rate', 'spa_avg_rating'],
  'Front Office': ['fo_avg_checkin_time', 'fo_complaint_rate', 'fo_upsell_conversion', 'fo_fcr_rate', 'fo_avg_rating'],
  'Technik': ['tech_ticket_backlog', 'tech_same_day_resolution', 'tech_preventive_maintenance', 'tech_emergency_rate', 'tech_energy_per_room'],
  'Verwaltung/HR': ['admin_sick_rate', 'admin_open_positions_rate', 'admin_turnover_rate', 'admin_it_availability', 'admin_payment_compliance'],
};

// Abteilungen für Daily Reports
export const dailyReportAbteilungen = ['Housekeeping', 'Kitchen', 'Service', 'Spa', 'FrontOffice', 'Technical', 'Admin'] as const;
export type DailyReportAbteilung = typeof dailyReportAbteilungen[number];

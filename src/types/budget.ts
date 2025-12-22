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

export interface KpiSchwellenwert {
  id?: string;
  abteilung: Bereich | 'Gesamt';
  kpiTyp: 'umsatz' | 'db1' | 'db2' | 'db1_marge' | 'db2_marge';
  schwellenwertMin?: number;
  schwellenwertMax?: number;
  alarmAktiv: boolean;
}

export type KpiTypLabel = {
  [K in KpiSchwellenwert['kpiTyp']]: string;
};

export const kpiTypLabels: KpiTypLabel = {
  umsatz: 'Umsatz',
  db1: 'DB I',
  db2: 'DB II',
  db1_marge: 'DB I Marge %',
  db2_marge: 'DB II Marge %',
};

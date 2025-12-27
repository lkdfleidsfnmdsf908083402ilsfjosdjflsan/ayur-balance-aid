import { Bereich, KostenarttTyp, KpiKategorie } from '@/types/finance';

// Mapping von Bereich zu Übersetzungsschlüssel
export const bereichToTranslationKey: Record<Bereich, string> = {
  'Logis': 'area.logis',
  'F&B': 'area.fb',
  'Rezeption': 'area.rezeption',
  'Spa': 'area.spa',
  'Ärztin': 'area.aerztin',
  'Shop': 'area.shop',
  'Verwaltung': 'area.verwaltung',
  'Technik': 'area.technik',
  'Energie': 'area.energie',
  'Marketing': 'area.marketing',
  'Personal': 'area.personal',
  'Finanzierung': 'area.finanzierung',
  'Sonstiges': 'area.sonstiges',
};

// Mapping von KPI-Kategorie zu Übersetzungsschlüssel
export const kpiKategorieToTranslationKey: Record<KpiKategorie, string> = {
  'Erlös': 'kpiCat.erlos',
  'Wareneinsatz': 'kpiCat.wareneinsatz',
  'Personal': 'kpiCat.personal',
  'Betriebsaufwand': 'kpiCat.betriebsaufwand',
  'Energie': 'kpiCat.energie',
  'Marketing': 'kpiCat.marketing',
  'Abschreibung': 'kpiCat.abschreibung',
  'Zins': 'kpiCat.zins',
  'Sonstiges': 'kpiCat.sonstiges',
};

// Mapping von Kostenart-Typ zu Übersetzungsschlüssel
export const kostenarttTypToTranslationKey: Record<KostenarttTyp, string> = {
  'Erlös': 'costType.erlos',
  'Einkauf': 'costType.einkauf',
  'Neutral': 'costType.neutral',
};

// Helper-Funktion um Bereich zu übersetzen
export function translateBereich(bereich: Bereich, t: (key: string) => string): string {
  return t(bereichToTranslationKey[bereich]) || bereich;
}

// Helper-Funktion um KPI-Kategorie zu übersetzen
export function translateKpiKategorie(kategorie: KpiKategorie, t: (key: string) => string): string {
  return t(kpiKategorieToTranslationKey[kategorie]) || kategorie;
}

// Helper-Funktion um Kostenart-Typ zu übersetzen
export function translateKostenarttTyp(typ: KostenarttTyp, t: (key: string) => string): string {
  return t(kostenarttTypToTranslationKey[typ]) || typ;
}

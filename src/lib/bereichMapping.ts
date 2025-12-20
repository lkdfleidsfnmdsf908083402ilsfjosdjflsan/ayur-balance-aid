import { Bereich, KostenarttTyp } from '@/types/finance';

/**
 * Bereich-Mapping basierend auf Kontonummern und Bezeichnungen
 * 
 * Mapping-Logik:
 * 1. Kontoklasse 4xxx = Erlöse
 * 2. Kontoklasse 5xxx-8xxx = Aufwand/Einkauf
 * 3. Bereich wird anhand von Kontonummernbereichen und Bezeichnungsmustern ermittelt
 */

interface MappingRule {
  pattern?: RegExp;
  range?: { from: string; to: string };
  bezeichnungPattern?: RegExp;
  bereich: Bereich;
}

// Bereich-Mapping-Regeln nach Priorität
const bereichRules: MappingRule[] = [
  // Food & Beverage - Wareneinsatz (55xx)
  { range: { from: '5500', to: '5549' }, bereich: 'Food & Beverage' },
  // F&B Erlöse
  { pattern: /^440(09|1[0-9]|2[0-1])$/, bereich: 'Food & Beverage' },
  { bezeichnungPattern: /FB|Küche|Getränke|Restaurant|Speisen|Buffet/i, bereich: 'Food & Beverage' },
  
  // Logis/Beherbergung
  { range: { from: '4400', to: '4408' }, bereich: 'Logis' },
  { bezeichnungPattern: /Logis|Übernachtung|Zimmer|Beherbergung|Unterkunft/i, bereich: 'Logis' },
  
  // Wellness/Spa
  { range: { from: '4420', to: '4429' }, bereich: 'Wellness/Spa' },
  { range: { from: '5560', to: '5569' }, bereich: 'Wellness/Spa' },
  { bezeichnungPattern: /Wellness|Spa|Massage|Sauna|Pool|Ayurveda|Behandlung/i, bereich: 'Wellness/Spa' },
  
  // Ärztin/Medizin
  { range: { from: '4430', to: '4439' }, bereich: 'Ärztin/Medizin' },
  { bezeichnungPattern: /Arzt|Ärztin|Medizin|Therapie|Konsultation/i, bereich: 'Ärztin/Medizin' },
  
  // Shop
  { range: { from: '4450', to: '4459' }, bereich: 'Shop' },
  { range: { from: '5570', to: '5579' }, bereich: 'Shop' },
  { bezeichnungPattern: /Shop|Verkauf|Waren|Boutique/i, bereich: 'Shop' },
  
  // Marketing/Vertrieb
  { range: { from: '6600', to: '6699' }, bereich: 'Marketing/Vertrieb' },
  { bezeichnungPattern: /Marketing|Werbung|Vertrieb|Provision|Kommission/i, bereich: 'Marketing/Vertrieb' },
  
  // Verwaltung
  { range: { from: '6000', to: '6599' }, bereich: 'Verwaltung' },
  { range: { from: '6700', to: '6999' }, bereich: 'Verwaltung' },
  { bezeichnungPattern: /Verwaltung|Büro|Beratung|Rechts|Steuer|Versicherung/i, bereich: 'Verwaltung' },
  
  // Technik/Instandhaltung
  { range: { from: '7100', to: '7199' }, bereich: 'Technik/Instandhaltung' },
  { bezeichnungPattern: /Reparatur|Instandhaltung|Wartung|Technik/i, bereich: 'Technik/Instandhaltung' },
  
  // Energie
  { range: { from: '7000', to: '7099' }, bereich: 'Energie' },
  { bezeichnungPattern: /Energie|Strom|Gas|Heizung|Wasser/i, bereich: 'Energie' },
  
  // Personal
  { range: { from: '6200', to: '6299' }, bereich: 'Personal' },
  { bezeichnungPattern: /Personal|Löhne|Gehälter|Sozial/i, bereich: 'Personal' },
];

export function mapBereich(kontonummer: string, bezeichnung: string): Bereich {
  // Prüfe Regeln nach Priorität
  for (const rule of bereichRules) {
    // Prüfe exaktes Muster
    if (rule.pattern && rule.pattern.test(kontonummer)) {
      return rule.bereich;
    }
    
    // Prüfe Nummernbereich
    if (rule.range) {
      const num = parseInt(kontonummer.replace(/\D/g, ''));
      const from = parseInt(rule.range.from);
      const to = parseInt(rule.range.to);
      if (num >= from && num <= to) {
        return rule.bereich;
      }
    }
    
    // Prüfe Bezeichnungsmuster
    if (rule.bezeichnungPattern && rule.bezeichnungPattern.test(bezeichnung)) {
      return rule.bereich;
    }
  }
  
  return 'Sonstiges';
}

export function mapKostenarttTyp(kontonummer: string): KostenarttTyp {
  const num = parseInt(kontonummer.replace(/\D/g, ''));
  
  // Kontoklasse 4 = Erlöse
  if (num >= 4000 && num < 5000) {
    return 'Erlös';
  }
  
  // Kontoklassen 5-8 = Aufwand/Einkauf
  if (num >= 5000 && num < 9000) {
    return 'Einkauf';
  }
  
  // Klassen 0-3 und 9 = Neutral (Bilanzkonten, etc.)
  return 'Neutral';
}

export const bereichColors: Record<Bereich, string> = {
  'Food & Beverage': 'hsl(38, 92%, 50%)',
  'Logis': 'hsl(217, 91%, 60%)',
  'Wellness/Spa': 'hsl(142, 71%, 45%)',
  'Ärztin/Medizin': 'hsl(280, 70%, 60%)',
  'Shop': 'hsl(340, 75%, 55%)',
  'Marketing/Vertrieb': 'hsl(200, 80%, 50%)',
  'Verwaltung': 'hsl(220, 30%, 55%)',
  'Technik/Instandhaltung': 'hsl(30, 60%, 50%)',
  'Energie': 'hsl(45, 90%, 55%)',
  'Personal': 'hsl(180, 60%, 45%)',
  'Sonstiges': 'hsl(0, 0%, 50%)',
};

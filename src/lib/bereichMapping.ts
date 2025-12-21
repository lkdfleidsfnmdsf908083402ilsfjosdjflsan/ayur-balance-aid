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

// Spezifische Kontonummern-Zuordnungen (höchste Priorität)
const specificAccountMappings: Record<string, Bereich> = {
  '4007': 'Food & Beverage',    // Erlöse F&B 5%
  '4008': 'Logis',              // Erlöse Logis 5%
  '4010': 'Logis',              // Erlöse Logis 10%
  '4009': 'Food & Beverage',    // Erlöse F&B 10%
  '4018': 'Food & Beverage',    // Erlöse Küche a la carte 10%
  '4019': 'Food & Beverage',    // Erlöse Getränke a la carte 20%
  '4020': 'Food & Beverage',    // Erlöse Küche a la carte 5%
  '4021': 'Food & Beverage',    // Erlöse Getränke a la carte 5%
  '4045': 'Shop',               // Erlöse Shopverkauf 20%
  '4049': 'Shop',               // Erlöse Shopverkauf 10%
  '4068': 'Energie',            // Erlöse § 19/1c Gas/Elektrizitätsleistungen
  '4079': 'Shop',               // Shopverkauf 10%
  '4080': 'Shop',               // Shopverkauf 20%
  '4081': 'Verwaltung',         // Erlöse Div. 10%
  '4083': 'Verwaltung',         // Erlöse Divers 10% + 20%
  '4400': 'Verwaltung',         // Skontoaufwand 20%
  '4800': 'Verwaltung',         // Sonstige betriebliche Erlöse 20%
  '4810': 'Verwaltung',         // Sonstige betriebliche Erträge 10%
  '4830': 'Verwaltung',         // Sonstige betriebliche Erlöse 0%
  '4831': 'Marketing/Vertrieb', // Provisionen 20%
  '4868': 'Verwaltung',         // Fixkostenzuschüsse Corona-Hilfsfonds steuerfrei
  '4910': 'Verwaltung',         // Eigenverbrauch 10%
  '4930': 'Verwaltung',         // Eigenverbrauch 0% (steuerfrei)
  '4944': 'Verwaltung',         // Nutzungsentnahme 0% (steuerfrei)
  '4996': 'Verwaltung',         // Auflösung Investitionsprämie COVID-19
  '5312': 'Shop',               // Shopeinkauf 10+20%
  '5314': 'Shop',               // Handelswaren 20% Kosmetik
  '4900': 'Verwaltung',         // Eigenverbrauch 20%
  '5800': 'Verwaltung',         // Skontoerträge 20%
  '5801': 'Verwaltung',         // Skontoerträge 10%
  '5804': 'Verwaltung',         // Skontoerträge 13%
  '5805': 'Verwaltung',         // Skontoerträge 0%
  '5808': 'Verwaltung',         // Skontoertrag 5%
  '5810': 'Verwaltung',         // Skontoertrag ig. Erwerb 0% (mit VSt)
  '5812': 'Verwaltung',         // Skontoertrag ig. Erwerb 20% (mit VSt)
  '5830': 'Verwaltung',         // Skontoertrag 20% bezogene Leistungen
  '5834': 'Verwaltung',         // Skontoertrag 20% Reverse Charge Leistungen
  '5850': 'Verwaltung',         // Umsatzboni 20% auf Materialaufwand
  '5851': 'Verwaltung',         // Umsatzbonus 10%
  '5852': 'Verwaltung',         // Umsatzbonus 20%
  '5853': 'Verwaltung',         // Umsatzboniertrag 0%
  '7323': 'Verwaltung',         // BMW X5 - Versicherung
  '7325': 'Verwaltung',         // BMW X5 Rep.-u.Service
  '7326': 'Verwaltung',         // BMW iX2 eDrive
  '7340': 'Verwaltung',         // BMW iX2 eDrive
  '7412': 'Verwaltung',         // Pachtaufwand 0%
  '7415': 'Verwaltung',         // Leasing BMW X5
  '7419': 'Verwaltung',         // Leasing BMW iX2
  '7803': 'Verwaltung',         // Forderungsverluste 10%
  '9555': 'Verwaltung',         // Investitionsprämie COVID-19
  '3136': 'Finanzierung',       // ÖHT TIST 8/2
  '3150': 'Finanzierung',       // ÖHT TIST 8
  '3290': 'Finanzierung',       // Erhaltene Wertgutscheine 0%
  '3295': 'Finanzierung',       // Erhaltene Sachgutscheine 10%
};

// Bereich-Mapping-Regeln nach Priorität (spezifischere Regeln zuerst)
const bereichRules: MappingRule[] = [
  // ═══════════════════════════════════════════════════════════════════
  // FOOD & BEVERAGE
  // ═══════════════════════════════════════════════════════════════════
  // F&B Wareneinsatz - Lebensmittel (550x-554x)
  { range: { from: '5500', to: '5549' }, bereich: 'Food & Beverage' },
  // F&B Getränke-Verbrauch (5541-5549)
  { range: { from: '5541', to: '5549' }, bereich: 'Food & Beverage' },
  // F&B Erlöse - explizite Konten
  { pattern: /^440(09|1[0-9]|2[0-9]|3[0-9])$/, bereich: 'Food & Beverage' },
  { pattern: /^441[0-9]{2}$/, bereich: 'Food & Beverage' }, // 441xx F&B Erlöse
  // F&B Bezeichnungsmuster (umfassend)
  { bezeichnungPattern: /\bFB\b|F\s*&\s*B|Food|Beverage|Küche|Getränke|Restaurant|Speisen|Buffet|Frühstück|Mittag|Abendessen|Menü|à la carte|a la carte|Catering|Bankett|Bar\b|Minibar|Kaffee|Tee|Wein|Bier|Spirituosen|Fleisch|Wurst|Brot|Gebäck|Gemüse|Obst|Milch|Molkerei|Speiseeis|Süßwaren|Konserven|Tiefkühl|Gewürz/i, bereich: 'Food & Beverage' },

  // ═══════════════════════════════════════════════════════════════════
  // LOGIS / BEHERBERGUNG
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4400', to: '4408' }, bereich: 'Logis' },
  { range: { from: '4440', to: '4449' }, bereich: 'Logis' }, // Erweiterte Logis-Erlöse
  { bezeichnungPattern: /Logis|Übernachtung|Zimmer|Beherbergung|Unterkunft|Aufenthalt|Nächtig|Accommodation|Room|Belegung|Buchung|Reservierung|Storno|No-?Show|Housekeeping|Wäsche|Reinigung Zimmer/i, bereich: 'Logis' },

  // ═══════════════════════════════════════════════════════════════════
  // WELLNESS / SPA / AYURVEDA
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4420', to: '4429' }, bereich: 'Wellness/Spa' },
  { range: { from: '4460', to: '4469' }, bereich: 'Wellness/Spa' }, // Erweiterte Wellness-Erlöse
  { range: { from: '5560', to: '5569' }, bereich: 'Wellness/Spa' },
  { range: { from: '5580', to: '5589' }, bereich: 'Wellness/Spa' }, // Wellness-Material
  { bezeichnungPattern: /Wellness|Spa\b|Massage|Sauna|Pool|Schwimmbad|Ayurveda|Behandlung|Kosmetik|Beauty|Fitness|Yoga|Meditation|Relax|Thermal|Dampfbad|Whirlpool|Jacuzzi|Kur|Packung|Peeling|Aromatherapie|Öl|Creme|Lotion/i, bereich: 'Wellness/Spa' },

  // ═══════════════════════════════════════════════════════════════════
  // ÄRZTIN / MEDIZIN
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4430', to: '4439' }, bereich: 'Ärztin/Medizin' },
  { range: { from: '4470', to: '4479' }, bereich: 'Ärztin/Medizin' }, // Medizin-Erlöse
  { range: { from: '5590', to: '5599' }, bereich: 'Ärztin/Medizin' }, // Medizin-Material
  { bezeichnungPattern: /Arzt|Ärztin|Medizin|Therapie|Konsultation|Diagnos|Labor|Blut|Untersuchung|Rezept|Pharma|Medikament|Heilmittel|Physiotherapie|Osteopathie|Akupunktur|TCM|Naturheil|Homöopathie|Gesundheit/i, bereich: 'Ärztin/Medizin' },

  // ═══════════════════════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4450', to: '4459' }, bereich: 'Shop' },
  { range: { from: '4480', to: '4489' }, bereich: 'Shop' }, // Erweiterte Shop-Erlöse
  { range: { from: '5570', to: '5579' }, bereich: 'Shop' },
  { bezeichnungPattern: /\bShop\b|Verkauf|Waren\b|Boutique|Souvenir|Geschenk|Artikel|Handels|Einzelhandel|Produkt|Merchandise/i, bereich: 'Shop' },

  // ═══════════════════════════════════════════════════════════════════
  // PERSONAL (vor Verwaltung, da spezifischer)
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6200', to: '6299' }, bereich: 'Personal' },
  { range: { from: '6300', to: '6399' }, bereich: 'Personal' }, // Erweiterte Personalkosten
  { bezeichnungPattern: /Personal|Löhne|Gehälter|Gehalt|Lohn\b|Sozial|Arbeitgeber|Arbeitnehmer|Kranken|Renten|Arbeitslosen|Pflege|Berufsgenossen|Urlaub|Weihnacht|Prämie|Bonus|Abfindung|Fortbildung|Schulung|Recruiting|Mitarbeiter|Angestellt|Aushilf|Minijob|Praktikant|Azubi|Ausbildung/i, bereich: 'Personal' },

  // ═══════════════════════════════════════════════════════════════════
  // MARKETING / VERTRIEB
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6600', to: '6699' }, bereich: 'Marketing/Vertrieb' },
  { range: { from: '6800', to: '6849' }, bereich: 'Marketing/Vertrieb' }, // Marketing-Kosten
  { bezeichnungPattern: /Marketing|Werbung|Vertrieb|Provision|Kommission|Agentur|Anzeige|Online|Google|Facebook|Instagram|Social Media|SEO|SEM|Newsletter|Mailing|Prospekt|Katalog|Messe|Event|PR\b|Öffentlichkeit|Presse|Influencer|Affiliate|Booking|Expedia|HRS|OTA|Channel|Buchungsportal/i, bereich: 'Marketing/Vertrieb' },

  // ═══════════════════════════════════════════════════════════════════
  // ENERGIE
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '7000', to: '7099' }, bereich: 'Energie' },
  { bezeichnungPattern: /Energie|Strom|Gas\b|Heizung|Wasser|Abwasser|Elektr|Fernwärme|Öl\b|Heizöl|Pellet|Brennstoff|Verbrauch|Zähler|Netz|Grundgebühr|kWh|Kubikmeter/i, bereich: 'Energie' },

  // ═══════════════════════════════════════════════════════════════════
  // TECHNIK / INSTANDHALTUNG
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '7100', to: '7199' }, bereich: 'Technik/Instandhaltung' },
  { range: { from: '7200', to: '7299' }, bereich: 'Technik/Instandhaltung' }, // Erweiterte Technik
  { bezeichnungPattern: /Reparatur|Instandhaltung|Wartung|Technik|Handwerk|Elektrik|Sanitär|Klima|Lüftung|Aufzug|Lift|Gebäude|Facility|Hausmeister|Garten|Außenanlage|Winterdienst|Reinigung|Entsorgung|Müll|Abfall|Schädling|Desinfektion/i, bereich: 'Technik/Instandhaltung' },

  // ═══════════════════════════════════════════════════════════════════
  // VERWALTUNG (als Auffangbereich für 6xxx)
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6000', to: '6199' }, bereich: 'Verwaltung' },
  { range: { from: '6400', to: '6599' }, bereich: 'Verwaltung' },
  { range: { from: '6700', to: '6799' }, bereich: 'Verwaltung' },
  { range: { from: '6850', to: '6999' }, bereich: 'Verwaltung' },
  { bezeichnungPattern: /Verwaltung|Büro|Beratung|Rechts|Steuer|Versicherung|Bank|Gebühr|Porto|Telefon|Internet|IT\b|Software|Lizenz|Miete|Pacht|Leasing|Abschreibung|AfA|Zinsen|Kredit|Darlehen|Buchhaltung|Jahresabschluss|Prüfung|Notar|Gericht|Beitrag|Verband|Kammer|Spende|Trinkgeld|Kasse|Differenz|Skonti|Rabatt|Nachlass/i, bereich: 'Verwaltung' },

  // ═══════════════════════════════════════════════════════════════════
  // SONSTIGE ERLÖSKONTEN (44xx die noch nicht zugeordnet sind)
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4490', to: '4499' }, bereich: 'Sonstiges' }, // Sonstige Erlöse explizit
  
  // ═══════════════════════════════════════════════════════════════════
  // NEUTRALE / BILANZKONTEN (0xxx-3xxx, 8xxx-9xxx)
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '0000', to: '3999' }, bereich: 'Sonstiges' },
  { range: { from: '8000', to: '9999' }, bereich: 'Sonstiges' },
];

export function mapBereich(kontonummer: string, bezeichnung: string): Bereich {
  // Prüfe zuerst spezifische Kontonummern (höchste Priorität)
  if (specificAccountMappings[kontonummer]) {
    return specificAccountMappings[kontonummer];
  }
  
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

export function mapKostenarttTyp(kontonummer: string, bereich: Bereich): KostenarttTyp {
  const num = parseInt(kontonummer.replace(/\D/g, ''));
  
  // Kontoklasse 4 = Erlöskonten (immer Erlös, auch bei Bereich 'Sonstiges')
  if (num >= 4000 && num < 5000) {
    return 'Erlös';
  }
  
  // Kontoklasse 5 = Aufwandskonten/Einkauf
  if (num >= 5000 && num < 6000) {
    return 'Einkauf';
  }
  
  // Kontoklassen 6-8 = Aufwand/Einkauf
  if (num >= 6000 && num < 9000) {
    return 'Einkauf';
  }
  
  // Klassen 0-3 und 9 = Neutral (Bilanzkonten, etc.)
  return 'Neutral';
}

// Kontoklassen-Mapping: Erste Ziffer = Kontoklasse
export function mapKontoklasse(kontonummer: string): string {
  if (!kontonummer || kontonummer.length === 0) return 'Sonstiges';
  
  const firstDigit = kontonummer.charAt(0);
  
  const kontoklassenMap: Record<string, string> = {
    '0': 'Kontoklasse 0',
    '1': 'Kontoklasse 1',
    '2': 'Kontoklasse 2',
    '3': 'Kontoklasse 3',
    '4': 'Kontoklasse 4',
    '5': 'Kontoklasse 5',
    '6': 'Kontoklasse 6',
    '7': 'Kontoklasse 7',
    '8': 'Kontoklasse 8',
    '9': 'Kontoklasse 9',
  };
  
  return kontoklassenMap[firstDigit] || 'Sonstiges';
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
  'Finanzierung': 'hsl(260, 60%, 55%)',
  'Sonstiges': 'hsl(0, 0%, 50%)',
};

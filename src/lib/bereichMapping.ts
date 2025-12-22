import { Bereich, KostenarttTyp, KpiKategorie } from '@/types/finance';

/**
 * Bereich-Mapping basierend auf Kontonummern und Bezeichnungen
 * Erweitert um KPI-Kategorien für detaillierte Abteilungs-Auswertung
 * 
 * Abteilungen:
 * - Operative: Logis, F&B, Spa, Ärztin, Shop
 * - Service/Querschnitt: Verwaltung, Technik, Energie, Marketing, Personal
 * 
 * KPI-Kategorien:
 * - Erlös, Wareneinsatz, Personal, Betriebsaufwand, Energie, Marketing, Abschreibung, Zins
 */

interface MappingRule {
  pattern?: RegExp;
  range?: { from: string; to: string };
  bezeichnungPattern?: RegExp;
  bereich: Bereich;
}

// Spezifische Kontonummern-Zuordnungen (höchste Priorität)
const specificAccountMappings: Record<string, Bereich> = {
  // F&B Erlöse
  '4007': 'F&B',
  '4009': 'F&B',
  '4018': 'F&B',
  '4019': 'F&B',
  '4020': 'F&B',
  '4021': 'F&B',
  
  // Logis Erlöse
  '4008': 'Logis',
  '4010': 'Logis',
  
  // Shop Erlöse
  '4045': 'Shop',
  '4049': 'Shop',
  '4079': 'Shop',
  '4080': 'Shop',
  '4081': 'Shop',
  '5312': 'Shop',
  '5314': 'Shop',
  
  // Energie
  '4068': 'Energie',
  
  // Ärztin/Medizin
  '4082': 'Ärztin',
  
  // Verwaltung
  '4083': 'Verwaltung',
  '4400': 'Verwaltung',
  '4800': 'Verwaltung',
  '4810': 'Verwaltung',
  '4830': 'Verwaltung',
  '4868': 'Verwaltung',
  '4910': 'Verwaltung',
  '4930': 'Verwaltung',
  '4944': 'Verwaltung',
  '4996': 'Verwaltung',
  '4900': 'Verwaltung',
  '5800': 'Verwaltung',
  '5801': 'Verwaltung',
  '5804': 'Verwaltung',
  '5805': 'Verwaltung',
  '5808': 'Verwaltung',
  '5810': 'Verwaltung',
  '5812': 'Verwaltung',
  '5830': 'Verwaltung',
  '5834': 'Verwaltung',
  '5850': 'Verwaltung',
  '5851': 'Verwaltung',
  '5852': 'Verwaltung',
  '5853': 'Verwaltung',
  '7323': 'Verwaltung',
  '7325': 'Verwaltung',
  '7326': 'Verwaltung',
  '7340': 'Verwaltung',
  '7412': 'Verwaltung',
  '7415': 'Verwaltung',
  '7419': 'Verwaltung',
  '7803': 'Verwaltung',
  '9555': 'Verwaltung',
  
  // Marketing
  '4831': 'Marketing',
  
  // Finanzierung
  '3136': 'Finanzierung',
  '3150': 'Finanzierung',
  '3290': 'Finanzierung',
  '3295': 'Finanzierung',
};

// Bereich-Mapping-Regeln nach Priorität
const bereichRules: MappingRule[] = [
  // ═══════════════════════════════════════════════════════════════════
  // FOOD & BEVERAGE
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '5500', to: '5549' }, bereich: 'F&B' },
  { range: { from: '5541', to: '5549' }, bereich: 'F&B' },
  { pattern: /^440(09|1[0-9]|2[0-9]|3[0-9])$/, bereich: 'F&B' },
  { pattern: /^441[0-9]{2}$/, bereich: 'F&B' },
  { bezeichnungPattern: /\bFB\b|F\s*&\s*B|Food|Beverage|Küche|Getränke|Restaurant|Speisen|Buffet|Frühstück|Mittag|Abendessen|Menü|à la carte|a la carte|Catering|Bankett|Bar\b|Minibar|Kaffee|Tee|Wein|Bier|Spirituosen|Fleisch|Wurst|Brot|Gebäck|Gemüse|Obst|Milch|Molkerei|Speiseeis|Süßwaren|Konserven|Tiefkühl|Gewürz/i, bereich: 'F&B' },

  // ═══════════════════════════════════════════════════════════════════
  // LOGIS / BEHERBERGUNG
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4400', to: '4408' }, bereich: 'Logis' },
  { range: { from: '4440', to: '4449' }, bereich: 'Logis' },
  { bezeichnungPattern: /Logis|Übernachtung|Zimmer|Beherbergung|Unterkunft|Aufenthalt|Nächtig|Accommodation|Room|Belegung|Buchung|Reservierung|Storno|No-?Show|Housekeeping|Wäsche|Reinigung Zimmer/i, bereich: 'Logis' },

  // ═══════════════════════════════════════════════════════════════════
  // SPA / WELLNESS / AYURVEDA
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4420', to: '4429' }, bereich: 'Spa' },
  { range: { from: '4460', to: '4469' }, bereich: 'Spa' },
  { range: { from: '5560', to: '5569' }, bereich: 'Spa' },
  { range: { from: '5580', to: '5589' }, bereich: 'Spa' },
  { bezeichnungPattern: /Wellness|Spa\b|Massage|Sauna|Pool|Schwimmbad|Ayurveda|Behandlung|Kosmetik|Beauty|Fitness|Yoga|Meditation|Relax|Thermal|Dampfbad|Whirlpool|Jacuzzi|Kur|Packung|Peeling|Aromatherapie|Öl|Creme|Lotion/i, bereich: 'Spa' },

  // ═══════════════════════════════════════════════════════════════════
  // ÄRZTIN / MEDIZIN
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4430', to: '4439' }, bereich: 'Ärztin' },
  { range: { from: '4470', to: '4479' }, bereich: 'Ärztin' },
  { range: { from: '5590', to: '5599' }, bereich: 'Ärztin' },
  { bezeichnungPattern: /Arzt|Ärztin|Medizin|Therapie|Konsultation|Diagnos|Labor|Blut|Untersuchung|Rezept|Pharma|Medikament|Heilmittel|Physiotherapie|Osteopathie|Akupunktur|TCM|Naturheil|Homöopathie|Gesundheit/i, bereich: 'Ärztin' },

  // ═══════════════════════════════════════════════════════════════════
  // SHOP
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '4450', to: '4459' }, bereich: 'Shop' },
  { range: { from: '4480', to: '4489' }, bereich: 'Shop' },
  { range: { from: '5570', to: '5579' }, bereich: 'Shop' },
  { bezeichnungPattern: /\bShop\b|Verkauf|Waren\b|Boutique|Souvenir|Geschenk|Artikel|Handels|Einzelhandel|Produkt|Merchandise/i, bereich: 'Shop' },

  // ═══════════════════════════════════════════════════════════════════
  // PERSONAL / HR
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6200', to: '6299' }, bereich: 'Personal' },
  { range: { from: '6300', to: '6399' }, bereich: 'Personal' },
  { bezeichnungPattern: /Personal|Löhne|Gehälter|Gehalt|Lohn\b|Sozial|Arbeitgeber|Arbeitnehmer|Kranken|Renten|Arbeitslosen|Pflege|Berufsgenossen|Urlaub|Weihnacht|Prämie|Bonus|Abfindung|Fortbildung|Schulung|Recruiting|Mitarbeiter|Angestellt|Aushilf|Minijob|Praktikant|Azubi|Ausbildung/i, bereich: 'Personal' },

  // ═══════════════════════════════════════════════════════════════════
  // MARKETING / VERTRIEB
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6600', to: '6699' }, bereich: 'Marketing' },
  { range: { from: '6800', to: '6849' }, bereich: 'Marketing' },
  { bezeichnungPattern: /Marketing|Werbung|Vertrieb|Provision|Kommission|Agentur|Anzeige|Online|Google|Facebook|Instagram|Social Media|SEO|SEM|Newsletter|Mailing|Prospekt|Katalog|Messe|Event|PR\b|Öffentlichkeit|Presse|Influencer|Affiliate|Booking|Expedia|HRS|OTA|Channel|Buchungsportal/i, bereich: 'Marketing' },

  // ═══════════════════════════════════════════════════════════════════
  // ENERGIE
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '7000', to: '7099' }, bereich: 'Energie' },
  { bezeichnungPattern: /Energie|Strom|Gas\b|Heizung|Wasser|Abwasser|Elektr|Fernwärme|Öl\b|Heizöl|Pellet|Brennstoff|Verbrauch|Zähler|Netz|Grundgebühr|kWh|Kubikmeter|Thermalwasser|Kanal/i, bereich: 'Energie' },

  // ═══════════════════════════════════════════════════════════════════
  // TECHNIK / INSTANDHALTUNG
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '7100', to: '7199' }, bereich: 'Technik' },
  { range: { from: '7200', to: '7299' }, bereich: 'Technik' },
  { bezeichnungPattern: /Reparatur|Instandhaltung|Wartung|Technik|Handwerk|Elektrik|Sanitär|Klima|Lüftung|Aufzug|Lift|Gebäude|Facility|Hausmeister|Garten|Außenanlage|Winterdienst|Reinigung|Entsorgung|Müll|Abfall|Schädling|Desinfektion/i, bereich: 'Technik' },

  // ═══════════════════════════════════════════════════════════════════
  // VERWALTUNG (Auffangbereich für 6xxx)
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '6000', to: '6199' }, bereich: 'Verwaltung' },
  { range: { from: '6400', to: '6599' }, bereich: 'Verwaltung' },
  { range: { from: '6700', to: '6799' }, bereich: 'Verwaltung' },
  { range: { from: '6850', to: '6999' }, bereich: 'Verwaltung' },
  { bezeichnungPattern: /Verwaltung|Büro|Beratung|Rechts|Steuer|Versicherung|Bank|Gebühr|Porto|Telefon|Internet|IT\b|Software|Lizenz|Miete|Pacht|Leasing|Buchhaltung|Jahresabschluss|Prüfung|Notar|Gericht|Beitrag|Verband|Kammer|Spende|Trinkgeld|Kasse|Differenz|Skonti|Rabatt|Nachlass/i, bereich: 'Verwaltung' },

  // ═══════════════════════════════════════════════════════════════════
  // NEUTRALE / BILANZKONTEN
  // ═══════════════════════════════════════════════════════════════════
  { range: { from: '0000', to: '3999' }, bereich: 'Sonstiges' },
  { range: { from: '8000', to: '9999' }, bereich: 'Sonstiges' },
];

/**
 * Mappt Kontonummer und Bezeichnung auf Bereich/Abteilung
 */
export function mapBereich(kontonummer: string, bezeichnung: string): Bereich {
  // Prüfe zuerst spezifische Kontonummern (höchste Priorität)
  if (specificAccountMappings[kontonummer]) {
    return specificAccountMappings[kontonummer];
  }
  
  // Prüfe Regeln nach Priorität
  for (const rule of bereichRules) {
    if (rule.pattern && rule.pattern.test(kontonummer)) {
      return rule.bereich;
    }
    
    if (rule.range) {
      const num = parseInt(kontonummer.replace(/\D/g, ''));
      const from = parseInt(rule.range.from);
      const to = parseInt(rule.range.to);
      if (num >= from && num <= to) {
        return rule.bereich;
      }
    }
    
    if (rule.bezeichnungPattern && rule.bezeichnungPattern.test(bezeichnung)) {
      return rule.bereich;
    }
  }
  
  return 'Sonstiges';
}

/**
 * Mappt Kontonummer auf Kostenart-Typ (Erlös/Einkauf/Neutral)
 */
export function mapKostenarttTyp(kontonummer: string, bereich: Bereich): KostenarttTyp {
  const num = parseInt(kontonummer.replace(/\D/g, ''));
  
  if (num >= 4000 && num < 5000) {
    return 'Erlös';
  }
  
  if (num >= 5000 && num < 9000) {
    return 'Einkauf';
  }
  
  return 'Neutral';
}

/**
 * Mappt Kontonummer und Bezeichnung auf KPI-Kategorie
 * Kategorien: Erlös, Wareneinsatz, Personal, Betriebsaufwand, Energie, Marketing, Abschreibung, Zins
 */
export function mapKpiKategorie(kontonummer: string, bezeichnung: string): KpiKategorie {
  const num = parseInt(kontonummer.replace(/\D/g, ''));
  const lowerBezeichnung = bezeichnung.toLowerCase();
  
  // Kontoklasse 4 = Erlöse
  if (num >= 4000 && num < 5000) {
    return 'Erlös';
  }
  
  // Kontoklasse 5 = Wareneinsatz
  if (num >= 5000 && num < 6000) {
    return 'Wareneinsatz';
  }
  
  // Personalaufwand (62xx, 63xx)
  if (num >= 6200 && num < 6400) {
    return 'Personal';
  }
  
  // Abschreibungen (7xxx mit Bezeichnungsmuster)
  if (/abschreibung|afa|wertminderung|wertberichtigung/i.test(lowerBezeichnung)) {
    return 'Abschreibung';
  }
  if (num >= 7800 && num < 7900) {
    return 'Abschreibung';
  }
  
  // Zinsen (8xxx oder Bezeichnungsmuster)
  if (/zins|zinsen|kredit|darlehen|finanzierung/i.test(lowerBezeichnung)) {
    return 'Zins';
  }
  if (num >= 8000 && num < 8500) {
    return 'Zins';
  }
  
  // Energie (70xx)
  if (num >= 7000 && num < 7100) {
    return 'Energie';
  }
  if (/energie|strom|gas|heizung|wasser|fernwärme|thermalwasser/i.test(lowerBezeichnung)) {
    return 'Energie';
  }
  
  // Marketing (66xx, 68xx oder Bezeichnungsmuster)
  if (num >= 6600 && num < 6700) {
    return 'Marketing';
  }
  if (num >= 6800 && num < 6850) {
    return 'Marketing';
  }
  if (/marketing|werbung|provision|portal|booking|google|ads|social|pr\b|messe|event/i.test(lowerBezeichnung)) {
    return 'Marketing';
  }
  
  // Rest = Betriebsaufwand
  if (num >= 6000 && num < 8000) {
    return 'Betriebsaufwand';
  }
  
  return 'Sonstiges';
}

/**
 * Mappt erste Ziffer auf Kontoklasse
 */
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

// Farben für Bereiche (optimiert für Dashboard)
export const bereichColors: Record<Bereich, string> = {
  'Logis': 'hsl(217, 91%, 60%)',
  'F&B': 'hsl(38, 92%, 50%)',
  'Spa': 'hsl(142, 71%, 45%)',
  'Ärztin': 'hsl(280, 70%, 60%)',
  'Shop': 'hsl(340, 75%, 55%)',
  'Verwaltung': 'hsl(220, 30%, 55%)',
  'Technik': 'hsl(30, 60%, 50%)',
  'Energie': 'hsl(45, 90%, 55%)',
  'Marketing': 'hsl(200, 80%, 50%)',
  'Personal': 'hsl(180, 60%, 45%)',
  'Finanzierung': 'hsl(260, 60%, 55%)',
  'Sonstiges': 'hsl(0, 0%, 50%)',
};

// Farben für KPI-Kategorien
export const kpiKategorieColors: Record<KpiKategorie, string> = {
  'Erlös': 'hsl(142, 76%, 36%)',
  'Wareneinsatz': 'hsl(38, 92%, 50%)',
  'Personal': 'hsl(200, 80%, 50%)',
  'Betriebsaufwand': 'hsl(220, 30%, 55%)',
  'Energie': 'hsl(45, 90%, 55%)',
  'Marketing': 'hsl(280, 70%, 60%)',
  'Abschreibung': 'hsl(0, 0%, 45%)',
  'Zins': 'hsl(0, 70%, 50%)',
  'Sonstiges': 'hsl(0, 0%, 60%)',
};

// Liste aller operativen Abteilungen (für KPI-Berechnung)
export const operativeAbteilungen: Bereich[] = ['Logis', 'F&B', 'Spa', 'Ärztin', 'Shop'];

// Liste aller Service-Abteilungen
export const serviceAbteilungen: Bereich[] = ['Verwaltung', 'Technik', 'Energie', 'Marketing', 'Personal'];

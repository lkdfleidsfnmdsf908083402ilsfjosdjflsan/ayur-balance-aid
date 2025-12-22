export interface Konto {
  kontonummer: string;
  kontobezeichnung: string;
  kontoklasse: string;
  bereich: Bereich;
  kostenarttTyp: KostenarttTyp;
  kpiKategorie: KpiKategorie;
}

// Abteilungen/Bereiche gemäß Hotel-Struktur
export type Bereich = 
  | 'Logis'
  | 'F&B'
  | 'Spa'
  | 'Ärztin'
  | 'Shop'
  | 'Verwaltung'
  | 'Technik'
  | 'Energie'
  | 'Marketing'
  | 'Personal'
  | 'Finanzierung'
  | 'Sonstiges';

// Kostenart-Typ für grundlegende Klassifizierung
export type KostenarttTyp = 'Erlös' | 'Einkauf' | 'Neutral';

// KPI-Kategorien für detaillierte Auswertung
export type KpiKategorie = 
  | 'Erlös'
  | 'Wareneinsatz'
  | 'Personal'
  | 'Betriebsaufwand'
  | 'Energie'
  | 'Marketing'
  | 'Abschreibung'
  | 'Zins'
  | 'Sonstiges';

export interface SaldoMonat {
  kontonummer: string;
  jahr: number;
  monat: number;
  saldoSollMonat: number;
  saldoHabenMonat: number;
  saldoMonat: number;
}

export interface SaldoVergleich {
  kontonummer: string;
  kontobezeichnung: string;
  bereich: Bereich;
  kostenarttTyp: KostenarttTyp;
  kpiKategorie: KpiKategorie;
  jahr: number;
  monat: number;
  saldoAktuell: number;
  saldoVormonat: number | null;
  saldoVorjahr: number | null;
  saldoVormonatDiff: number | null;
  saldoVormonatDiffProzent: number | null;
  saldoVorjahrDiff: number | null;
  saldoVorjahrDiffProzent: number | null;
}

export interface BereichAggregation {
  bereich: Bereich;
  kostenarttTyp: KostenarttTyp;
  saldoAktuell: number;
  saldoVormonat: number | null;
  saldoVorjahr: number | null;
  saldoVormonatDiff: number | null;
  saldoVormonatDiffProzent: number | null;
  saldoVorjahrDiff: number | null;
  saldoVorjahrDiffProzent: number | null;
}

// Neue Struktur für Abteilungs-KPIs
export interface AbteilungKpi {
  abteilung: Bereich;
  jahr: number;
  monat: number;
  
  // Operative KPIs
  umsatz: number;
  wareneinsatz: number;
  personal: number;
  
  // Deckungsbeiträge
  db1: number;  // Deckungsbeitrag I = Umsatz - Wareneinsatz
  db2: number;  // Deckungsbeitrag II = DB I - Personal
  
  // Kostenarten
  energie: number;
  marketing: number;
  betriebsaufwand: number;
  abschreibung: number;
  zins: number;
  
  // Vorjahresvergleich
  umsatzVorjahr: number | null;
  umsatzDiff: number | null;
  umsatzDiffProzent: number | null;
  db1Vorjahr: number | null;
  db1Diff: number | null;
  db1DiffProzent: number | null;
  db2Vorjahr: number | null;
  db2Diff: number | null;
  db2DiffProzent: number | null;
}

export interface RawSaldenliste {
  Kontoklasse: string;
  KontoNr: string;
  Kontobezeichnung: string;
  [key: string]: string | number;
}

export interface UploadedFile {
  name: string;
  year: number;
  month: number;
  data: RawSaldenliste[];
  uploadedAt: Date;
}

export interface Konto {
  kontonummer: string;
  kontobezeichnung: string;
  kontoklasse: string;
  bereich: Bereich;
  kostenarttTyp: KostenarttTyp;
}

export type Bereich = 
  | 'Food & Beverage'
  | 'Logis'
  | 'Wellness/Spa'
  | 'Ärztin/Medizin'
  | 'Shop'
  | 'Marketing/Vertrieb'
  | 'Verwaltung'
  | 'Technik/Instandhaltung'
  | 'Energie'
  | 'Personal'
  | 'Sonstiges';

export type KostenarttTyp = 'Erlös' | 'Einkauf' | 'Neutral';

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

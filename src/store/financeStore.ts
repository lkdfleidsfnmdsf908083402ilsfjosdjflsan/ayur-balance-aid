import { create } from 'zustand';
import { Konto, SaldoMonat, UploadedFile, SaldoVergleich, BereichAggregation } from '@/types/finance';
import { parseCSV, extractKonten, extractSalden, parseFileName } from '@/lib/csvParser';
import { calculateVergleich, aggregateByBereich } from '@/lib/calculations';
import { supabase } from '@/integrations/supabase/client';

interface FinanceState {
  uploadedFiles: UploadedFile[];
  konten: Konto[];
  salden: SaldoMonat[];
  selectedYear: number;
  selectedMonth: number;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Computed data
  vergleiche: SaldoVergleich[];
  bereichAggregationen: BereichAggregation[];
  
  // Actions
  initialize: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  removeFile: (fileName: string) => void;
  setSelectedPeriod: (year: number, month: number) => void;
  recalculate: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  uploadedFiles: [],
  konten: [],
  salden: [],
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth() + 1,
  isLoading: false,
  isInitialized: false,
  vergleiche: [],
  bereichAggregationen: [],
  
  initialize: async () => {
    // Immer neu laden, um aktuelle Daten zu bekommen
    set({ isLoading: true });
    
    try {
      // Lade Konten aus DB
      const { data: kontenData, error: kontenError } = await supabase
        .from('konten')
        .select('*')
        .limit(5000);
      
      if (kontenError) throw kontenError;
      
      // Lade Salden aus DB (über 1000 Einträge, daher paginiert laden)
      type SaldenRow = { id: string; kontonummer: string; jahr: number; monat: number; saldo_soll_monat: string | number; saldo_haben_monat: string | number; saldo_monat: string | number; created_at: string };
      let allSalden: SaldenRow[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: saldenPage, error: saldenError } = await supabase
          .from('salden_monat')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (saldenError) throw saldenError;
        if (!saldenPage || saldenPage.length === 0) break;
        
        allSalden = [...allSalden, ...saldenPage];
        if (saldenPage.length < pageSize) break;
        page++;
      }
      
      const saldenData = allSalden;
      
      // Lade Import-Dateien aus DB
      const { data: filesData, error: filesError } = await supabase
        .from('import_files')
        .select('*')
        .order('jahr', { ascending: false })
        .order('monat', { ascending: false });
      
      if (filesError) throw filesError;
      
      // Transformiere DB-Daten in App-Format
      const konten: Konto[] = (kontenData || []).map(k => ({
        kontonummer: k.kontonummer,
        kontobezeichnung: k.kontobezeichnung,
        kontoklasse: k.kontoklasse,
        bereich: k.bereich as Konto['bereich'],
        kostenarttTyp: k.kostenartt_typ as Konto['kostenarttTyp'],
      }));
      
      const salden: SaldoMonat[] = (saldenData || []).map(s => ({
        kontonummer: s.kontonummer,
        jahr: s.jahr,
        monat: s.monat,
        saldoSollMonat: Number(s.saldo_soll_monat),
        saldoHabenMonat: Number(s.saldo_haben_monat),
        saldoMonat: Number(s.saldo_monat),
      }));
      
      const uploadedFiles: UploadedFile[] = (filesData || []).map(f => ({
        name: f.filename,
        year: f.jahr,
        month: f.monat,
        data: [],
        uploadedAt: new Date(f.imported_at),
      }));
      
      // Bestimme aktuellste Periode
      let selectedYear = new Date().getFullYear();
      let selectedMonth = new Date().getMonth() + 1;
      
      if (uploadedFiles.length > 0) {
        selectedYear = uploadedFiles[0].year;
        selectedMonth = uploadedFiles[0].month;
      }
      
      set({
        konten,
        salden,
        uploadedFiles,
        selectedYear,
        selectedMonth,
        isLoading: false,
        isInitialized: true,
      });
      
      console.log('Store initialized:', { 
        kontenCount: konten.length, 
        saldenCount: salden.length,
        erlösKonten: konten.filter(k => k.kostenarttTyp === 'Erlös').length,
        selectedPeriod: `${selectedMonth}/${selectedYear}`
      });
      
      get().recalculate();
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },
  
  uploadFile: async (file: File) => {
    set({ isLoading: true });
    
    try {
      const text = await file.text();
      const parsed = parseFileName(file.name);
      
      if (!parsed) {
        throw new Error('Dateiname entspricht nicht dem erwarteten Format: Saldenliste-MM-YYYY.csv');
      }
      
      const rawData = parseCSV(text);
      const newKonten = extractKonten(rawData);
      const newSalden = extractSalden(rawData, parsed.year, parsed.month);
      
      // Speichere Konten in DB (upsert)
      for (const konto of newKonten) {
        const { error } = await supabase
          .from('konten')
          .upsert({
            kontonummer: konto.kontonummer,
            kontobezeichnung: konto.kontobezeichnung,
            kontoklasse: konto.kontoklasse,
            bereich: konto.bereich,
            kostenartt_typ: konto.kostenarttTyp,
          }, { onConflict: 'kontonummer' });
        
        if (error) console.error('Fehler beim Speichern Konto:', error);
      }
      
      // Speichere Salden in DB (upsert)
      for (const saldo of newSalden) {
        const { error } = await supabase
          .from('salden_monat')
          .upsert({
            kontonummer: saldo.kontonummer,
            jahr: saldo.jahr,
            monat: saldo.monat,
            saldo_soll_monat: saldo.saldoSollMonat,
            saldo_haben_monat: saldo.saldoHabenMonat,
            saldo_monat: saldo.saldoMonat,
          }, { onConflict: 'kontonummer,jahr,monat' });
        
        if (error) console.error('Fehler beim Speichern Saldo:', error);
      }
      
      // Speichere Import-Datei in DB
      const { error: fileError } = await supabase
        .from('import_files')
        .upsert({
          filename: file.name,
          jahr: parsed.year,
          monat: parsed.month,
          anzahl_konten: newKonten.length,
        }, { onConflict: 'jahr,monat' });
      
      if (fileError) console.error('Fehler beim Speichern Import-File:', fileError);
      
      const uploadedFile: UploadedFile = {
        name: file.name,
        year: parsed.year,
        month: parsed.month,
        data: rawData,
        uploadedAt: new Date(),
      };
      
      set(state => {
        // Merge Konten (neue überschreiben alte)
        const kontenMap = new Map(state.konten.map(k => [k.kontonummer, k]));
        for (const k of newKonten) {
          kontenMap.set(k.kontonummer, k);
        }
        
        // Merge Salden (ersetze für gleiches Jahr/Monat/Konto)
        const saldenMap = new Map(
          state.salden.map(s => [`${s.kontonummer}-${s.jahr}-${s.monat}`, s])
        );
        for (const s of newSalden) {
          saldenMap.set(`${s.kontonummer}-${s.jahr}-${s.monat}`, s);
        }
        
        // Aktualisiere uploadedFiles
        const existingIndex = state.uploadedFiles.findIndex(
          f => f.year === parsed.year && f.month === parsed.month
        );
        
        let allFiles: UploadedFile[];
        if (existingIndex >= 0) {
          allFiles = [...state.uploadedFiles];
          allFiles[existingIndex] = uploadedFile;
        } else {
          allFiles = [...state.uploadedFiles, uploadedFile];
        }
        
        // Sortiere nach Datum
        allFiles.sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));
        
        return {
          uploadedFiles: allFiles,
          konten: Array.from(kontenMap.values()),
          salden: Array.from(saldenMap.values()),
          selectedYear: parsed.year,
          selectedMonth: parsed.month,
          isLoading: false,
        };
      });
      
      get().recalculate();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  removeFile: (fileName: string) => {
    set(state => ({
      uploadedFiles: state.uploadedFiles.filter(f => f.name !== fileName),
    }));
  },
  
  setSelectedPeriod: (year: number, month: number) => {
    set({ selectedYear: year, selectedMonth: month });
    get().recalculate();
  },
  
  recalculate: () => {
    const { konten, salden, selectedYear, selectedMonth } = get();
    
    const vergleiche = calculateVergleich(konten, salden, selectedYear, selectedMonth);
    const bereichAggregationen = aggregateByBereich(vergleiche);
    
    console.log('Recalculated:', {
      vergleicheCount: vergleiche.length,
      bereichAggregationenCount: bereichAggregationen.length,
      erlösAggregationen: bereichAggregationen.filter(b => b.kostenarttTyp === 'Erlös'),
    });
    
    set({ vergleiche, bereichAggregationen });
  },
}));

import { create } from 'zustand';
import { Konto, SaldoMonat, UploadedFile, SaldoVergleich, BereichAggregation } from '@/types/finance';
import { parseCSV, extractKonten, extractSalden, parseFileName } from '@/lib/csvParser';
import { calculateVergleich, aggregateByBereich } from '@/lib/calculations';

interface FinanceState {
  uploadedFiles: UploadedFile[];
  konten: Konto[];
  salden: SaldoMonat[];
  selectedYear: number;
  selectedMonth: number;
  isLoading: boolean;
  
  // Computed data
  vergleiche: SaldoVergleich[];
  bereichAggregationen: BereichAggregation[];
  
  // Actions
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
  vergleiche: [],
  bereichAggregationen: [],
  
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
        
        // Aktualisiere selectedPeriod auf neueste Daten
        const allFiles = [...state.uploadedFiles, uploadedFile];
        const latestFile = allFiles.sort((a, b) => 
          b.year * 100 + b.month - (a.year * 100 + a.month)
        )[0];
        
        return {
          uploadedFiles: allFiles,
          konten: Array.from(kontenMap.values()),
          salden: Array.from(saldenMap.values()),
          selectedYear: latestFile.year,
          selectedMonth: latestFile.month,
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
    
    set({ vergleiche, bereichAggregationen });
  },
}));

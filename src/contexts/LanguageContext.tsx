import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'de' | 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  de: {
    // Dashboard
    'dashboard': 'Dashboard',
    'dashboard.description': 'Übersicht Ihrer Finanzkennzahlen',
    'dashboard.noData': 'Keine Daten vorhanden',
    'dashboard.uploadHint': 'Laden Sie Ihre Saldenlisten hoch, um die Finanzanalyse zu starten.',
    'dashboard.expectedFormat': 'Erwartetes Format',
    'dashboard.financialOverview': 'Finanzübersicht',
    
    // KPIs
    'kpi.totalRevenue': 'Gesamterlöse',
    'kpi.fbRevenue': 'F&B Erlöse',
    'kpi.totalExpenses': 'Gesamtaufwand',
    'kpi.personnelCosts': 'Personalkosten',
    'kpi.grossProfit': 'Rohertrag',
    'kpi.grossMargin': 'Rohmarge',
    
    // Tooltips
    'tooltip.revenue': 'Summe aller Erlös-Konten. Klicken für Aufschlüsselung nach Bereich.',
    'tooltip.fb': 'Erlöse aus Food & Beverage (Restaurant, Küche, Bar, Bankett). Klicken für Details.',
    'tooltip.expenses': 'Summe aller Aufwandskonten der Klassen 5-8. Klicken für Aufschlüsselung.',
    'tooltip.personnel': 'Summe aller Konten der Klasse 6 (Löhne, Gehälter, Sozialabgaben). Klicken für Aufschlüsselung.',
    'tooltip.grossProfit': 'Erlöse − Aufwand (Klassen 5-8). Klicken für Details.',
    'tooltip.grossMargin': 'Rohertrag ÷ Erlöse × 100 – zeigt die Rentabilität in Prozent',
    
    // Charts
    'chart.expensesByClass': 'Gesamtaufwand nach Kontoklassen',
    'chart.revenueByArea': 'Erlöse nach Bereich',
    'chart.expensesByArea': 'Aufwand nach Bereich',
    
    // Budget
    'budget.deviations': 'Budget-Abweichungen (Soll-Ist)',
    'budget.noData': 'Keine Budgetdaten für diesen Monat vorhanden',
    'budget.revenue': 'Umsatz',
    'budget.personnel': 'Personal',
    
    // Common
    'common.loading': 'Laden...',
    'common.handbook': 'Handbuch',
    'common.language': 'Sprache',
    'common.german': 'Deutsch',
    'common.english': 'English',
    'common.hindi': 'हिन्दी',
    
    // Months
    'month.january': 'Januar',
    'month.february': 'Februar',
    'month.march': 'März',
    'month.april': 'April',
    'month.may': 'Mai',
    'month.june': 'Juni',
    'month.july': 'Juli',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'Oktober',
    'month.november': 'November',
    'month.december': 'Dezember',
  },
  en: {
    // Dashboard
    'dashboard': 'Dashboard',
    'dashboard.description': 'Overview of your financial metrics',
    'dashboard.noData': 'No data available',
    'dashboard.uploadHint': 'Upload your balance lists to start the financial analysis.',
    'dashboard.expectedFormat': 'Expected format',
    'dashboard.financialOverview': 'Financial Overview',
    
    // KPIs
    'kpi.totalRevenue': 'Total Revenue',
    'kpi.fbRevenue': 'F&B Revenue',
    'kpi.totalExpenses': 'Total Expenses',
    'kpi.personnelCosts': 'Personnel Costs',
    'kpi.grossProfit': 'Gross Profit',
    'kpi.grossMargin': 'Gross Margin',
    
    // Tooltips
    'tooltip.revenue': 'Sum of all revenue accounts. Click for breakdown by area.',
    'tooltip.fb': 'Revenue from Food & Beverage (Restaurant, Kitchen, Bar, Banquet). Click for details.',
    'tooltip.expenses': 'Sum of all expense accounts classes 5-8. Click for breakdown.',
    'tooltip.personnel': 'Sum of all class 6 accounts (Wages, Salaries, Social Security). Click for breakdown.',
    'tooltip.grossProfit': 'Revenue − Expenses (Classes 5-8). Click for details.',
    'tooltip.grossMargin': 'Gross Profit ÷ Revenue × 100 – shows profitability in percent',
    
    // Charts
    'chart.expensesByClass': 'Total Expenses by Account Class',
    'chart.revenueByArea': 'Revenue by Area',
    'chart.expensesByArea': 'Expenses by Area',
    
    // Budget
    'budget.deviations': 'Budget Deviations (Target vs Actual)',
    'budget.noData': 'No budget data available for this month',
    'budget.revenue': 'Revenue',
    'budget.personnel': 'Personnel',
    
    // Common
    'common.loading': 'Loading...',
    'common.handbook': 'Handbook',
    'common.language': 'Language',
    'common.german': 'Deutsch',
    'common.english': 'English',
    'common.hindi': 'हिन्दी',
    
    // Months
    'month.january': 'January',
    'month.february': 'February',
    'month.march': 'March',
    'month.april': 'April',
    'month.may': 'May',
    'month.june': 'June',
    'month.july': 'July',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'October',
    'month.november': 'November',
    'month.december': 'December',
  },
  hi: {
    // Dashboard
    'dashboard': 'डैशबोर्ड',
    'dashboard.description': 'आपके वित्तीय आंकड़ों का अवलोकन',
    'dashboard.noData': 'कोई डेटा उपलब्ध नहीं',
    'dashboard.uploadHint': 'वित्तीय विश्लेषण शुरू करने के लिए अपनी शेष सूची अपलोड करें।',
    'dashboard.expectedFormat': 'अपेक्षित प्रारूप',
    'dashboard.financialOverview': 'वित्तीय अवलोकन',
    
    // KPIs
    'kpi.totalRevenue': 'कुल राजस्व',
    'kpi.fbRevenue': 'F&B राजस्व',
    'kpi.totalExpenses': 'कुल व्यय',
    'kpi.personnelCosts': 'कर्मचारी लागत',
    'kpi.grossProfit': 'सकल लाभ',
    'kpi.grossMargin': 'सकल मार्जिन',
    
    // Tooltips
    'tooltip.revenue': 'सभी राजस्व खातों का योग। क्षेत्र के अनुसार विवरण के लिए क्लिक करें।',
    'tooltip.fb': 'खाद्य एवं पेय पदार्थ से राजस्व (रेस्तरां, रसोई, बार, भोज)। विवरण के लिए क्लिक करें।',
    'tooltip.expenses': 'सभी व्यय खातों का योग वर्ग 5-8। विवरण के लिए क्लिक करें।',
    'tooltip.personnel': 'सभी वर्ग 6 खातों का योग (मजदूरी, वेतन, सामाजिक सुरक्षा)। विवरण के लिए क्लिक करें।',
    'tooltip.grossProfit': 'राजस्व − व्यय (वर्ग 5-8)। विवरण के लिए क्लिक करें।',
    'tooltip.grossMargin': 'सकल लाभ ÷ राजस्व × 100 – प्रतिशत में लाभप्रदता दर्शाता है',
    
    // Charts
    'chart.expensesByClass': 'खाता वर्ग के अनुसार कुल व्यय',
    'chart.revenueByArea': 'क्षेत्र के अनुसार राजस्व',
    'chart.expensesByArea': 'क्षेत्र के अनुसार व्यय',
    
    // Budget
    'budget.deviations': 'बजट विचलन (लक्ष्य बनाम वास्तविक)',
    'budget.noData': 'इस महीने के लिए कोई बजट डेटा उपलब्ध नहीं',
    'budget.revenue': 'राजस्व',
    'budget.personnel': 'कर्मचारी',
    
    // Common
    'common.loading': 'लोड हो रहा है...',
    'common.handbook': 'पुस्तिका',
    'common.language': 'भाषा',
    'common.german': 'Deutsch',
    'common.english': 'English',
    'common.hindi': 'हिन्दी',
    
    // Months
    'month.january': 'जनवरी',
    'month.february': 'फ़रवरी',
    'month.march': 'मार्च',
    'month.april': 'अप्रैल',
    'month.may': 'मई',
    'month.june': 'जून',
    'month.july': 'जुलाई',
    'month.august': 'अगस्त',
    'month.september': 'सितंबर',
    'month.october': 'अक्टूबर',
    'month.november': 'नवंबर',
    'month.december': 'दिसंबर',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'de';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

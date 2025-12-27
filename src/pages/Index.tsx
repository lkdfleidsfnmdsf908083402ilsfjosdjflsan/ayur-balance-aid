import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { AbteilungKpiView } from '@/components/views/AbteilungKpiView';
import { TrendDashboardView } from '@/components/views/TrendDashboardView';
import { HousekeepingKpiView } from '@/components/views/HousekeepingKpiView';
import { KitchenKpiView } from '@/components/views/KitchenKpiView';
import { ServiceKpiView } from '@/components/views/ServiceKpiView';
import { FrontOfficeKpiView } from '@/components/views/FrontOfficeKpiView';
import { SpaKpiView } from '@/components/views/SpaKpiView';
import { TechnicalKpiView } from '@/components/views/TechnicalKpiView';
import { AdminKpiView } from '@/components/views/AdminKpiView';
import { MitarbeiterStammdatenView } from '@/components/views/MitarbeiterStammdatenView';
import { SchichtplanungView } from '@/components/views/SchichtplanungView';
import { AbteilungSchichtplanungView } from '@/components/views/AbteilungSchichtplanungView';
import { ZeitkontenView } from '@/components/views/ZeitkontenView';
import { PersonalKpiUebersichtView } from '@/components/views/PersonalKpiUebersichtView';
import { BudgetPlanungView } from '@/components/views/BudgetPlanungView';
import { KpiAlarmeView } from '@/components/views/KpiAlarmeView';
import { AbteilungsleiterView } from '@/components/views/AbteilungsleiterView';
import { UploadView } from '@/components/views/UploadView';
import { KontenView } from '@/components/views/KontenView';
import { VergleichView } from '@/components/views/VergleichView';
import { BereicheView } from '@/components/views/BereicheView';
import { DatenqualitaetView } from '@/components/views/DatenqualitaetView';
import { BenutzerVerwaltungView } from '@/components/views/BenutzerVerwaltungView';
import { MobileSchichtplanungView } from '@/components/views/MobileSchichtplanungView';
import { AbteilungsleiterDashboardView } from '@/components/views/AbteilungsleiterDashboardView';
import { GaesteVerwaltungView } from '@/components/views/GaesteVerwaltungView';
import { useFinanceStore } from '@/store/financeStore';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigation } from '@/contexts/NavigationContext';

const Index = () => {
  const { activeView, setActiveView } = useNavigation();
  const { initialize, isInitialized, isLoading } = useFinanceStore();
  const { isAdmin, isAbteilungsleiter } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-switch to abteilungsleiter dashboard for Abteilungsleiter
  useEffect(() => {
    if (isAbteilungsleiter && !isAdmin && activeView === 'dashboard') {
      setActiveView('abteilungsleiter-dashboard');
    }
  }, [isAbteilungsleiter, isAdmin, activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'abteilungsleiter-dashboard':
        return <AbteilungsleiterDashboardView />;
      case 'abteilung-kpi':
        return <AbteilungKpiView />;
      case 'kpi-trends':
        return <TrendDashboardView />;
      case 'housekeeping':
        return <HousekeepingKpiView />;
      case 'kitchen':
        return <KitchenKpiView />;
      case 'service':
        return <ServiceKpiView />;
      case 'frontoffice':
        return <FrontOfficeKpiView />;
      case 'spa':
        return <SpaKpiView />;
      case 'technical':
        return <TechnicalKpiView />;
      case 'admin':
        return <AdminKpiView />;
      case 'mitarbeiter':
        return <MitarbeiterStammdatenView />;
      case 'schichtplanung':
        return <SchichtplanungView />;
      case 'abteilung-schichtplanung':
        return <AbteilungSchichtplanungView />;
      case 'mobile-schichtplanung':
        return <MobileSchichtplanungView />;
      case 'zeitkonten':
        return <ZeitkontenView />;
      case 'personal-kpis':
        return <PersonalKpiUebersichtView />;
      case 'budget':
        return <BudgetPlanungView />;
      case 'alarme':
        return <KpiAlarmeView />;
      case 'abteilungsleiter':
        return <AbteilungsleiterView />;
      case 'benutzerverwaltung':
        return <BenutzerVerwaltungView />;
      case 'upload':
        return <UploadView />;
      case 'konten':
        return <KontenView />;
      case 'vergleich':
        return <VergleichView />;
      case 'bereiche':
        return <BereicheView />;
      case 'datenqualitaet':
        return <DatenqualitaetView />;
      case 'gaeste':
        return <GaesteVerwaltungView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;

import { useState, useEffect } from 'react';
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
import { ZeitkontenView } from '@/components/views/ZeitkontenView';
import { BudgetPlanungView } from '@/components/views/BudgetPlanungView';
import { KpiAlarmeView } from '@/components/views/KpiAlarmeView';
import { AbteilungsleiterView } from '@/components/views/AbteilungsleiterView';
import { UploadView } from '@/components/views/UploadView';
import { KontenView } from '@/components/views/KontenView';
import { VergleichView } from '@/components/views/VergleichView';
import { BereicheView } from '@/components/views/BereicheView';
import { DatenqualitaetView } from '@/components/views/DatenqualitaetView';
import { useFinanceStore } from '@/store/financeStore';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { initialize, isInitialized, isLoading } = useFinanceStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
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
      case 'zeitkonten':
        return <ZeitkontenView />;
      case 'budget':
        return <BudgetPlanungView />;
      case 'alarme':
        return <KpiAlarmeView />;
      case 'abteilungsleiter':
        return <AbteilungsleiterView />;
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
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;

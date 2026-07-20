import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { AbteilungKpiView } from '@/components/views/AbteilungKpiView';
import { TrendDashboardView } from '@/components/views/TrendDashboardView';
import { HousekeepingKpiView } from '@/components/views/HousekeepingKpiView';
import { KitchenKpiView } from '@/components/views/KitchenKpiView';
import { ServiceKpiView } from '@/components/views/ServiceKpiView';
import { FrontOfficeKpiView } from '@/components/views/FrontOfficeKpiView';
import { ErstanamnseView } from "@/components/views/ErstanamnseView";
import { SpaKpiView } from '@/components/views/SpaKpiView';
import { TechnicalKpiView } from '@/components/views/TechnicalKpiView';
import { TechnikBestellungenView } from '@/components/views/TechnikBestellungenView';
import { AdminKpiView } from '@/components/views/AdminKpiView';
import { MitarbeiterStammdatenView } from '@/components/views/MitarbeiterStammdatenView';
import { SchichtplanungView } from '@/components/views/SchichtplanungView';
import { AbteilungSchichtplanungView } from '@/components/views/AbteilungSchichtplanungView';
import { TeamSchichtplanungView } from '@/components/views/TeamSchichtplanungView';
import { MeinSchichtplanView } from '@/components/views/MeinSchichtplanView';
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
import { IntelligentSchichtplanungView } from '@/components/views/IntelligentSchichtplanungView';
import { MitarbeiterSchichtplanView } from '@/components/views/MitarbeiterSchichtplanView';
import { AbteilungsleiterDashboardView } from '@/components/views/AbteilungsleiterDashboardView';
import { GaesteVerwaltungView } from '@/components/views/GaesteVerwaltungView';
import { InfluencerView } from '@/components/views/InfluencerView';
import { TokenVerwaltungView } from '@/components/views/TokenVerwaltungView';
import { MenueWeinbegleitungView } from "@/components/views/MenueWeinbegleitungView";
import { WeinScannerView } from "@/components/views/WeinScannerView";
import { KampagnenView } from '@/components/views/KampagnenView';
import { SocialAgentView } from '@/components/views/SocialAgentView';
import { MedienBibliothekView } from '@/components/views/MedienBibliothekView';
import { VerwaltungsTrackerView } from '@/components/views/VerwaltungsTrackerView';
import { useFinanceStore } from '@/store/financeStore';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigation } from '@/contexts/NavigationContext';
import { SplashScreen } from '@/components/views/SplashScreen';
import { EnterpriseValueView } from '@/components/views/EnterpriseValueView';
import { RevenueIntelligenceView } from '@/components/views/RevenueIntelligenceView';
import { GastAnalyticsView } from '@/components/views/GastAnalyticsView';
import SommerKampagneView from '@/components/views/SommerKampagneView';
import { ProtelComparisonView } from '@/components/views/ProtelComparisonView';

const Index = () => {
  const [splashDone, setSplashDone] = useState(false);
  const { activeView, setActiveView } = useNavigation();
  const { initialize, isInitialized, isLoading } = useFinanceStore();
  const { isAdmin, isAbteilungsleiter, userRole } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-switch view based on role
  useEffect(() => {
    // Mitarbeiter: redirect to own shift plan view
    if (userRole === 'mitarbeiter' && activeView === 'dashboard') {
      if (isMobile) {
        setActiveView('mein-schichtplan');
      } else {
        setActiveView('mein-schichtplan');
      }
    }
    // Abteilungsleiter: redirect to abteilungsleiter dashboard (or intelligent scheduling on mobile)
    else if (isAbteilungsleiter && !isAdmin && activeView === 'dashboard') {
      if (isMobile) {
        setActiveView('intelligent-schichtplanung');
      } else {
        setActiveView('abteilungsleiter-dashboard');
      }
    }
  }, [userRole, isAbteilungsleiter, isAdmin, activeView, isMobile, setActiveView]);

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
      case 'erstanamnese': return <ErstanamnseView />;
      case 'spa':
        return <SpaKpiView />;
      case 'technical':
        return <TechnicalKpiView />;
      case 'technik-bestellungen':
        return <TechnikBestellungenView />;
      case 'admin':
        return <AdminKpiView />;
      case 'mitarbeiter':
        return <MitarbeiterStammdatenView />;
      case 'schichtplanung':
        return <SchichtplanungView />;
      case 'abteilung-schichtplanung':
          return <AbteilungSchichtplanungView />;
      case 'team-schichtplanung':
          return <TeamSchichtplanungView />;
      case 'mein-schichtplan':
          return <MeinSchichtplanView />;
      case 'mobile-schichtplanung':
        return <MobileSchichtplanungView />;
      case 'intelligent-schichtplanung':
        return <IntelligentSchichtplanungView />;
      case 'mitarbeiter-schichtplan':
        return <MitarbeiterSchichtplanView />;
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
      case 'influencer':
        return <InfluencerView />;
      case 'token-verwaltung':
        return <TokenVerwaltungView />;
      case 'menue-weinbegleitung':
        return <MenueWeinbegleitungView />;
      case 'weinscanner':
        return <WeinScannerView />;
      case 'kampagnen':
        return <KampagnenView />;
      case 'social-agent':
        return <SocialAgentView />;
      case 'social-medien':
        return <MedienBibliothekView />;
      case 'verwaltung':
          return <VerwaltungsTrackerView />; 
        case 'revenue-intelligence':                          
        return <RevenueIntelligenceView />;
      case 'gast-analytics':                          //
        return <GastAnalyticsView />;                                     
      case 'sommer-kampagne':
        return <SommerKampagneView />;
      case 'protel-comparison':
        return <ProtelComparisonView />;
      case 'enterprise-value':
        return <EnterpriseValueView />;
      default:
        return <DashboardView />;
    }
  };

  if (!splashDone) {
    return <SplashScreen onEnter={() => setSplashDone(true)} />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-y-auto overflow-x-auto w-full min-h-0">
        {renderView()}
      </main>
    </div>
  );
};

export default Index;

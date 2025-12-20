import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardView } from '@/components/views/DashboardView';
import { UploadView } from '@/components/views/UploadView';
import { KontenView } from '@/components/views/KontenView';
import { VergleichView } from '@/components/views/VergleichView';
import { BereicheView } from '@/components/views/BereicheView';

const Index = () => {
  const [activeView, setActiveView] = useState('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'upload':
        return <UploadView />;
      case 'konten':
        return <KontenView />;
      case 'vergleich':
        return <VergleichView />;
      case 'bereiche':
        return <BereicheView />;
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

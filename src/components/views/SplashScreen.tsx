import { useEffect, useState } from 'react';
import { MandiraLogo } from '@/components/MandiraLogo';

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <div
      onClick={onEnter}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1208 40%, #2d1f0a 70%, #0a0a0a 100%)',
      }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #c9a96e 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, #c9a96e 0%, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div className={`flex flex-col items-center gap-8 transition-all duration-1000 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-30"
            style={{ background: '#c9a96e', transform: 'scale(1.5)' }}
          />
          <MandiraLogo className="h-24 w-24 relative z-10" style={{ color: '#c9a96e' }} />
        </div>

        {/* Hauptschriftzug */}
        <div className="text-center space-y-2">
          <h1
            className="text-5xl md:text-7xl font-light tracking-widest"
            style={{
              color: '#c9a96e',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.15em',
              textShadow: '0 0 40px rgba(201,169,110,0.4)',
            }}
          >
            Aus Liebe
          </h1>
          <h1
            className="text-5xl md:text-7xl font-light tracking-widest"
            style={{
              color: '#c9a96e',
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.15em',
              textShadow: '0 0 40px rgba(201,169,110,0.4)',
            }}
          >
            zu Mir
          </h1>
        </div>

        {/* Trennlinie */}
        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #c9a96e)' }} />
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: '#c9a96e' }} />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #c9a96e)' }} />
        </div>

        {/* Subtitle */}
        <p
          className="text-sm tracking-[0.3em] uppercase"
          style={{ color: 'rgba(201,169,110,0.6)' }}
        >
          Mandira Ayurveda Hotel
        </p>
      </div>

      {/* Tap hint */}
      <div
        className={`absolute bottom-12 text-xs tracking-widest uppercase transition-all duration-1000 delay-700 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ color: 'rgba(201,169,110,0.35)' }}
      >
        Tippen zum Fortfahren
      </div>
    </div>
  );
}

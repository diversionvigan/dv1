import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { NavigationTab } from '../types';

interface FloatingBackToHomeWidgetProps {
  activeTab: NavigationTab;
  isBookingOpen: boolean;
  onBackToMain: () => void;
}

export const FloatingBackToHomeWidget: React.FC<FloatingBackToHomeWidgetProps> = ({
  activeTab,
  isBookingOpen,
  onBackToMain,
}) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show if not on default main explore view OR if scrolled down
  const isNotOnDefaultHome = activeTab !== 'explore' || isBookingOpen;
  const isScrolledDown = scrollY > 200;
  const isVisible = isNotOnDefaultHome || isScrolledDown;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 sm:left-6 z-40 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <button
        type="button"
        onClick={onBackToMain}
        className="group relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-[#1A1009] via-[#2E1E14] to-[#1A1009] text-amber-300 hover:text-amber-100 border-2 border-[#D4AF37] hover:border-[#F9E8B2] shadow-2xl shadow-amber-950/60 hover:shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer overflow-hidden backdrop-blur-md"
        title="Back to Main Page / Top"
        aria-label="Back to Main Page"
      >
        {/* Ambient Pulsing Radar Glow */}
        <span className="absolute -inset-1 rounded-full bg-[#D4AF37] opacity-25 group-hover:opacity-50 blur-xs transition-opacity animate-pulse pointer-events-none" />

        {/* Animated Light Sweep Gleam Effect */}
        <span className="absolute inset-0 w-6 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out pointer-events-none" />

        {/* Inner Gold Inset Ring */}
        <span className="absolute inset-[3px] rounded-full border border-amber-400/30 pointer-events-none" />

        {/* Animated Upward Arrow Icon */}
        <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 group-hover:text-amber-100 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-110 drop-shadow-[0_2px_4px_rgba(212,175,55,0.4)]" />
      </button>
    </div>
  );
};

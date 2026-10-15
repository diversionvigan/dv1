import React from 'react';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';

interface ModernBackButtonProps {
  onClick: () => void;
  label?: string;
  sublabel?: string;
  showHomeIcon?: boolean;
  className?: string;
}

export const ModernBackButton: React.FC<ModernBackButtonProps> = ({
  onClick,
  label = 'Back to Main Page',
  sublabel,
  showHomeIcon = true,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 hover:bg-[#FAF7F2] border border-[#E6D7C3] hover:border-[#D4AF37] text-[#2C1E15] shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xs active:scale-98 ${className}`}
      title={label}
    >
      {/* Subtle gold shimmer on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />

      {/* Modern Animated Arrow Circle */}
      <span className="w-8 h-8 rounded-xl bg-[#FAF7F2] group-hover:bg-[#2C1E15] text-[#2C1E15] group-hover:text-amber-300 border border-[#E6D7C3] group-hover:border-[#2C1E15] flex items-center justify-center transition-colors duration-300 shadow-2xs shrink-0">
        <ArrowLeft className="w-4 h-4 transition-transform duration-300 ease-out group-hover:-translate-x-1" />
      </span>

      {/* Label and Sublabel */}
      <div className="text-left leading-tight">
        <div className="flex items-center gap-1.5">
          {showHomeIcon && (
            <Home className="w-3 h-3 text-[#8B6B10] group-hover:text-[#2C1E15] transition-colors shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-bold font-serif tracking-wide text-[#2C1E15] group-hover:text-[#8B6B10] transition-colors">
            {label}
          </span>
        </div>
        {sublabel && (
          <span className="text-[10px] text-[#786150] block font-medium">
            {sublabel}
          </span>
        )}
      </div>

      {/* Subtle right sparkle */}
      <Sparkles className="w-3.5 h-3.5 text-amber-500/40 group-hover:text-amber-500 transition-colors ml-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

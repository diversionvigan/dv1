import React from 'react';

interface VillaLogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'gold' | 'rosegold' | 'rosegold-light' | 'pure' | 'white';
  showText?: boolean;
  hasBackground?: boolean;
}

/**
 * Diversion Vigan - Official 3D Brushed Rose Gold Brand Emblem
 *
 * Emphasized Center Monogram:
 * - Pentagonal House Silhouette with architectural side ear tabs and rounded roof apex
 * - Prominent, Bold Center 'dP' Didone Monogram Shape with dedicated specular gleams & depth
 * - 3D Brushed Rose Gold / Champagne Copper metallic multi-stop gradient with bevel underlay
 * - Transparent background
 */
export const VillaLogo: React.FC<VillaLogoProps> = ({
  className = '',
  size = 48,
  variant = 'rosegold',
  showText = false,
  hasBackground = false,
}) => {
  const idPrefix = `dv-logo-${size}-${Math.random().toString(36).substr(2, 5)}`;

  // Emblem SVG with transparent background and emphasized center monogram
  const Emblem = (
    <svg
      width={size}
      height={size}
      viewBox="22 14 196 196"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="transition-transform duration-300 hover:scale-105 select-none shrink-0"
      aria-label="Diversion Vigan Official Logo"
    >
      <defs>
        {/* Multi-stop 3D Brushed Rose Gold / Champagne Copper Gradient for Frame */}
        <linearGradient id={`${idPrefix}-rosegold`} x1="20" y1="20" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBF0EC" />
          <stop offset="12%" stopColor="#EABCAE" />
          <stop offset="35%" stopColor="#D89E8E" />
          <stop offset="55%" stopColor="#C28273" />
          <stop offset="75%" stopColor="#E4ACA0" />
          <stop offset="90%" stopColor="#AA6758" />
          <stop offset="100%" stopColor="#7E4537" />
        </linearGradient>

        {/* Emphasized Center Monogram Gleam Gradient */}
        <linearGradient id={`${idPrefix}-monogramGleam`} x1="40" y1="60" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF4F0" />
          <stop offset="18%" stopColor="#F0C3B6" />
          <stop offset="40%" stopColor="#DE9F90" />
          <stop offset="65%" stopColor="#C48070" />
          <stop offset="85%" stopColor="#EBB3A7" />
          <stop offset="100%" stopColor="#8A4E40" />
        </linearGradient>

        {/* Burnished Classic Warm Gold Gradient */}
        <linearGradient id={`${idPrefix}-gold`} x1="20" y1="20" x2="220" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF2DC" />
          <stop offset="20%" stopColor="#E5C36E" />
          <stop offset="50%" stopColor="#C9982E" />
          <stop offset="75%" stopColor="#E5C36E" />
          <stop offset="100%" stopColor="#966B14" />
        </linearGradient>

        {/* Bevel Specular Top-Left Highlight */}
        <linearGradient id={`${idPrefix}-bevelLight`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#FBE0D7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7A3F32" stopOpacity="0.05" />
        </linearGradient>

        {/* Inner Bevel Shadow Underlay */}
        <linearGradient id={`${idPrefix}-bevelShadow`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#3D170F" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#7D3B2C" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        {/* Soft Ambient Metallic Drop Shadow */}
        <filter id={`${idPrefix}-shadow`} x="-15%" y="-15%" width="130%" height="135%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#32140D" floodOpacity="0.3" />
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.16" />
        </filter>

        {/* Center Monogram Depth Filter */}
        <filter id={`${idPrefix}-monoDepth`} x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="2" floodColor="#2E120B" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Optional Background if requested */}
      {hasBackground && (
        <rect
          width="240"
          height="240"
          rx="44"
          fill="#2C1E15"
        />
      )}

      <g filter={variant === 'dark' || variant === 'white' || variant === 'pure' ? undefined : `url(#${idPrefix}-shadow)`}>
        {/* 3D Bevel Shadow Underlay */}
        {(variant !== 'white' && variant !== 'pure') && (
          <path
            d="M 120 23.5
               L 186 69.5
               C 192 73.5 195 78.5 195 86
               L 195 116
               L 204 118.5
               C 207 119.5 208.5 122 208.5 125
               L 208.5 145
               C 208.5 148 207 150.5 204 151.5
               L 195 154
               L 195 186
               C 195 198 186 207.5 174 207.5
               L 66 207.5
               C 54 207.5 45 198 45 186
               L 45 154
               L 36 151.5
               C 33 150.5 31.5 148 31.5 145
               L 31.5 125
               C 31.5 122 33 119.5 36 118.5
               L 45 116
               L 45 86
               C 45 78.5 48 73.5 54 69.5
               Z"
            fill={`url(#${idPrefix}-bevelShadow)`}
            opacity="0.8"
            transform="translate(1, 1.5)"
          />
        )}

        {/* Main Outer House Structure with Side Ears */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 120 23
             L 186 69
             C 192 73 195 78 195 85
             L 195 115
             L 203.5 117.5
             C 206.5 118.5 208 121 208 124
             L 208 144
             C 208 147 206.5 149.5 203.5 150.5
             L 195 153
             L 195 185
             C 195 197 186 206 174 206
             L 66 206
             C 54 206 45 197 45 185
             L 45 153
             L 36.5 150.5
             C 33.5 149.5 32 147 32 144
             L 32 124
             C 32 121 33.5 118.5 36.5 117.5
             L 45 115
             L 45 85
             C 45 78 48 73 54 69
             Z
             M 120 37
             L 61 78.5
             C 58 80.5 56 83.5 56 87.5
             L 56 183
             C 56 190.5 61.5 196 69 196
             L 171 196
             C 178.5 196 184 190.5 184 183
             L 184 87.5
             C 184 83.5 182 80.5 179 78.5
             Z"
          fill={
            variant === 'dark'
              ? '#2C1E15'
              : variant === 'white'
              ? '#FFFFFF'
              : variant === 'pure'
              ? 'currentColor'
              : variant === 'gold'
              ? `url(#${idPrefix}-gold)`
              : `url(#${idPrefix}-rosegold)`
          }
        />

        {/* Specular Light Rim Sheen on House */}
        {(variant !== 'dark' && variant !== 'white' && variant !== 'pure') && (
          <path
            d="M 120 23
               L 186 69
               C 192 73 195 78 195 85
               L 195 115
               M 54 69
               L 120 23"
            stroke={`url(#${idPrefix}-bevelLight)`}
            strokeWidth="1.5"
            fill="none"
          />
        )}

        {/* EMPHASIZED CENTER MONOGRAM SHAPE GROUP */}
        <g filter={variant === 'dark' || variant === 'white' || variant === 'pure' ? undefined : `url(#${idPrefix}-monoDepth)`}>
          {/* Central Vertical Pillar Stem */}
          <rect
            x="113"
            y="78"
            width="14"
            height="114"
            rx="2"
            fill={
              variant === 'dark'
                ? '#2C1E15'
                : variant === 'white'
                ? '#FFFFFF'
                : variant === 'pure'
                ? 'currentColor'
                : variant === 'gold'
                ? `url(#${idPrefix}-gold)`
                : `url(#${idPrefix}-monogramGleam)`
            }
          />
          {(variant !== 'dark' && variant !== 'white' && variant !== 'pure') && (
            <line
              x1="114"
              y1="79"
              x2="114"
              y2="191"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />
          )}

          {/* 'P' Loop (Upper Right Monogram - Emphasized & Bold) */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 127 78
               L 165 78
               C 190 78 201 89.5 201 112
               C 201 134.5 190 146 165 146
               L 127 146
               Z
               M 127 89
               L 162 89
               C 178.5 89 187.5 97 187.5 112
               C 187.5 127 178.5 135 162 135
               L 127 135
               Z"
            fill={
              variant === 'dark'
                ? '#2C1E15'
                : variant === 'white'
                ? '#FFFFFF'
                : variant === 'pure'
                ? 'currentColor'
                : variant === 'gold'
                ? `url(#${idPrefix}-gold)`
                : `url(#${idPrefix}-monogramGleam)`
            }
          />
          {(variant !== 'dark' && variant !== 'white' && variant !== 'pure') && (
            <path
              d="M 127 79 L 165 79 C 189 79 199.5 90 199.5 111.5"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeOpacity="0.85"
              fill="none"
            />
          )}

          {/* 'C' / 'd' Crescent Loop (Lower Left Monogram - Emphasized & Bold) */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 113 138
               L 75 138
               C 50 138 39 149.5 39 172
               C 39 194.5 50 206 75 206
               L 113 206
               L 113 195
               L 78 195
               C 61.5 195 52.5 187 52.5 172
               C 52.5 157 61.5 149 78 149
               L 113 149
               Z"
            fill={
              variant === 'dark'
                ? '#2C1E15'
                : variant === 'white'
                ? '#FFFFFF'
                : variant === 'pure'
                ? 'currentColor'
                : variant === 'gold'
                ? `url(#${idPrefix}-gold)`
                : `url(#${idPrefix}-monogramGleam)`
            }
          />
          {(variant !== 'dark' && variant !== 'white' && variant !== 'pure') && (
            <path
              d="M 113 139 L 75 139 C 51 139 40.5 150 40.5 172"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeOpacity="0.85"
              fill="none"
            />
          )}
        </g>
      </g>
    </svg>
  );

  if (!showText) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {Emblem}
      </div>
    );
  }

  const textColor = variant === 'light' || variant === 'white' ? 'text-white' : 'text-[#2C1E15]';
  const subtextColor = variant === 'light' || variant === 'white' ? 'text-[#EAD8CA]' : 'text-[#786150]';

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
      {Emblem}
      <div className="flex flex-col">
        <span 
          className={`font-extrabold uppercase tracking-[0.22em] text-lg leading-tight font-serif ${textColor}`}
        >
          Diversion
        </span>
        <span 
          className={`text-[10px] tracking-[0.24em] font-medium uppercase mt-0.5 ${subtextColor}`}
        >
          Vigan Transient &amp; Villa
        </span>
      </div>
    </div>
  );
};

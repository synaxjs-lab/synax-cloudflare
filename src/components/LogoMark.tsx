import React from 'react';
import { ProfessionalLogo } from '../types';

interface LogoMarkProps {
  logo?: ProfessionalLogo;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  glow?: boolean;
  className?: string;
  animate?: boolean;
}

export const LogoMark: React.FC<LogoMarkProps> = ({
  logo,
  size = 'md',
  glow = true,
  className = '',
  animate = false,
}) => {
  const accentColor = logo?.accentColor || '#6366f1';
  const glowColor = logo?.glowColor || 'rgba(99, 102, 241, 0.5)';
  const svgPath =
    logo?.svgPath ||
    'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z';

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-16 h-16 p-3.5',
    xl: 'w-24 h-24 p-5',
    hero: 'w-32 h-32 md:w-40 md:h-40 p-7 md:p-9',
  };

  return (
    <div
      className={`relative rounded-3xl flex items-center justify-center transition-all duration-700 select-none ${sizeClasses[size]} ${className}`}
      style={{
        background: `radial-gradient(circle at 35% 30%, rgba(30, 41, 59, 0.75), rgba(8, 12, 22, 0.95))`,
        border: `1px solid ${accentColor}45`,
        boxShadow: glow
          ? `0 0 35px ${glowColor}, inset 0 0 20px ${glowColor}30, 0 10px 25px -5px rgba(0, 0, 0, 0.7)`
          : 'none',
      }}
    >
      {/* Outer Luminous Aura Ring */}
      {glow && (
        <>
          <div
            className="absolute -inset-2 rounded-full opacity-40 blur-xl pointer-events-none transition-all duration-700"
            style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
          />
          {/* Subtle celestial orbital ring */}
          <div
            className={`absolute -inset-3 rounded-full border border-dashed pointer-events-none transition-opacity duration-500 ${
              animate ? 'animate-spin opacity-40' : 'opacity-20'
            }`}
            style={{
              borderColor: `${accentColor}50`,
              animationDuration: '30s',
            }}
          />
        </>
      )}

      {/* Internal Emblem Vector */}
      <svg
        viewBox="0 0 24 24"
        className={`w-full h-full relative z-10 transition-transform duration-700 ${
          animate ? 'hover:scale-110' : ''
        }`}
        fill="none"
        stroke={accentColor}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: glow
            ? `drop-shadow(0 0 12px ${accentColor}) drop-shadow(0 0 3px #ffffff)`
            : 'none',
        }}
      >
        <path d={svgPath} fill={`${accentColor}25`} />
      </svg>
    </div>
  );
};

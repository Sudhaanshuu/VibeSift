import React from 'react';
import { brandConfig } from '../../config/brand';

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  customName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  showTagline = false,
  size = 'md',
  customName
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Original Shield-Check Scan Icon with Vibrant Reference Green */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-emerald to-brand-emerald-dark text-white shadow-subtle ${iconSizes[size]}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-5/6 h-5/6 stroke-current"
          strokeWidth="2.3"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          {/* Shield outline */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {/* Checkmark inside */}
          <path d="m9 12 2 2 4-4" />
          {/* Horizontal radar scan beam indicator */}
          <line x1="6" y1="10" x2="18" y2="10" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="1 2" />
        </svg>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-extrabold tracking-tight text-brand-text ${textSizes[size]}`}>
            {customName || brandConfig.name}
          </span>
          <span className="text-[11px] font-bold text-brand-emerald-dark tracking-wide px-1.5 py-0.5 rounded-full bg-brand-mint border border-brand-border">
            {brandConfig.subBrand}
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-brand-text-secondary mt-0.5 font-normal">
            {brandConfig.tagline}
          </span>
        )}
      </div>
    </div>
  );
};

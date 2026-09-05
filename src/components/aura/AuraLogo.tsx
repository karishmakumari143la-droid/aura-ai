import React from 'react';

interface AuraLogoProps {
  size?: number;
  showWordmark?: boolean;
  compact?: boolean;
  className?: string;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size = 40,
  showWordmark = true,
  compact = false,
  className = ''
}) => {
  const markSize = size;
  const wordmarkSize = compact ? 'text-sm' : 'text-base sm:text-lg';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 64 64"
        role="img"
        aria-label="AURA AI symbol"
        className="shrink-0 overflow-visible"
      >
        <defs>
          <radialGradient id="aura-logo-core" cx="36%" cy="30%" r="70%">
            <stop offset="0" stopColor="#bffaff" />
            <stop offset="0.22" stopColor="#38e8ff" />
            <stop offset="0.7" stopColor="#1678d4" />
            <stop offset="1" stopColor="#24135f" />
          </radialGradient>
          <linearGradient id="aura-logo-orbit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="0.56" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
          <filter id="aura-logo-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g fill="none" stroke="url(#aura-logo-orbit)" strokeLinecap="round" filter="url(#aura-logo-glow)">
          <ellipse cx="32" cy="32" rx="27" ry="11" transform="rotate(-24 32 32)" strokeWidth="1.35" opacity="0.82" />
          <ellipse cx="32" cy="32" rx="26" ry="10" transform="rotate(34 32 32)" strokeWidth="1.1" opacity="0.62" />
          <path d="M7 37 C18 51 44 51 57 28" strokeWidth="1" opacity="0.52" />
        </g>
        <circle cx="32" cy="32" r="16.5" fill="#050b18" stroke="#67e8f9" strokeWidth="1.1" opacity="0.96" />
        <circle cx="32" cy="32" r="13.8" fill="url(#aura-logo-core)" opacity="0.18" />
        <path d="M23.2 40.8 L31.9 20.5 L41 40.8 M27.1 33.1 H36.8" fill="none" stroke="#d9fbff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#aura-logo-glow)" />
        <circle cx="10" cy="24" r="1.25" fill="#d9fbff" />
        <circle cx="52.5" cy="40.5" r="1.05" fill="#c084fc" />
        <circle cx="43.5" cy="8.5" r="0.85" fill="#67e8f9" />
      </svg>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className={`font-semibold tracking-[0.14em] text-white ${wordmarkSize}`}>AURA <span className="text-cyan-300">AI</span></span>
          {!compact && <span className="mt-1 text-[8px] font-mono uppercase tracking-[0.2em] text-slate-500">Living intelligence</span>}
        </span>
      )}
    </span>
  );
};

'use client';

/**
 * Feature Icons Collection
 * 6 unique SVG icons for landing page features
 * Each icon is hand-crafted, animated, and themed
 */

const iconBase = "w-10 h-10";

export function IconInstantDeploys() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-instant" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="24" cy="24" r="22" fill="rgba(96,165,250,0.1)" stroke="rgba(96,165,250,0.2)" strokeWidth="1" />
      {/* Lightning bolt */}
      <path d="M26 8 L16 24 L22 24 L22 38 L32 22 L26 22 Z" fill="url(#icon-instant)" opacity="0.9" />
      {/* Deploy arrow */}
      <path d="M34 18 L38 14 L34 10" stroke="rgba(96,165,250,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="22" y1="14" x2="36" y2="14" stroke="rgba(96,165,250,0.4)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconSecureByDefault() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgba(52,211,153,0.1)" stroke="rgba(52,211,153,0.2)" strokeWidth="1" />
      {/* Shield */}
      <path d="M24 10 L14 16 L14 26 C14 34 24 40 24 40 C24 40 34 34 34 26 L34 16 Z" fill="url(#icon-shield)" opacity="0.15" stroke="url(#icon-shield)" strokeWidth="2" />
      {/* Lock icon */}
      <rect x="20" y="22" width="8" height="6" rx="1.5" fill="url(#icon-shield)" />
      <path d="M21 22 L21 19 C21 17 27 17 27 19 L27 22" stroke="url(#icon-shield)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Keyhole */}
      <circle cx="24" cy="24.5" r="1" fill="rgba(16,185,129,0.8)" />
    </svg>
  );
}

export function IconRealtimeLogs() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-log" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.2)" strokeWidth="1" />
      {/* Terminal window */}
      <rect x="10" y="14" width="28" height="20" rx="3" fill="rgba(30,41,59,0.5)" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
      {/* Log lines */}
      <rect x="14" y="19" width="10" height="2" rx="1" fill="url(#icon-log)" />
      <rect x="14" y="23" width="16" height="2" rx="1" fill="rgba(251,191,36,0.5)" />
      <rect x="14" y="27" width="12" height="2" rx="1" fill="rgba(249,115,22,0.4)" />
      {/* Cursor blink */}
      <rect x="28" y="19" width="1.5" height="2" rx="0.5" fill="url(#icon-log)" />
      {/* Streaming dots */}
      <circle cx="36" cy="20" r="1.5" fill="rgba(251,191,36,0.6)" />
      <circle cx="40" cy="24" r="1.5" fill="rgba(249,115,22,0.5)" />
      <circle cx="44" cy="28" r="1.5" fill="rgba(251,191,36,0.4)" />
    </svg>
  );
}

export function IconHundredParams() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-params" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgba(192,132,252,0.1)" stroke="rgba(192,132,252,0.2)" strokeWidth="1" />
      {/* Sliders */}
      <line x1="14" y1="16" x2="34" y2="16" stroke="rgba(192,132,252,0.3)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="16" r="3" fill="url(#icon-params)" />
      <line x1="14" y1="24" x2="34" y2="24" stroke="rgba(192,132,252,0.3)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="28" cy="24" r="3" fill="url(#icon-params)" />
      <line x1="14" y1="32" x2="34" y2="32" stroke="rgba(192,132,252,0.3)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="32" r="3" fill="url(#icon-params)" />
    </svg>
  );
}

export function IconMultiPlatform() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-platform" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
      {/* Central hub */}
      <circle cx="24" cy="24" r="5" fill="url(#icon-platform)" />
      {/* Platform nodes */}
      <circle cx="14" cy="14" r="4" fill="rgba(56,189,248,0.3)" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
      <circle cx="34" cy="14" r="4" fill="rgba(56,189,248,0.3)" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
      <circle cx="14" cy="34" r="4" fill="rgba(56,189,248,0.3)" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
      <circle cx="34" cy="34" r="4" fill="rgba(56,189,248,0.3)" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
      {/* Connection lines */}
      <line x1="17" y1="17" x2="20.5" y2="20.5" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
      <line x1="31" y1="17" x2="27.5" y2="20.5" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
      <line x1="17" y1="31" x2="20.5" y2="27.5" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
      <line x1="31" y1="31" x2="27.5" y2="27.5" stroke="rgba(56,189,248,0.4)" strokeWidth="1.5" />
    </svg>
  );
}

export function IconAnalytics() {
  return (
    <svg viewBox="0 0 48 48" className={iconBase} fill="none">
      <defs>
        <linearGradient id="icon-chart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.2)" strokeWidth="1" />
      {/* Chart bars */}
      <rect x="12" y="28" width="5" height="10" rx="1" fill="rgba(34,197,94,0.4)" />
      <rect x="20" y="22" width="5" height="16" rx="1" fill="rgba(34,197,94,0.6)" />
      <rect x="28" y="16" width="5" height="22" rx="1" fill="url(#icon-chart)" />
      {/* Trend line */}
      <path d="M14 26 L22 20 L30 14 L36 10" stroke="rgba(34,197,94,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on trend */}
      <circle cx="36" cy="10" r="2" fill="url(#icon-chart)" />
      {/* Base line */}
      <line x1="10" y1="38" x2="38" y2="38" stroke="rgba(34,197,94,0.3)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

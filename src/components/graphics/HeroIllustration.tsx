'use client';

/**
 * Animated Hero Illustration
 * Depicts: code → servers → rocket launch (deployment flow)
 * Pure SVG + CSS animations, no external dependencies
 */
export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 400"
      className="w-full max-w-3xl mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes rocket-launch {
          0% { transform: translateY(0) rotate(-45deg); }
          50% { transform: translateY(-20px) rotate(-45deg); }
          100% { transform: translateY(0) rotate(-45deg); }
        }
        @keyframes flame-flicker {
          0%, 100% { opacity: 0.8; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.3); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes dash-move {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 24; }
        }
        @keyframes particle-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0.6; }
          100% { transform: translateY(-60px) translateX(20px); opacity: 0; }
        }
        .float-slow { animation: float-slow 4s ease-in-out infinite; }
        .float-fast { animation: float-fast 2.5s ease-in-out infinite; }
        .rocket { animation: rocket-launch 3s ease-in-out infinite; transform-origin: center; }
        .flame { animation: flame-flicker 0.3s ease-in-out infinite; transform-origin: center bottom; }
        .pulse { animation: pulse-glow 2s ease-in-out infinite; }
        .dash { animation: dash-move 1s linear infinite; }
        .particle { animation: particle-drift 2s ease-out infinite; }
        .particle:nth-child(2) { animation-delay: 0.5s; animation-duration: 2.5s; }
        .particle:nth-child(3) { animation-delay: 1s; animation-duration: 1.8s; }
      `}</style>

      {/* Background grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </pattern>
        <linearGradient id="rocket-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="flame-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <linearGradient id="code-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(59,130,246,0.1)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.1)" />
        </linearGradient>
        <linearGradient id="server-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background grid */}
      <rect width="800" height="400" fill="url(#grid)" />

      {/* === LEFT: Code Editor === */}
      <g className="float-slow">
        {/* Editor window */}
        <rect x="30" y="80" width="220" height="180" rx="12" fill="url(#code-bg)" stroke="rgba(96,165,250,0.3)" strokeWidth="1.5" />
        {/* Title bar */}
        <rect x="30" y="80" width="220" height="32" rx="12" fill="rgba(30,41,59,0.8)" />
        <circle cx="52" cy="96" r="5" fill="#ef4444" />
        <circle cx="68" cy="96" r="5" fill="#fbbf24" />
        <circle cx="84" cy="96" r="5" fill="#22c55e" />
        <text x="140" y="100" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">deploy.ts</text>

        {/* Code lines */}
        <rect x="45" y="125" width="80" height="4" rx="2" fill="#60a5fa" opacity="0.8" />
        <rect x="45" y="137" width="120" height="4" rx="2" fill="#a78bfa" opacity="0.7" />
        <rect x="60" y="149" width="100" height="4" rx="2" fill="#34d399" opacity="0.6" />
        <rect x="60" y="161" width="140" height="4" rx="2" fill="#fbbf24" opacity="0.5" />
        <rect x="60" y="173" width="90" height="4" rx="2" fill="#f87171" opacity="0.5" />
        <rect x="45" y="185" width="60" height="4" rx="2" fill="#60a5fa" opacity="0.6" />
        <rect x="45" y="197" width="110" height="4" rx="2" fill="#a78bfa" opacity="0.5" />
        <rect x="60" y="209" width="130" height="4" rx="2" fill="#34d399" opacity="0.4" />
        <rect x="45" y="221" width="50" height="4" rx="2" fill="#60a5fa" opacity="0.6" />
        <rect x="45" y="233" width="95" height="4" rx="2" fill="#fbbf24" opacity="0.4" />
      </g>

      {/* === CENTER: Servers === */}
      <g className="float-slow" style={{ animationDelay: '0.5s' }}>
        {/* Server 1 */}
        <rect x="340" y="100" width="120" height="80" rx="8" fill="url(#server-grad)" stroke="rgba(96,165,250,0.3)" strokeWidth="1.5" />
        <rect x="350" y="112" width="100" height="4" rx="2" fill="#22c55e" opacity="0.8" />
        <rect x="350" y="124" width="80" height="4" rx="2" fill="#22c55e" opacity="0.6" />
        <rect x="350" y="136" width="60" height="4" rx="2" fill="#fbbf24" opacity="0.5" />
        <circle cx="445" cy="114" r="4" fill="#22c55e" className="pulse" />
        <circle cx="445" cy="126" r="4" fill="#22c55e" className="pulse" style={{ animationDelay: '0.3s' }} />
        <circle cx="445" cy="138" r="4" fill="#fbbf24" className="pulse" style={{ animationDelay: '0.6s' }} />

        {/* Server 2 */}
        <rect x="340" y="190" width="120" height="80" rx="8" fill="url(#server-grad)" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" />
        <rect x="350" y="202" width="90" height="4" rx="2" fill="#60a5fa" opacity="0.7" />
        <rect x="350" y="214" width="100" height="4" rx="2" fill="#a78bfa" opacity="0.6" />
        <rect x="350" y="226" width="70" height="4" rx="2" fill="#22c55e" opacity="0.5" />
        <circle cx="445" cy="204" r="4" fill="#60a5fa" className="pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="445" cy="216" r="4" fill="#a78bfa" className="pulse" style={{ animationDelay: '0.5s' }} />
        <circle cx="445" cy="228" r="4" fill="#22c55e" className="pulse" style={{ animationDelay: '0.8s' }} />

        {/* Server glow */}
        <ellipse cx="400" cy="140" rx="80" ry="30" fill="rgba(96,165,250,0.05)" className="pulse" />
      </g>

      {/* === RIGHT: Rocket === */}
      <g className="float-fast" style={{ transformOrigin: '620px 150px' }}>
        {/* Rocket body */}
        <g className="rocket">
          {/* Body */}
          <path d="M600 180 L620 100 L640 180 Z" fill="url(#rocket-body)" stroke="rgba(96,165,250,0.5)" strokeWidth="1.5" />
          {/* Nose cone */}
          <path d="M615 100 L620 80 L625 100 Z" fill="#ef4444" />
          {/* Window */}
          <circle cx="620" cy="140" r="8" fill="rgba(14,165,233,0.8)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <circle cx="620" cy="140" r="5" fill="rgba(255,255,255,0.2)" />
          {/* Fins */}
          <path d="M600 170 L590 190 L600 180 Z" fill="#3b82f6" />
          <path d="M640 170 L650 190 L640 180 Z" fill="#3b82f6" />
          {/* Flame */}
          <g className="flame">
            <path d="M610 185 L620 220 L630 185 Z" fill="url(#flame-grad)" filter="url(#glow)" />
            <path d="M614 185 L620 210 L626 185 Z" fill="#fbbf24" opacity="0.8" />
          </g>
        </g>

        {/* Particles */}
        <g className="particles">
          <circle cx="620" cy="230" r="2" fill="#fbbf24" className="particle" />
          <circle cx="615" cy="225" r="1.5" fill="#f97316" className="particle" />
          <circle cx="625" cy="228" r="1" fill="#ef4444" className="particle" />
        </g>
      </g>

      {/* === Connection Lines (data flow) === */}
      <path
        d="M250 170 Q295 140 340 140"
        stroke="rgba(96,165,250,0.4)"
        strokeWidth="2"
        strokeDasharray="4 4"
        className="dash"
      />
      <path
        d="M460 140 Q520 120 580 130"
        stroke="rgba(96,165,250,0.4)"
        strokeWidth="2"
        strokeDasharray="4 4"
        className="dash"
        style={{ animationDelay: '0.3s' }}
      />

      {/* Floating dots (ambient particles) */}
      <circle cx="280" cy="60" r="3" fill="rgba(96,165,250,0.3)" className="particle" />
      <circle cx="500" cy="50" r="2" fill="rgba(139,92,246,0.3)" className="particle" style={{ animationDelay: '0.7s' }} />
      <circle cx="700" cy="80" r="2.5" fill="rgba(34,197,94,0.3)" className="particle" style={{ animationDelay: '1.3s' }} />
      <circle cx="150" cy="300" r="2" fill="rgba(251,191,36,0.3)" className="particle" style={{ animationDelay: '0.4s' }} />
      <circle cx="450" cy="320" r="3" fill="rgba(96,165,250,0.2)" className="particle" style={{ animationDelay: '1s' }} />

      {/* Success checkmark (subtle) */}
      <g className="float-slow" style={{ animationDelay: '1s' }}>
        <circle cx="720" cy="180" r="20" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.3)" strokeWidth="1.5" />
        <path d="M710 180 L718 188 L732 172" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

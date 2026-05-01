/**
 * SVG Background Patterns
 * Grid, dots, and wave patterns for landing page depth
 * Usage: Import and place as decorative background elements
 */

export function GridPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="grid-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}

export function DotPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="dot-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
  );
}

export function WavePattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute bottom-0 left-0 w-full pointer-events-none ${className}`}
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(96,165,250,0.15)" />
          <stop offset="50%" stopColor="rgba(139,92,246,0.15)" />
          <stop offset="100%" stopColor="rgba(34,197,94,0.15)" />
        </linearGradient>
      </defs>
      <path
        d="M0,60 C240,120 480,0 720,60 C960,120 1200,0 1440,60 L1440,120 L0,120 Z"
        fill="url(#wave-grad)"
      />
      <path
        d="M0,80 C240,20 480,100 720,80 C960,60 1200,100 1440,80 L1440,120 L0,120 Z"
        fill="rgba(96,165,250,0.08)"
      />
    </svg>
  );
}

export function FloatingParticles({ count = 20 }: { count?: number }) {
  // Deterministic seed-based particles for SSR/render consistency
  const particles = Array.from({ length: count }, (_, i) => ({
    cx: `${(i * 37.3) % 100}%`,
    cy: `${(i * 61.7) % 100}%`,
    r: 0.5 + (i * 0.13) % 2,
    opacity: 0.1 + (i * 0.07) % 0.3,
    delay: `${(i * 0.37) % 5}s`,
    duration: `${10 + (i * 0.53) % 10}s`,
  }));

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.3; }
          75% { transform: translateY(-30px) translateX(15px); opacity: 0.4; }
        }
      `}</style>
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill="rgba(96,165,250,0.5)"
          style={{
            opacity: p.opacity,
            animation: `particle-float ${p.duration} ease-in-out ${p.delay} infinite`,
          }}
        />
      ))}
    </svg>
  );
}

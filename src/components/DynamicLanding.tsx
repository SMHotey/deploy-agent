import { FC } from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface HeroConfig {
  title: string;
  subtitle: string;
  ctaText: string;
  gradient: string;
}

interface CTAConfig {
  text: string;
  link: string;
}

interface DynamicLandingProps {
  config: {
    hero: HeroConfig;
    features: Feature[];
    cta: CTAConfig;
  };
  slug?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  rocket: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 16.5c-1.64 0-3.09-.79-4-2.01-.73-1-.99-2.33-.99-3.66 0-1.33.26-2.66.99-3.66 1.26-1.44 2.71-2.01 4-2.01.64 0 1.24.09 1.8.26l3.9 1.3c1.5.5 2.82 1.41 3.3 2.86.49 1.45-.27 2.98-1.22 3.47-2.23.49-1.26-.27-2.6-1.22-3.09-2.23-.49-1.45.27-2.98 1.22-3.47z" />
      <path d="M12 2v20M2 12h20" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  bolt: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  chart: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" />
    </svg>
  ),
  code: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M16 18l-6-6 6-6M8 6l-6 6 6 6" />
      <path d="M8 6l-6 6 6 6" />
    </svg>
  ),
  users: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  star: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  heart: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 0 000-7.78z" />
    </svg>
  ),
  zap: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
};

const DynamicLanding: FC<DynamicLandingProps> = ({ config, slug }) => {
  const { hero, features, cta } = config;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${hero.gradient} opacity-10`} />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <h1 className={`text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r ${hero.gradient} bg-clip-text text-transparent`}>
            {hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 mb-8 max-w-3xl mx-auto">
            {hero.subtitle}
          </p>
          <a
            href={cta.link}
            className={`inline-block px-8 py-4 bg-gradient-to-r ${hero.gradient} text-white font-semibold text-lg rounded-xl hover:opacity-90 transition-all transform hover:scale-105`}
          >
            {hero.ctaText}
          </a>
          {slug && (
            <p className="mt-4 text-sm text-zinc-500">
              Published page: /landing/{slug}
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-zinc-900/50 backdrop-blur rounded-xl p-6 border border-zinc-800 hover:border-blue-500/50 transition-all group"
            >
              <div className="text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                {iconMap[feature.icon] || iconMap.zap}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-zinc-100">
                {feature.title}
              </h3>
              <p className="text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {cta.text}
          </h2>
          <a
            href={cta.link}
            className="inline-block px-8 py-4 bg-white text-zinc-950 font-semibold text-lg rounded-xl hover:bg-zinc-100 transition-all transform hover:scale-105"
          >
            Get Started Now
          </a>
        </div>
      </section>
    </div>
  );
};

export default DynamicLanding;

export const metadata = {
  title: 'Deploy Agent - Ship Code Faster',
  description:
    'One-click deployment from git repositories to Vercel, Netlify, and more. Built for modern teams.',
};

import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { HeroIllustration } from '@/components/graphics/HeroIllustration';
import { GridPattern, FloatingParticles, WavePattern } from '@/components/graphics/BackgroundPatterns';
import {
  IconInstantDeploys,
  IconSecureByDefault,
  IconRealtimeLogs,
  IconHundredParams,
  IconMultiPlatform,
  IconAnalytics,
} from '@/components/graphics/FeatureIcons';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-card text-muted-foreground">
      <Navbar />

      {/* Hero Section with animated gradient mesh background, custom SVG illustration, and staggered text */}
      <section id="hero" className="relative overflow-hidden pt-20 pb-20 bg-zinc-900 dark:bg-zinc-950">
        {/* Animated gradient mesh background blobs */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 opacity-40 top-20 left-6 animate-float" />
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-blue-400 via-teal-400 to-green-400 opacity-40 top-0 right-16 rotate-12 animate-float" />
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 opacity-40 bottom-8 left-20 rotate-12 animate-float" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-500/40 opacity-40 animate-gradient" />
          <GridPattern />
          <FloatingParticles count={15} />
        </div>

        {/* Subtle noise texture overlay */}
        <div className="noise absolute inset-0 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white animate-fade-in-up stagger-1">
            Ship code <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-yellow-300">Faster</span>
          </h1>
          <p className="mt-6 text-xl text-white/90 max-w-2xl mx-auto animate-fade-in-up stagger-2">
            One-click deployment from any git repository to Vercel, Netlify, Cloudflare Pages, and more. Beautiful defaults, zero hassle.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap animate-fade-in-up stagger-3">
            <Link
              href="/deploy"
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:from-blue-500 hover:to-violet-500 transition-colors"
            >
              Start Deploying
            </Link>
            <a href="#features" className="px-8 py-3 rounded-lg border border-white/40 text-white bg-white/10 hover:bg-white/20 transition-colors">
              Learn More
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-white/90">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" />
              <span>Deploy in seconds</span>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="mt-16 animate-fade-in-up stagger-4">
            <HeroIllustration />
          </div>
        </div>

        {/* Wave divider */}
        <WavePattern className="h-24" />
      </section>

      {/* Background decoration preserved from original design */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section with glassmorphism cards and custom SVG icons */}
      <section id="features" className="relative py-20 bg-zinc-50 dark:bg-zinc-900 border-t border-border overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-[0.02]" aria-hidden="true">
            <defs>
              <pattern id="feature-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#feature-grid)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Everything you need to ship</h2>
            <p className="text-lg text-muted-foreground">Powerful features for modern deployment workflows</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <IconInstantDeploys />,
                title: 'Instant Deploys',
                description:
                  'Deploy from any git repository with a single click. Supports GitHub, GitLab, and Bitbucket.',
              },
              {
                icon: <IconSecureByDefault />,
                title: 'Secure by Default',
                description:
                  'AES-256-GCM encryption for all tokens and secrets. Rate limiting and secure headers included.',
              },
              {
                icon: <IconRealtimeLogs />,
                title: 'Real-time Logs',
                description:
                  'Watch your deployments live with SSE streaming. Debug faster with instant feedback.',
              },
              {
                icon: <IconHundredParams />,
                title: '100+ Parameters',
                description:
                  'Full control over your deployments. Environment variables, build commands, custom domains, and more.',
              },
              {
                icon: <IconMultiPlatform />,
                title: 'Multi-Platform',
                description:
                  'Deploy to Vercel, Netlify, Cloudflare Pages, or Railway. One tool for all platforms.',
              },
              {
                icon: <IconAnalytics />,
                title: 'Analytics & Insights',
                description:
                  'Track deployment success rates, build times, and project health from your dashboard.',
              },
            ].map((feature, i) => (
              <div key={i} className="glass p-6 rounded-xl border border-border bg-card hover:border-blue-500/30 transition-all duration-300 group">
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section with hover effects */}
      <section className="relative py-20 bg-zinc-50 dark:bg-zinc-900 border-t border-border overflow-hidden">
        <FloatingParticles count={8} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Deploy Anywhere</h2>
            <p className="text-lg text-muted-foreground">Supports all major deployment platforms</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {[
              { name: 'Vercel', gradient: 'from-blue-500 to-cyan-500' },
              { name: 'Netlify', gradient: 'from-teal-400 to-green-500' },
              { name: 'Cloudflare Pages', gradient: 'from-orange-400 to-red-500' },
              { name: 'Railway', gradient: 'from-violet-500 to-purple-500' },
            ].map((platform) => (
              <div
                key={platform.name}
                className={`relative px-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:scale-105 hover:shadow-glow transition-all duration-300 overflow-hidden group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${platform.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <span className="relative z-10">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with gradient background and animated border */}
      <section className="relative py-20 bg-zinc-900 dark:bg-zinc-950 overflow-hidden">
        <FloatingParticles count={10} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 p-1 overflow-hidden">
            <div className="rounded-xl bg-zinc-900 dark:bg-zinc-950 p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to ship faster?</h2>
              <p className="text-lg text-zinc-300 mb-6">Join developers who trust Deploy Agent for their deployment needs.</p>
               <Link href="/deploy" className="inline-block px-8 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors">Get Started for Free</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-zinc-900 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-violet-500">
                <span className="font-semibold text-white">D</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Deploy Agent</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 Deploy Agent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

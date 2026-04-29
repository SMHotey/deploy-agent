export const metadata = {
  title: 'Deploy Agent - Ship Code Faster',
  description:
    'One-click deployment from git repositories to Vercel, Netlify, and more. Built for modern teams.',
};

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-card text-muted-foreground">

      {/* Hero Section with animated gradient mesh background and staggered text */}
      <section id="hero" className="relative overflow-hidden pt-20 pb-40">
        {/* Animated gradient mesh background blobs */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 opacity-40 top-20 left-6 animate-float" />
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-blue-400 via-teal-400 to-green-400 opacity-40 top-0 right-16 rotate-12 animate-float" />
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 opacity-40 bottom-8 left-20 rotate-12 animate-float" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-500/40 opacity-40 animate-gradient" />
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
              href="/"
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
        </div>
      </section>

      {/* Background decoration preserved from original design */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section with glassmorphism cards */}
      <section id="features" className="py-20 bg-card dark:bg-zinc-950 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Everything you need to ship</h2>
            <p className="text-lg text-muted-foreground">Powerful features for modern deployment workflows</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: 'Instant Deploys',
                description:
                  'Deploy from any git repository with a single click. Supports GitHub, GitLab, and Bitbucket.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Secure by Default',
                description:
                  'AES-256-GCM encryption for all tokens and secrets. Rate limiting and secure headers included.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'Real-time Logs',
                description:
                  'Watch your deployments live with SSE streaming. Debug faster with instant feedback.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 7h8m-8 0l3-3 3 3m-3 16H4a2 2 0 01-2-2V7m16 0v16" />
                  </svg>
                ),
                title: '100+ Parameters',
                description:
                  'Full control over your deployments. Environment variables, build commands, custom domains, and more.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3l-5 2 5 9-5 9 5-2v-5" />
                  </svg>
                ),
                title: 'Multi-Platform',
                description:
                  'Deploy to Vercel, Netlify, Cloudflare Pages, or Railway. One tool for all platforms.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Analytics & Insights',
                description:
                  'Track deployment success rates, build times, and project health from your dashboard.',
              },
            ].map((feature, i) => (
              <div key={i} className="glass p-6 rounded-xl border border-border bg-card">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms Section with hover effects */}
      <section className="py-20 bg-card dark:bg-zinc-950 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Deploy Anywhere</h2>
            <p className="text-lg text-muted-foreground">Supports all major deployment platforms</p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {['Vercel', 'Netlify', 'Cloudflare Pages', 'Railway'].map((platform) => (
              <div
                key={platform}
                className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium hover:scale-105 hover:shadow-glow transition-all duration-300"
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with gradient background and animated border */}
      <section className="py-20 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 p-1 overflow-hidden">
            <div className="rounded-xl bg-card p-8 text-center">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Ready to ship faster?</h2>
              <p className="text-lg text-muted-foreground mb-6">Join developers who trust Deploy Agent for their deployment needs.</p>
               <Link href="/" className="inline-block px-8 py-3 rounded-lg bg-white text-blue-600 font-medium hover:bg-blue-50 transition-colors">Get Started for Free</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
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

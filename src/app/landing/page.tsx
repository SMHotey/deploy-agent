export const metadata = {
  title: 'Deploy Agent - Ship Code Faster',
  description: 'One-click deployment from git repositories to Vercel, Netlify, and more. Built for modern teams.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              Ship Code{' '}
              <span className="text-blue-600">Faster</span>
            </h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8 max-w-3xl mx-auto">
              One-click deployment from any git repository to Vercel, Netlify, Cloudflare Pages, and Railway. 
              Full configuration, zero hassle.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/"
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-lg"
              >
                Start Deploying
              </a>
              <a
                href="#features"
                className="px-8 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-lg"
              >
                Learn More
              </a>
            </div>

            {/* Social Proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                <span>Deploy in seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Everything you need to ship
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Powerful features for modern deployment workflows
            </p>
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
                description: 'Deploy from any git repository with a single click. Supports GitHub, GitLab, and Bitbucket.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Secure by Default',
                description: 'AES-256-GCM encryption for all tokens and secrets. Rate limiting and secure headers included.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ),
                title: 'Real-time Logs',
                description: 'Watch your deployments live with SSE streaming. Debug faster with instant feedback.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.428-1.977 2.904-3.254 5.73-3.254 2.828 0 5.323 1.277 5.323 4.213 0 1.868-1.465 3.317-3.677 4.149-1.422.536-2.603 1.15-2.603 2.776v.667c0 .552-.452 1-1.006 1H10.57c-.554 0-1.006-.448-1.006-1v-.667c0-1.627-1.18-2.24-2.602-2.776C5.757 8.03 4.292 6.58 4.292 4.713 4.292 1.777 6.787.5 9.615.5c2.826 0 5.302 1.277 5.73 3.254" />
                  </svg>
                ),
                title: '100+ Parameters',
                description: 'Full control over your deployments. Environment variables, build commands, custom domains, and more.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ),
                title: 'Multi-Platform',
                description: 'Deploy to Vercel, Netlify, Cloudflare Pages, or Railway. One tool for all platforms.',
              },
              {
                icon: (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: 'Analytics & Insights',
                description: 'Track deployment success rates, build times, and project health from your dashboard.',
              },
            ].map((feature, i) => (
              <div key={i} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Platforms */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Deploy Anywhere
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Supports all major deployment platforms
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {['Vercel', 'Netlify', 'Cloudflare Pages', 'Railway'].map((platform) => (
              <div
                key={platform}
                className="px-8 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium"
              >
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to ship faster?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join developers who trust Deploy Agent for their deployment needs.
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-lg"
          >
            Get Started for Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600">
                <span className="font-semibold text-white">D</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Deploy Agent
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              © 2026 Deploy Agent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

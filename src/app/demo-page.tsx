import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Deploy <span className="text-blue-600 dark:text-blue-400">Agent</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Modern deployment automation platform. Deploy your git repositories to Vercel, Netlify, Cloudflare Pages, and more with a single click.
          </p>
        </div>

        <Dashboard />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-blue-600 dark:text-blue-400 text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">One-Click Deploy</h3>
            <p className="text-gray-600 dark:text-gray-300">Deploy from GitHub, GitLab, or Bitbucket with full configuration support.</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-green-600 dark:text-green-400 text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Secure</h3>
            <p className="text-gray-600 dark:text-gray-300">AES-256-GCM encryption for all sensitive data. Rate limiting and audit logs.</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-purple-600 dark:text-purple-400 text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Real-Time Monitoring</h3>
            <p className="text-gray-600 dark:text-gray-300">Live deployment logs, status tracking, and performance metrics.</p>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ready to Start?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Connect your repository and deploy in minutes.
          </p>
          <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Get Started
          </button>
        </div>
      </main>
      
      <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Deploy Agent v0.1.0 • Modern deployment automation • Built with Next.js 16 & React 19</p>
        </div>
      </footer>
    </div>
  );
}
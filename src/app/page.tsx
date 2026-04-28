'use client';

import { useState, useEffect } from 'react';

interface DeployParams {
  repo_url: string;
  project_name?: string;
  target_platform?: string;
  branch?: string;
  build_command?: string;
}

interface DeployResult {
  deployment_id: string;
  status: string;
  url?: string;
  message?: string;
}

interface HealthStatus {
  status: string;
  checks: {
    app?: { status: string };
    database?: { status: string };
    redis?: { status: string };
    supabase?: { status: string };
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user?: { id: number; email: string; name: string };
  accessToken?: string;
}

function StatusCard({ name, status }: { name: string; status?: string }) {
  const getColor = () => {
    if (status === 'ok') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'not_configured') return 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getLabel = () => {
    if (status === 'ok') return 'Operational';
    if (status === 'not_configured') return 'Not configured';
    return 'Error';
  };

  return (
    <div className={`p-3 rounded-lg text-center ${getColor()}`}>
      <div className="text-sm font-medium">{name}</div>
      <div className="text-xs mt-1">{getLabel()}</div>
    </div>
  );
}

export default function Home() {
  const [params, setParams] = useState<DeployParams>({
    repo_url: '',
    project_name: '',
    target_platform: 'vercel',
    branch: 'main',
    build_command: '',
  });
  const [result, setResult] = useState<DeployResult | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);

  // Auth state
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [useSupabaseAuth, setUseSupabaseAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth();
    checkAuth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      console.error('Health check error:', err);
    } finally {
      setCheckingHealth(false);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuth({ isAuthenticated: true, user: data, accessToken: token });
      }
    } catch {
      // Not authenticated
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeployLoading(true);
    setDeployError(null);
    setResult(null);

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeployError(data.error || 'Deployment failed');
        return;
      }

      setResult(data);
    } catch (err: any) {
      setDeployError(err.message || 'Unknown error');
    } finally {
      setDeployLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body: any = {
        email: authEmail,
        password: authPassword,
        useSupabaseAuth,
      };

      if (authMode === 'register') {
        body.name = authName;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('accessToken', data.accessToken || data.supabaseToken || '');
      setAuth({
        isAuthenticated: true,
        user: data.user,
        accessToken: data.accessToken || data.supabaseToken,
      });
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuth({ isAuthenticated: false });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                Deploy Agent
              </h1>
              <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
                One-click deployment from git repositories
              </p>
            </div>
            <div className="flex gap-4 items-center">
              {auth.isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {auth.user?.name || auth.user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Login / Register
                </button>
              )}
              <a
                href="/settings/supabase"
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Supabase Settings
              </a>
              <a
                href="/settings/tokens"
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                API Tokens
              </a>
              <a
                href="/instructions"
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Instructions
              </a>
            </div>
          </div>
        </header>

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {authMode === 'login' ? 'Login' : 'Register'}
                </h2>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-200 text-sm">{authError}</p>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Password * (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-supabase-auth"
                    checked={useSupabaseAuth}
                    onChange={(e) => setUseSupabaseAuth(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700"
                  />
                  <label htmlFor="use-supabase-auth" className="text-sm text-zinc-700 dark:text-zinc-300">
                    Use Supabase Auth (requires Supabase settings configured)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {authLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Register')}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'register' : 'login');
                    setAuthError(null);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Repository URL *
            </label>
            <input
              type="url"
              required
              value={params.repo_url}
              onChange={(e) => setParams({ ...params, repo_url: e.target.value })}
              placeholder="https://github.com/owner/repo"
              title="URL of the Git repository to deploy (e.g., https://github.com/username/repo)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={params.project_name}
                onChange={(e) => setParams({ ...params, project_name: e.target.value })}
                placeholder="my-project"
                title="Optional: Custom project name (defaults to repository name)"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Platform
              </label>
              <select
                value={params.target_platform}
                onChange={(e) => setParams({ ...params, target_platform: e.target.value })}
                title="Select deployment platform (Vercel, Netlify, Cloudflare Pages, Railway)"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="vercel">Vercel</option>
                <option value="netlify">Netlify</option>
                <option value="cloudflare-pages">Cloudflare Pages</option>
                <option value="railway">Railway</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Branch
              </label>
              <input
                type="text"
                value={params.branch}
                onChange={(e) => setParams({ ...params, branch: e.target.value })}
                placeholder="main"
                title="Git branch to deploy (default: main)"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Build Command
              </label>
              <input
                type="text"
                value={params.build_command}
                onChange={(e) => setParams({ ...params, build_command: e.target.value })}
                placeholder="npm run build"
                title="Build command to run (e.g., npm run build, yarn build)"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={deployLoading}
            className="w-full py-3 px-6 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deployLoading ? 'Deploying...' : 'Deploy'}
          </button>
        </form>

        {deployError && (
          <div className="mt-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{deployError}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-green-800 dark:text-green-200 font-medium">
              {result.message || `Status: ${result.status}`}
            </p>
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-green-700 dark:text-green-300 underline"
              >
                {result.url}
              </a>
            )}
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              Deployment ID: {result.deployment_id}
            </p>
          </div>
        )}

        {health && (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              System Status
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatusCard name="App" status={health.checks.app?.status} />
              <StatusCard name="Database" status={health.checks.database?.status} />
              <StatusCard name="Redis" status={health.checks.redis?.status} />
              <StatusCard name="Supabase" status={health.checks.supabase?.status} />
            </div>
          </section>
        )}

        <section className="mt-16">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            API Usage
          </h2>
          <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`curl -X POST http://localhost:3000/api/deploy \\
  -H "Content-Type: application/json" \\
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "project_name": "my-app"
  }'`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Card as UiCard, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

type Tab = 'tokens' | 'supabase' | 'notifications';

interface TokenState {
  vercelToken: string;
  githubToken: string;
  netlifyToken: string;
  supabaseToken: string;
}

interface SupabaseConfig {
  exists: boolean;
  projectName?: string;
  url?: string;
  region?: string;
  plan?: string;
  hasAnonKey?: boolean;
  hasServiceRoleKey?: boolean;
  createdAt?: string;
}

const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-1', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU West (Ireland)' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
];

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'team', label: 'Team' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('tokens');

  // Auth
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tokens
  const [tokens, setTokens] = useState<TokenState>({
    vercelToken: '',
    githubToken: '',
    netlifyToken: '',
    supabaseToken: '',
  });
  const [savingTokens, setSavingTokens] = useState(false);

  // Supabase
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [supabaseForm, setSupabaseForm] = useState({
    projectName: '',
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    region: 'us-east-1',
    plan: 'free',
    dbPassword: '',
  });
  const [savingSupabase, setSavingSupabase] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState({
    slack: '',
    discord: '',
    email: '',
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Auth check + fetch data
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          router.push('/');
          return;
        }

        // Fetch tokens status
        const tokensRes = await fetch('/api/auth/tokens', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tokensRes.ok) {
          const data = await tokensRes.json();
          setTokens({
            vercelToken: data.vercelToken ? '••••••••' : '',
            githubToken: data.githubToken ? '••••••••' : '',
            netlifyToken: data.netlifyToken ? '••••••••' : '',
            supabaseToken: data.supabaseToken ? '••••••••' : '',
          });
        }

        // Fetch Supabase config
        const supabaseRes = await fetch('/api/config/supabase');
        if (supabaseRes.ok) {
          const data = await supabaseRes.json();
          setSupabaseConfig(data);
          if (data.exists) {
            setSupabaseForm((prev) => ({
              ...prev,
              projectName: data.projectName || '',
              url: data.url || '',
              region: data.region || 'us-east-1',
              plan: data.plan || 'free',
            }));
          }
        }
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Token retrieval moved to useAuth() hook. Do not access localStorage directly.

  const handleSaveTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTokens(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, string> = {};
      if (tokens.vercelToken && tokens.vercelToken !== '••••••••') body.vercelToken = tokens.vercelToken;
      if (tokens.githubToken && tokens.githubToken !== '••••••••') body.githubToken = tokens.githubToken;
      if (tokens.netlifyToken && tokens.netlifyToken !== '••••••••') body.netlifyToken = tokens.netlifyToken;
      if (tokens.supabaseToken && tokens.supabaseToken !== '••••••••') body.supabaseToken = tokens.supabaseToken;

      if (Object.keys(body).length === 0) {
        toast.info('No changes to save');
        return;
      }

      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save tokens');
      toast.success('Tokens saved successfully!');
      setTokens((prev) => {
        const updated = { ...prev };
        Object.keys(body).forEach((key) => {
          updated[key as keyof TokenState] = '••••••••';
        });
        return updated;
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingTokens(false);
    }
  };

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupabase(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/config/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...supabaseForm,
          serviceRoleKey: supabaseForm.serviceRoleKey || undefined,
          dbPassword: supabaseForm.dbPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config');

      toast.success('Supabase configuration saved!');
      setSupabaseForm((prev) => ({
        ...prev,
        anonKey: '',
        serviceRoleKey: '',
        dbPassword: '',
      }));

      const configRes = await fetch('/api/config/supabase');
      if (configRes.ok) {
        const configData = await configRes.json();
        setSupabaseConfig(configData);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingSupabase(false);
    }
  };

  const handleDeleteSupabase = async () => {
    if (!confirm('Delete Supabase configuration?')) return;

    try {
      const res = await fetch('/api/config/supabase', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete config');

      setSupabaseConfig(null);
      setSupabaseForm({
        projectName: '',
        url: '',
        anonKey: '',
        serviceRoleKey: '',
        region: 'us-east-1',
        plan: 'free',
        dbPassword: '',
      });
      setSuccess('Configuration deleted');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const testConnection = async () => {
    setTestingConn(true);
    setTestResult(null);

    try {
      const res = await fetch(`${supabaseForm.url}/rest/v1/`, {
        headers: { apikey: supabaseForm.anonKey, Authorization: `Bearer ${supabaseForm.anonKey}` },
      });

      if (res.ok) {
        setTestResult({ success: true, message: 'Connection successful! Supabase is reachable.' });
      } else {
        setTestResult({ success: false, message: `Connection failed: ${res.status} ${res.statusText}` });
      }
    } catch (err: unknown) {
      setTestResult({ success: false, message: `Connection error: ${err instanceof Error ? err.message : 'Unknown'}` });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifications(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement notifications API endpoint
      setSuccess('Notification settings saved (demo mode)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <SkeletonCard />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'tokens', label: 'API Tokens', icon: '🔑' },
    { id: 'supabase', label: 'Supabase', icon: '🟢' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Manage API tokens, integrations, and notifications</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-700 mb-8">
          <nav className="-mb-px flex gap-6" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <form onSubmit={handleSaveTokens} className="space-y-6">
            <UiCard>
              <CardHeader>
                <CardTitle>API Tokens</CardTitle>
                <CardDescription>Secure tokens for connecting to external platforms. All tokens are encrypted with AES-256-GCM.</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <TokenField
                  label="Vercel Token"
                  value={tokens.vercelToken}
                  onChange={(v) => setTokens((prev) => ({ ...prev, vercelToken: v }))}
                  hint="Get it from vercel.com/account/tokens"
                  href="https://vercel.com/account/tokens"
                  linkText="vercel.com/account/tokens"
                />
                <TokenField
                  label="GitHub Token"
                  value={tokens.githubToken}
                  onChange={(v) => setTokens((prev) => ({ ...prev, githubToken: v }))}
                  hint="Create at github.com/settings/tokens (need 'repo' scope)"
                  href="https://github.com/settings/tokens"
                  linkText="github.com/settings/tokens"
                />
                <TokenField
                  label="Netlify Token"
                  value={tokens.netlifyToken}
                  onChange={(v) => setTokens((prev) => ({ ...prev, netlifyToken: v }))}
                  hint="Get it from app.netlify.com/user/applications"
                  href="https://app.netlify.com/user/applications"
                  linkText="app.netlify.com/user/applications"
                />
                <TokenField
                  label="Supabase Token (optional)"
                  value={tokens.supabaseToken}
                  onChange={(v) => setTokens((prev) => ({ ...prev, supabaseToken: v }))}
                  hint="Found in Supabase Project Settings → API"
                  isOptional
                />
              </div>
              </CardContent>
            </UiCard>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingTokens}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingTokens ? 'Saving...' : 'Save Tokens'}
              </button>
            </div>
          </form>
        )}

        {/* Supabase Tab */}
        {activeTab === 'supabase' && (
          <form onSubmit={handleSaveSupabase} className="space-y-6">
            {supabaseConfig?.exists && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Current Configuration</h3>
                <div className="text-sm text-blue-800 dark:text-blue-200 grid grid-cols-2 gap-1">
                  <p><strong>Project:</strong> {supabaseConfig.projectName}</p>
                  <p><strong>URL:</strong> {supabaseConfig.url}</p>
                  <p><strong>Region:</strong> {supabaseConfig.region}</p>
                  <p><strong>Plan:</strong> {supabaseConfig.plan}</p>
                  <p><strong>Anon Key:</strong> {supabaseConfig.hasAnonKey ? 'Configured ✅' : 'Not set ❌'}</p>
                  <p><strong>Service Role:</strong> {supabaseConfig.hasServiceRoleKey ? 'Configured ✅' : 'Not set ❌'}</p>
                </div>
              </div>
            )}

            <UiCard>
              <CardHeader>
                <CardTitle>Supabase Connection</CardTitle>
                <CardDescription>Connect your Supabase project for database and authentication support.</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!supabaseConfig?.exists}
                    value={supabaseForm.projectName}
                    onChange={(e) => setSupabaseForm((prev) => ({ ...prev, projectName: e.target.value }))}
                    placeholder="my-supabase-project"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Supabase URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    required={!supabaseConfig?.exists}
                    value={supabaseForm.url}
                    onChange={(e) => setSupabaseForm((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://xyz.supabase.co"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Anon Key (public) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required={!supabaseConfig?.exists}
                    value={supabaseForm.anonKey}
                    onChange={(e) => setSupabaseForm((prev) => ({ ...prev, anonKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                  {supabaseConfig?.exists && !supabaseForm.anonKey && (
                    <p className="mt-1 text-xs text-zinc-500">Leave empty to keep current key</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Service Role Key (optional)
                  </label>
                  <input
                    type="password"
                    value={supabaseForm.serviceRoleKey}
                    onChange={(e) => setSupabaseForm((prev) => ({ ...prev, serviceRoleKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-zinc-500">Only needed for admin operations</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Region</label>
                    <select
                      value={supabaseForm.region}
                      onChange={(e) => setSupabaseForm((prev) => ({ ...prev, region: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Plan</label>
                    <select
                      value={supabaseForm.plan}
                      onChange={(e) => setSupabaseForm((prev) => ({ ...prev, plan: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {PLANS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Database Password (optional)
                  </label>
                  <input
                    type="password"
                    value={supabaseForm.dbPassword}
                    onChange={(e) => setSupabaseForm((prev) => ({ ...prev, dbPassword: e.target.value }))}
                    placeholder="Your Supabase database password"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              </CardContent>
            </UiCard>

            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}>
                <p className="text-sm">{testResult.message}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={testConnection}
                disabled={testingConn || !supabaseForm.url || !supabaseForm.anonKey}
                className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {testingConn ? 'Testing...' : 'Test Connection'}
              </button>
              {supabaseConfig?.exists && (
                <button
                  type="button"
                  onClick={handleDeleteSupabase}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                disabled={savingSupabase}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingSupabase ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleSaveNotifications} className="space-y-6">
            <UiCard>
              <CardHeader>
                <CardTitle>Notification Channels</CardTitle>
                <CardDescription>Get alerts when deployments complete or fail.</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Notifications
                  </label>
                  <input
                    type="email"
                    value={notifications.email}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Slack Webhook URL
                  </label>
                  <input
                    type="url"
                    value={notifications.slack}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, slack: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/T00/B00/xxx"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Discord Webhook URL
                  </label>
                  <input
                    type="url"
                    value={notifications.discord}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, discord: e.target.value }))}
                    placeholder="https://discord.com/api/webhooks/xxx/yyy"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                  />
                </div>
              </div>
              </CardContent>
            </UiCard>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingNotifications}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingNotifications ? 'Saving...' : 'Save Notifications'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Removed legacy Card wrapper to favor UiCard usage from design system

function TokenField({ label, value, onChange, hint, href, linkText, isOptional }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
  href?: string;
  linkText?: string;
  isOptional?: boolean;
}) {
  const isConfigured = value === '••••••••';
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          {label} {isOptional && <span className="text-zinc-400">(optional)</span>}
          {isConfigured && <span className="ml-2 text-xs text-green-600 dark:text-green-400">✅ Configured</span>}
        </label>
      </div>
      <Input label={label} type="password" value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="mt-1 text-xs text-zinc-500">{href ? (
        <>Get it from <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{linkText}</a></>
      ) : (
        hint
      )}</p>
    </div>
  );
}

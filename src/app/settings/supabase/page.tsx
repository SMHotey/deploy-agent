'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function SupabaseSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SupabaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [plan, setPlan] = useState('free');
  const [dbPassword, setDbPassword] = useState('');

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config/supabase');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      setConfig(data);
      
      if (data.exists) {
        setProjectName(data.projectName || '');
        setUrl(data.url || '');
        setRegion(data.region || 'us-east-1');
        setPlan(data.plan || 'free');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/config/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          url,
          anonKey,
          serviceRoleKey: serviceRoleKey || undefined,
          region,
          plan,
          dbPassword: dbPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save config');
      }

      setSuccess('Supabase configuration saved successfully!');
      setAnonKey('');
      setServiceRoleKey('');
      setDbPassword('');
      fetchConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the Supabase configuration?')) return;

    try {
      const res = await fetch('/api/config/supabase', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete config');
      
      setConfig(null);
      setProjectName('');
      setUrl('');
      setAnonKey('');
      setServiceRoleKey('');
      setRegion('us-east-1');
      setPlan('free');
      setDbPassword('');
      setSuccess('Configuration deleted');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Simple test: check if we can reach the URL
      const testClient = await fetch(`${url}/rest/v1/`, {
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
      });

      if (testClient.ok) {
        setTestResult({ success: true, message: 'Connection successful! Supabase is reachable.' });
      } else {
        setTestResult({ success: false, message: `Connection failed: ${testClient.status} ${testClient.statusText}` });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Connection error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Supabase Configuration
            </h1>
          </div>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Configure your Supabase project for database and authentication
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {config?.exists && (
          <div className="mb-6 p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Current Configuration</h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p><strong>Project:</strong> {config.projectName}</p>
              <p><strong>URL:</strong> {config.url}</p>
              <p><strong>Region:</strong> {config.region}</p>
              <p><strong>Plan:</strong> {config.plan}</p>
              <p><strong>Anon Key:</strong> {config.hasAnonKey ? 'Configured ✅' : 'Not set ❌'}</p>
              <p><strong>Service Role Key:</strong> {config.hasServiceRoleKey ? 'Configured ✅' : 'Not set ❌'}</p>
              <p><strong>Created:</strong> {new Date(config.createdAt!).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="my-supabase-project"
              title="Your Supabase project name (found in project settings)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Supabase URL *
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              title="Your Supabase project URL (found in project settings → API)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Anon Key * (public)
            </label>
            <input
              type="password"
              required={!config?.exists}
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              title="Your Supabase anon/public key (found in project settings → API → Project API keys)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {config?.exists && !anonKey && (
              <p className="mt-1 text-sm text-zinc-500">Leave empty to keep current key</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Service Role Key (optional, for admin operations)
            </label>
            <input
              type="password"
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              title="Your Supabase service_role key (found in project settings → API → Project API keys) - gives full admin access"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-zinc-500">Only needed for admin operations like managing users</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                title="Supabase project region"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-1">US West (Oregon)</option>
                <option value="eu-west-1">EU West (Ireland)</option>
                <option value="eu-central-1">EU Central (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                title="Supabase plan"
                className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="team">Team</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Database Password (optional, encrypted storage)
            </label>
            <input
              type="password"
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
              placeholder="Your Supabase database password"
              title="Database password for direct connections (will be encrypted before storage)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {testResult && (
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              <p className={testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                {testResult.message}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || !url || !anonKey}
              className="px-6 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            {config?.exists && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </form>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            How to get your Supabase credentials
          </h2>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">1. Create a Supabase project</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">supabase.com</a> and create a new project if you haven't already.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">2. Get your Project URL</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                In your Supabase dashboard, go to <strong>Project Settings → API</strong>. Copy the "URL" value.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">3. Get your API Keys</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Still in <strong>Project Settings → API</strong>, copy the "anon/public" key (required) and optionally the "service_role" key (for admin operations).
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">4. Save configuration</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Paste these values into the form above and click "Save Configuration". The keys will be stored encrypted in your database.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

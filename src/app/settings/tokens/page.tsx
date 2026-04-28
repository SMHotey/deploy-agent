'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TokenState {
  vercelToken: string;
  githubToken: string;
  supabaseToken: string;
}

export default function TokensSettingsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<TokenState>({
    vercelToken: '',
    githubToken: '',
    supabaseToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch tokens');
      }

      // We can't read encrypted tokens from the frontend directly
      // But we can show if they're configured in the backend
      setTokens({
        vercelToken: '••••••••', // Masked for security
        githubToken: '••••••••',
        supabaseToken: '••••••••',
      });
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
      const body: any = {};

      if (tokens.vercelToken && tokens.vercelToken !== '••••••••') {
        body.vercelToken = tokens.vercelToken;
      }

      if (tokens.githubToken && tokens.githubToken !== '••••••••') {
        body.githubToken = tokens.githubToken;
      }

      if (tokens.supabaseToken && tokens.supabaseToken !== '••••••••') {
        body.supabaseToken = tokens.supabaseToken;
      }

      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save tokens');
      }

      setSuccess('Tokens saved successfully!');
      setTokens({
        vercelToken: '••••••••',
        githubToken: '••••••••',
        supabaseToken: '••••••••',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
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
              API Tokens
            </h1>
          </div>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Manage your Vercel, GitHub, and Supabase tokens
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

        <form onSubmit={handleSave} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Vercel Token
            </label>
            <input
              type="password"
              value={tokens.vercelToken}
              onChange={(e) => setTokens({ ...tokens, vercelToken: e.target.value })}
              placeholder="Enter new Vercel token (leave masked to keep current)"
              title="Your Vercel API token (get it from https://vercel.com/account/tokens)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-zinc-500">
              Get it from <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">vercel.com/account/tokens</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              GitHub Token
            </label>
            <input
              type="password"
              value={tokens.githubToken}
              onChange={(e) => setTokens({ ...tokens, githubToken: e.target.value })}
              placeholder="Enter new GitHub token (leave masked to keep current)"
              title="GitHub Personal Access Token with 'repo' scope (get it from GitHub Settings)"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-zinc-500">
              Create one at <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">github.com/settings/tokens</a> (need 'repo' scope)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Supabase Token (optional)
            </label>
            <input
              type="password"
              value={tokens.supabaseToken}
              onChange={(e) => setTokens({ ...tokens, supabaseToken: e.target.value })}
              placeholder="Enter new Supabase token (leave masked to keep current)"
              title="Supabase service_role key for admin operations"
              className="w-full px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-zinc-500">
              Your Supabase service_role key (found in Project Settings → API)
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Tokens'}
          </button>
        </form>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            How to get your tokens
          </h2>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">1. Vercel Token</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Go to <strong>Vercel Dashboard → Settings → Tokens</strong>, create a new token with full account access.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">2. GitHub Token</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Go to <strong>GitHub → Settings → Developer settings → Personal access tokens</strong>, generate a new token with <code>repo</code> scope.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">3. Supabase Token (optional)</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                In your <strong>Supabase project → Project Settings → API</strong>, copy the <code>service_role</code> key. Only needed for admin operations.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2">4. Save tokens</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Paste the tokens above and click "Save Tokens". All tokens are encrypted with AES-256-GCM before storage.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

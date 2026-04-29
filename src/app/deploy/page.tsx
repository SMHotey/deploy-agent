'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

type DeployStep = 'basic' | 'env' | 'advanced' | 'deploying' | 'success' | 'error';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

interface DeployForm {
  repo_url: string;
  project_name: string;
  target_platform: 'vercel' | 'netlify' | 'cloudflare-pages' | 'railway';
  branch: string;
  root_directory: string;
  framework_preset: string;
  build_command: string;
  install_command: string;
  output_directory: string;
  environment_variables: Record<string, string>;
  create_supabase_project: boolean;
  supabase_region: string;
  setup_github_actions: boolean;
  trigger_branches: string;
  preview_for_pr: boolean;
  custom_domain: string;
  notification_email: string;
  notification_slack: string;
  wait_for_completion: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_FORM: DeployForm = {
  repo_url: '',
  project_name: '',
  target_platform: 'vercel',
  branch: 'main',
  root_directory: '/',
  framework_preset: '',
  build_command: '',
  install_command: '',
  output_directory: '',
  environment_variables: {},
  create_supabase_project: false,
  supabase_region: 'us-east-1',
  setup_github_actions: true,
  trigger_branches: 'main, master',
  preview_for_pr: true,
  custom_domain: '',
  notification_email: '',
  notification_slack: '',
  wait_for_completion: false,
  log_level: 'info',
};

const PLATFORMS = [
  { value: 'vercel', label: 'Vercel', color: 'bg-zinc-900 text-white' },
  { value: 'netlify', label: 'Netlify', color: 'bg-green-600 text-white' },
  { value: 'cloudflare-pages', label: 'Cloudflare Pages', color: 'bg-orange-500 text-white' },
  { value: 'railway', label: 'Railway', color: 'bg-violet-600 text-white' },
] as const;

const FRAMEWORKS = [
  { value: '', label: 'Auto-detect' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'astro', label: 'Astro' },
  { value: 'other', label: 'Other' },
];

export default function NewDeploymentPage() {
  const router = useRouter();
  const [step, setStep] = useState<DeployStep>('basic');
  const [form, setForm] = useState<DeployForm>(DEFAULT_FORM);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [userTokens, setUserTokens] = useState<{ vercelToken: boolean; githubToken: boolean }>({
    vercelToken: false,
    githubToken: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
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

      // Check if user has tokens configured
      const tokensRes = await fetch('/api/auth/tokens', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tokensRes.ok) {
        const tokens = await tokensRes.json();
        setUserTokens({
          vercelToken: !!tokens.vercelToken,
          githubToken: !!tokens.githubToken,
        });
      }
    } catch {
      router.push('/');
    }
  };

  const updateForm = (field: keyof DeployForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addEnvVar = () => {
    setEnvVars((prev) => [...prev, { key: '', value: '', isSecret: true }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: keyof EnvVar, value: string | boolean) => {
    setEnvVars((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('deploying');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
      return;
    }

    // Build environment variables map
    const envMap: Record<string, string> = { ...form.environment_variables };
    for (const env of envVars) {
      if (env.key.trim()) {
        envMap[env.key.trim()] = env.value;
      }
    }

    // Build payload — only send non-default values to keep it clean
    const payload: Record<string, unknown> = {
      repo_url: form.repo_url,
      project_name: form.project_name || undefined,
      target_platform: form.target_platform,
      branch: form.branch || 'main',
      root_directory: form.root_directory || '/',
      wait_for_completion: form.wait_for_completion,
    };

    if (form.framework_preset) payload.framework_preset = form.framework_preset;
    if (form.build_command) payload.build_command = form.build_command;
    if (form.install_command) payload.install_command = form.install_command;
    if (form.output_directory) payload.output_directory = form.output_directory;
    if (Object.keys(envMap).length > 0) payload.environment_variables = envMap;
    if (form.create_supabase_project) {
      payload.create_supabase_project = true;
      payload.supabase_region = form.supabase_region;
    }
    if (!form.setup_github_actions) payload.setup_github_actions = false;
    if (form.trigger_branches !== 'main, master') {
      payload.trigger_branches = form.trigger_branches.split(',').map((b) => b.trim()).filter(Boolean);
    }
    if (!form.preview_for_pr) payload.preview_for_pr = false;
    if (form.custom_domain) payload.custom_domain = form.custom_domain;
    if (form.notification_email) payload.notification_email = form.notification_email;
    if (form.notification_slack) payload.notification_slack = form.notification_slack;
    if (form.log_level !== 'info') payload.log_level = form.log_level;

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setDeploymentId(data.deployment_id);
      setDeployUrl(data.url);
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
      setStep('error');
    }
  };

  const getTokenWarning = () => {
    const warnings: string[] = [];
    if (!userTokens.vercelToken) warnings.push('Vercel token not configured');
    return warnings;
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-50">Deployment Started</CardTitle>
              <CardDescription>Your deployment is being processed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {deploymentId && (
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                  {deploymentId}
                </div>
              )}
              {deployUrl && (
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Visit deployment →
                </a>
              )}
              <div className="flex gap-4 justify-center pt-4">
                {deploymentId && (
                  <Link
                    href={`/deploy/${deploymentId}`}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Logs
                  </Link>
                )}
                <Link
                  href="/projects"
                  className="px-6 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to Projects
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-zinc-900 dark:text-zinc-50">Deployment Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-left">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
              <div className="flex gap-4 justify-center pt-4">
                <button
                  onClick={() => setStep('basic')}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <Link
                  href="/projects"
                  className="px-6 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Back to Projects
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tokenWarnings = getTokenWarning();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">New Deployment</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Configure and launch a new deployment</p>
        </div>

        {tokenWarnings.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Configuration needed</p>
                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {tokenWarnings.map((w) => (
                    <li key={w}>
                      {w}.{' '}
                      <Link href="/settings/tokens" className="underline hover:text-yellow-900 dark:hover:text-yellow-100">
                        Configure tokens →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Basic Settings</CardTitle>
              <CardDescription>Repository and platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Repository URL */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Repository URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={form.repo_url}
                  onChange={(e) => updateForm('repo_url', e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) => updateForm('project_name', e.target.value)}
                  placeholder="my-project (auto-generated from repo if empty)"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Target Platform
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateForm('target_platform', p.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                        form.target_platform === p.value
                          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                          : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.color}`}>
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Branch + Root Directory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={(e) => updateForm('branch', e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Root Directory
                  </label>
                  <input
                    type="text"
                    value={form.root_directory}
                    onChange={(e) => updateForm('root_directory', e.target.value)}
                    placeholder="/"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environment Variables */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Environment Variables</CardTitle>
              <CardDescription>Key-value pairs passed to your deployment</CardDescription>
            </CardHeader>
            <CardContent>
              {envVars.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                  No environment variables added. Click below to add one.
                </div>
              ) : (
                <div className="space-y-3">
                  {envVars.map((env, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={env.key}
                        onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                        placeholder="KEY"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm font-mono"
                      />
                      <input
                        type={env.isSecret ? 'password' : 'text'}
                        value={env.value}
                        onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                        placeholder="value"
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => updateEnvVar(index, 'isSecret', !env.isSecret)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                          env.isSecret
                            ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        }`}
                        title={env.isSecret ? 'Secret (hidden)' : 'Visible'}
                      >
                        {env.isSecret ? '🔒' : '👁'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEnvVar(index)}
                        className="px-2 py-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addEnvVar}
                className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                + Add Environment Variable
              </button>
            </CardContent>
          </Card>

          {/* Advanced Settings (collapsible) */}
          <Card className="mb-6">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-left"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Advanced Settings</CardTitle>
                    <CardDescription>Framework, build, notifications, and more</CardDescription>
                  </div>
                  <svg
                    className={`h-5 w-5 text-zinc-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </CardHeader>
            </button>
            {showAdvanced && (
              <CardContent className="space-y-6">
                {/* Build Configuration */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Build Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Framework Preset
                      </label>
                      <select
                        value={form.framework_preset}
                        onChange={(e) => updateForm('framework_preset', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        {FRAMEWORKS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Build Command
                        </label>
                        <input
                          type="text"
                          value={form.build_command}
                          onChange={(e) => updateForm('build_command', e.target.value)}
                          placeholder="npm run build"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Install Command
                        </label>
                        <input
                          type="text"
                          value={form.install_command}
                          onChange={(e) => updateForm('install_command', e.target.value)}
                          placeholder="npm install"
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Output Directory
                      </label>
                      <input
                        type="text"
                        value={form.output_directory}
                        onChange={(e) => updateForm('output_directory', e.target.value)}
                        placeholder=".next"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Supabase */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Supabase</h3>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.create_supabase_project}
                      onChange={(e) => updateForm('create_supabase_project', e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">Create Supabase project</span>
                  </label>
                  {form.create_supabase_project && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Region
                      </label>
                      <input
                        type="text"
                        value={form.supabase_region}
                        onChange={(e) => updateForm('supabase_region', e.target.value)}
                        placeholder="us-east-1"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* GitHub Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">GitHub Actions</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.setup_github_actions}
                        onChange={(e) => updateForm('setup_github_actions', e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Setup GitHub Actions CI/CD</span>
                    </label>
                    {form.setup_github_actions && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Trigger Branches (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={form.trigger_branches}
                            onChange={(e) => updateForm('trigger_branches', e.target.value)}
                            placeholder="main, master"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm font-mono"
                          />
                        </div>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={form.preview_for_pr}
                            onChange={(e) => updateForm('preview_for_pr', e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">Preview deployments for PRs</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Domain */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Custom Domain</h3>
                  <input
                    type="text"
                    value={form.custom_domain}
                    onChange={(e) => updateForm('custom_domain', e.target.value)}
                    placeholder="app.example.com"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                  />
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Notifications</h3>
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={form.notification_email}
                      onChange={(e) => updateForm('notification_email', e.target.value)}
                      placeholder="notification@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                    />
                    <input
                      type="url"
                      value={form.notification_slack}
                      onChange={(e) => updateForm('notification_slack', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Deployment Options */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Deployment Options</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form.wait_for_completion}
                        onChange={(e) => updateForm('wait_for_completion', e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Wait for deployment to complete</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Log Level
                      </label>
                      <select
                        value={form.log_level}
                        onChange={(e) => updateForm('log_level', e.target.value as DeployForm['log_level'])}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link
              href="/projects"
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              loading={step === 'deploying'}
              disabled={step === 'deploying'}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {step === 'deploying' ? 'Deploying...' : 'Deploy Now'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

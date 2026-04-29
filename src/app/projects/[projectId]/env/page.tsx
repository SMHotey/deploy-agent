'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface EnvVar {
  id: number;
  key: string;
  value?: string;
  isSecret: boolean;
  createdAt: string;
}

export default function ProjectEnvVarsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { success, error: toastError } = useToast();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newIsSecret, setNewIsSecret] = useState(true);
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  const projectId = params.projectId as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (!user || !projectId) return;
    fetchEnvVars();
  }, [projectId, user, authLoading]);

  const fetchEnvVars = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch environment variables');
      const data = await res.json();
      setEnvVars(data.envVars || []);

      // Get project name from projects list
      const projRes = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (projRes.ok) {
        const projData = await projRes.json();
        const project = projData.projects?.find((p: any) => p.id === parseInt(projectId));
        if (project) setProjectName(project.name);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load environment variables');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const token = getToken();
    if (!token) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: newKey.trim(), value: newValue.trim(), isSecret: newIsSecret }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add variable');
      }
      success(`Variable "${newKey.trim()}" added`);
      setNewKey('');
      setNewValue('');
      await fetchEnvVars();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to add variable');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number, key: string) => {
    if (!confirm(`Delete "${key}"? This action cannot be undone.`)) return;

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete variable');
      }
      success(`Variable "${key}" deleted`);
      await fetchEnvVars();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete variable');
    }
  };

  const handleFetchValue = async (envVar: EnvVar) => {
    if (expandedId === envVar.id) {
      setExpandedId(null);
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars/${envVar.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch value');
      const data = await res.json();
      setExpandedId(envVar.id);
      setEditValue(data.value);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to reveal value');
    }
  };

  const handleUpdate = async (envVar: EnvVar) => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: envVar.key, value: editValue, isSecret: envVar.isSecret }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update variable');
      }
      success(`Variable "${envVar.key}" updated`);
      setEditingId(null);
      setExpandedId(null);
      await fetchEnvVars();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update variable');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Environment Variables
            </h1>
          </div>
          {projectName && (
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              For project: <span className="font-medium">{projectName}</span>
            </p>
          )}
        </header>

        {/* Add new variable */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Add Variable</CardTitle>
            <CardDescription>All values are encrypted with AES-256-GCM</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Key"
                  placeholder="DATABASE_URL"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                />
                <Input
                  label="Value"
                  type="password"
                  placeholder="postgres://..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={newIsSecret}
                    onChange={(e) => setNewIsSecret(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                  Secret (hidden in logs)
                </label>
                <Button type="submit" disabled={adding || !newKey.trim() || !newValue.trim()}>
                  {adding ? 'Adding...' : 'Add Variable'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Variables list */}
        {envVars.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">🔐</p>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No environment variables
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Add your first variable above to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {envVars.map((envVar) => (
              <Card key={envVar.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <code className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {envVar.key}
                      </code>
                      {envVar.isSecret && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          Secret
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedId === envVar.id ? (
                        <>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 w-64"
                          />
                          <Button size="sm" onClick={() => handleUpdate(envVar)} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleFetchValue(envVar)}>
                            {expandedId === envVar.id ? 'Hide' : 'Reveal'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(envVar.id, envVar.key)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Added {new Date(envVar.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

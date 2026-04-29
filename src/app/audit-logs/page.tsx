'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface AuditLog {
  id: number;
  projectId: number;
  userId: number | null;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  webhook_deploy_triggered: '🔄 Webhook Deploy',
  deployment_status_updated: '📊 Status Updated',
  env_var_created: '🔐 Env Var Added',
  env_var_updated: '✏️ Env Var Updated',
  env_var_deleted: '🗑️ Env Var Deleted',
  project_created: '📦 Project Created',
  project_deleted: '🗑️ Project Deleted',
  deploy_started: '🚀 Deploy Started',
  deploy_completed: '✅ Deploy Completed',
  deploy_failed: '❌ Deploy Failed',
};

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (!user) return;
    fetchLogs();
  }, [user, authLoading, filterAction, filterProjectId, page]);

  const fetchLogs = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterAction) params.set('action', filterAction);
      if (filterProjectId) params.set('project_id', filterProjectId);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      setLogs(data.auditLogs || []);
      setTotal(data.total || 0);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <SkeletonCard />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Audit Logs
              </h1>
              <p className="mt-1 text-lg text-zinc-600 dark:text-zinc-400">
                Track all deployment and configuration changes
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">← Dashboard</Button>
            </Link>
          </div>
        </header>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Filter by action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All actions</option>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Project ID
                </label>
                <input
                  type="number"
                  value={filterProjectId}
                  onChange={(e) => { setFilterProjectId(e.target.value); setPage(1); }}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">📋</p>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No audit logs found
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Logs will appear here when deployments and configuration changes occur
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        {log.ipAddress === 'webhook' && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            Webhook
                          </span>
                        )}
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Project #{log.projectId}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

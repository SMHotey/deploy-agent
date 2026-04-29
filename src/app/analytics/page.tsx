'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  summary: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    successRate: number;
    errorRate: number;
    avgBuildTimeSeconds: number;
  };
  byPlatform: { platform: string; count: number; percentage: number }[];
  byStatus: { status: string; count: number; percentage: number }[];
  dailyTrend: { date: string; total: number; successful: number; failed: number }[];
  topProjects: { id: number; name: string; platform: string; deployments: number; lastDeployed: string }[];
  byType: { preview: number; production: number };
}

export default function AnalyticsPage() {
  const auth = useAuth();
  const { user, isLoading: authLoading, getToken } = auth;
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // Simple animated number hook for counters
  const AnimatedNumber = ({ value }: { value: number }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
      let raf = 0;
      const duration = 900;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setN(Math.floor(p * value));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [value]);
    return <span>{n.toLocaleString()}</span>;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, days]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">No analytics data available</div>
      </div>
    );
  }

  const maxDailyCount = Math.max(...data.dailyTrend.map((d) => d.total), 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 animate-fade-in-up">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Analytics
            </h1>
            <div className="flex gap-2">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    days === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Deployment metrics and trends
          </p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total" value={<AnimatedNumber value={data.summary.totalDeployments} />} />
          <StatCard label="Success Rate" value={<span><AnimatedNumber value={Math.round(data.summary.successRate)} />%</span>} accent="green" />
          <StatCard label="Successful" value={<AnimatedNumber value={data.summary.successfulDeployments} />} accent="green" />
          <StatCard label="Failed" value={<AnimatedNumber value={data.summary.failedDeployments} />} accent="red" />
          <StatCard label="Error Rate" value={<span><AnimatedNumber value={Math.round(data.summary.errorRate)} />%</span>} accent="red" />
          <StatCard label="Avg Build" value={<AnimatedNumber value={data.summary.avgBuildTimeSeconds} />} accent="blue" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Trend Chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Daily Deployments
            </h2>
            <div className="flex items-end gap-1 h-40">
              {data.dailyTrend.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[20px]">
                  <div className="w-full flex flex-col-reverse gap-px" style={{ height: '120px' }}>
                    <div
                      className="bg-green-500 rounded-sm min-h-[2px]"
                      style={{ height: `${(day.successful / maxDailyCount) * 100}%` }}
                      title={`Success: ${day.successful}`}
                    />
                    <div
                      className="bg-red-500 rounded-sm min-h-[2px]"
                      style={{ height: `${(day.failed / maxDailyCount) * 100}%` }}
                      title={`Failed: ${day.failed}`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate w-full text-center">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            {data.dailyTrend.length === 0 && (
              <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                No deployment data for this period
              </div>
            )}
          </div>

          {/* Platform Distribution */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              By Platform
            </h2>
            <div className="space-y-3">
              {data.byPlatform.map((p) => (
                <div key={p.platform}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                      {p.platform}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {p.count} ({p.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {data.byPlatform.length === 0 && (
                <div className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                  No platform data available
                </div>
              )}
            </div>

            {/* Preview vs Production */}
            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Preview vs Production
              </h3>
              <div className="flex gap-2 h-6 rounded-full overflow-hidden">
                {data.byType.production > 0 && (
                  <div
                    className="bg-indigo-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${((data.byType.production) / (data.byType.production + data.byType.preview || 1)) * 100}%` }}
                  >
                    Prod {data.byType.production}
                  </div>
                )}
                {data.byType.preview > 0 && (
                  <div
                    className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${((data.byType.preview) / (data.byType.production + data.byType.preview || 1)) * 100}%` }}
                  >
                    Preview {data.byType.preview}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution + Top Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              By Status
            </h2>
            <div className="space-y-3">
              {data.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot status={s.status} />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                      {s.status}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {s.count} ({s.percentage}%)
                  </span>
                </div>
              ))}
              {data.byStatus.length === 0 && (
                <div className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                  No status data available
                </div>
              )}
            </div>
          </div>

          {/* Top Projects */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Top Projects
            </h2>
            <div className="space-y-2">
              {data.topProjects.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-zinc-400 dark:text-zinc-500 w-6">
                      #{i + 1}
                    </span>
                    <div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 capitalize">
                        {p.platform}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {p.deployments} deploys
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(p.lastDeployed).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {data.topProjects.length === 0 && (
                <div className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                  No projects found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: any; accent?: string }) {
  const accentClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
        {label}
      </h3>
      <p className={`text-2xl font-bold ${accentClasses[accent as keyof typeof accentClasses] || 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: 'bg-green-500',
    error: 'bg-red-500',
    building: 'bg-yellow-500',
    pending: 'bg-zinc-400',
  };
  return (
    <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-zinc-400'}`} />
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface DashboardStats {
  totalProjects: number;
  totalDeployments: number;
  activeDeployments: number;
  successfulDeployments: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0, totalDeployments: 0, activeDeployments: 0, successfulDeployments: 0,
  });
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('/api/projects?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      const projects = data.projects || [];
      const allDeps = projects.flatMap((p: any) => p.deployments || []);
      setStats({
        totalProjects: projects.length,
        totalDeployments: allDeps.length,
        activeDeployments: allDeps.filter((d: any) => !['READY', 'ERROR'].includes(d.status)).length,
        successfulDeployments: allDeps.filter((d: any) => d.status === 'READY').length,
      });
      setRecentDeployments(
        allDeps
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <SkeletonCard className="mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'READY') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s === 'ERROR') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) return `${hrs}h ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in-up">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
            <Link href="/deploy" className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg">
              + New Deployment
            </Link>
          </div>
          <p className="text-lg text-muted-foreground">Welcome back, {user?.name || 'there'}</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Projects', value: stats.totalProjects, icon: '📦', gradient: 'from-blue-500/10 to-blue-500/5' },
            { label: 'Total Deployments', value: stats.totalDeployments, icon: '🚀', gradient: 'from-emerald-500/10 to-emerald-500/5' },
            { label: 'Active', value: stats.activeDeployments, icon: '⚡', gradient: 'from-amber-500/10 to-amber-500/5' },
            { label: 'Successful', value: stats.successfulDeployments, icon: '✅', gradient: 'from-green-500/10 to-green-500/5' },
          ].map((s, i) => (
            <div key={s.label} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in-up">
              <Card
                className={`bg-gradient-to-br ${s.gradient} border-border/50 hover:shadow-lg hover:scale-[1.02] transition-all cursor-default`}
              >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                  <span className="text-3xl font-bold text-foreground">{s.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
            </div>
          ))}
        </div>

        {/* Recent Deployments */}
        <Card className="animate-fade-in-up stagger-4">
          <CardHeader>
            <CardTitle>Recent Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDeployments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-4xl mb-3">🚀</p>
                <p className="text-lg font-medium mb-2 text-foreground">No deployments yet</p>
                <p className="mb-4">Create your first deployment to get started</p>
                <Link href="/deploy" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Deploy Now
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentDeployments.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                        {(d.project?.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/deploy/${d.id}`} className="font-medium text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {d.project?.name || 'Unknown'}
                        </Link>
                        <p className="text-xs text-muted-foreground">{timeAgo(d.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up stagger-5">
          {[
            { href: '/projects', title: 'View Projects', desc: 'Manage your deployments' },
            { href: '/analytics', title: 'Analytics', desc: 'View deployment metrics' },
            { href: '/settings', title: 'Settings', desc: 'Configure tokens & preferences' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="p-4 bg-card rounded-lg border border-border/50 hover:shadow-md hover:border-border transition-all text-center group"
            >
              <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{l.title}</h3>
              <p className="text-sm text-muted-foreground">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

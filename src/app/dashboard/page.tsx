'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface DashboardStats {
  totalProjects: number;
  totalDeployments: number;
  activeDeployments: number;
  successfulDeployments: number;
  avgBuildTime: number;
  successRate: number;
}

interface Project {
  id: number;
  name: string;
  platform: string;
  lastDeploymentStatus: string;
  lastDeployedAt: string;
  deploymentCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { error: toastError } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0, totalDeployments: 0, activeDeployments: 0, 
    successfulDeployments: 0, avgBuildTime: 0, successRate: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentDeployments, setRecentDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<number>(0);

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
      
      // Fetch projects with deployments
      const res = await fetch('/api/projects?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      const projectsData = data.projects || [];
      
      // Transform projects for project hub
      const projectsList: Project[] = projectsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        platform: p.platform,
        lastDeploymentStatus: p.deployments?.[0]?.status || 'none',
        lastDeployedAt: p.deployments?.[0]?.createdAt || '',
        deploymentCount: p.deployments?.length || 0,
      }));
      setProjects(projectsList);
      
      // Get all deployments
      const allDeps = projectsData.flatMap((p: any) => 
        (p.deployments || []).map((d: any) => ({ ...d, projectName: p.name }))
      );
      
      // Calculate enhanced stats
      const successful = allDeps.filter((d: any) => d.status === 'READY').length;
      const total = allDeps.length;
      const avgTime = total > 0 
        ? allDeps.reduce((sum: number, d: any) => sum + (d.buildTime || 0), 0) / total 
        : 0;
      
      setStats({
        totalProjects: projectsData.length,
        totalDeployments: total,
        activeDeployments: allDeps.filter((d: any) => !['READY', 'ERROR'].includes(d.status)).length,
        successfulDeployments: successful,
        avgBuildTime: Math.round(avgTime / 1000), // Convert to seconds
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
      });
      
      // Apply filters
      let filtered = allDeps;
      if (statusFilter !== 'all') {
        filtered = filtered.filter((d: any) => d.status === statusFilter);
      }
      if (projectFilter !== 0) {
        filtered = filtered.filter((d: any) => d.projectId === projectFilter);
      }
      
      setRecentDeployments(
        filtered
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
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
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          {[
            { label: 'Total Projects', value: stats.totalProjects, icon: '📦', gradient: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400' },
            { label: 'Total Deployments', value: stats.totalDeployments, icon: '🚀', gradient: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Active', value: stats.activeDeployments, icon: '⚡', gradient: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400' },
            { label: 'Successful', value: stats.successfulDeployments, icon: '✅', gradient: 'from-green-500/10 to-green-500/5', border: 'border-green-500/20', text: 'text-green-600 dark:text-green-400' },
            { label: 'Success Rate', value: <span><AnimatedNumber value={stats.successRate} />%</span>, icon: '📈', gradient: 'from-violet-500/10 to-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-600 dark:text-violet-400' },
            { label: 'Avg Build', value: <span><AnimatedNumber value={stats.avgBuildTime} />s</span>, icon: '⏱️', gradient: 'from-sky-500/10 to-sky-500/5', border: 'border-sky-500/20', text: 'text-sky-600 dark:text-sky-400' },
          ].map((s, i) => (
            <div 
              key={s.label} 
              style={{ animationDelay: `${i * 80}ms` }} 
              className={`animate-fade-in-up bg-gradient-to-br ${s.gradient} border ${s.border} rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-3xl font-bold ${s.text}`}>{s.value}</span>
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Project Hub */}
        <div className="mb-8 animate-fade-in-up stagger-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Hub</CardTitle>
                <Link href="/projects" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                  View All
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">No projects yet</p>
                  <Link href="/deploy" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                    Create Project
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="p-4 border border-border rounded-lg hover:border-blue-500/30 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold ${
                          p.platform === 'vercel' ? 'bg-blue-600' :
                          p.platform === 'netlify' ? 'bg-teal-600' :
                          p.platform === 'cloudflare-pages' ? 'bg-orange-600' :
                          'bg-slate-600'
                        }`}>
                          {(p.name || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {p.name}
                          </h3>
                          <p className="text-xs text-muted-foreground capitalize">{p.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {p.deploymentCount} deployment{p.deploymentCount !== 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.lastDeploymentStatus === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          p.lastDeploymentStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          p.lastDeploymentStatus === 'building' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {p.lastDeploymentStatus === 'none' ? 'No deployments' : p.lastDeploymentStatus}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Deployments with Filters */}
        <div className="animate-fade-in-up stagger-3">
          <Card hoverable>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>Recent Deployments</CardTitle>
                <div className="flex items-center gap-2">
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="ready">Ready</option>
                    <option value="building">Building</option>
                    <option value="error">Error</option>
                    <option value="pending">Pending</option>
                  </select>
                  <select 
                    value={projectFilter} 
                    onChange={(e) => setProjectFilter(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                  >
                    <option value={0}>All Projects</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recentDeployments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-4xl mb-3">🚀</p>
                  <p className="text-lg font-medium mb-2 text-foreground">No deployments yet</p>
                  <p className="mb-4">Create your first deployment to get started</p>
                  <Link href="/deploy" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    Deploy Now
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentDeployments.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-3 hover:bg-muted/50 rounded-lg px-2 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold`}>
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
        </div>

        {/* Deployment Insights */}
        <div className="mt-8 animate-fade-in-up stagger-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Status Distribution</h3>
                  <div className="space-y-2">
                    {['READY', 'ERROR', 'BUILDING', 'PENDING'].map((status) => {
                      const count = recentDeployments.filter((d: any) => d.status === status).length;
                      const total = recentDeployments.length || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={status} className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${
                            status === 'READY' ? 'bg-emerald-500' :
                            status === 'ERROR' ? 'bg-red-500' :
                            status === 'BUILDING' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          <span className="text-sm flex-1 capitalize">{status.toLowerCase()}</span>
                          <span className="text-sm font-medium">{count}</span>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                status === 'READY' ? 'bg-emerald-500' :
                                status === 'ERROR' ? 'bg-red-500' :
                                status === 'BUILDING' ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h3>
                  <div className="space-y-1">
                    {recentDeployments.slice(0, 5).map((d: any) => (
                      <div key={d.id} className="flex items-center gap-2 text-sm">
                        <div className={`h-2 w-2 rounded-full ${
                          d.status === 'READY' ? 'bg-emerald-500' :
                          d.status === 'ERROR' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <span className="flex-1 truncate">{d.projectName || 'Unknown'}</span>
                        <span className="text-muted-foreground text-xs">
                          {timeAgo(d.createdAt)}
                        </span>
                      </div>
                    ))}
                    {recentDeployments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up stagger-4">
          {[
            { href: '/projects', title: 'View Projects', desc: 'Manage your deployments', gradient: 'from-blue-500/10 to-blue-500/5', border: 'hover:border-blue-500/30', icon: '📁' },
            { href: '/analytics', title: 'Analytics', desc: 'View deployment metrics', gradient: 'from-emerald-500/10 to-emerald-500/5', border: 'hover:border-emerald-500/30', icon: '📊' },
            { href: '/settings', title: 'Settings', desc: 'Configure tokens & preferences', gradient: 'from-violet-500/10 to-violet-500/5', border: 'hover:border-violet-500/30', icon: '⚙' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`p-4 bg-gradient-to-br ${l.gradient} rounded-xl border border-border/50 ${l.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group text-center`}
            >
              <div className="text-2xl mb-2">{l.icon}</div>
              <h3 className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{l.title}</h3>
              <p className="text-sm text-muted-foreground">{l.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  totalDeployments: number;
  activeDeployments: number;
  successfulDeployments: number;
}

interface RecentDeployment {
  id: number;
  deploymentIdExternal: string;
  status: string;
  projectName: string;
  createdAt: string;
  url: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalDeployments: 0,
    activeDeployments: 0,
    successfulDeployments: 0,
  });
  const [recentDeployments, setRecentDeployments] = useState<RecentDeployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchDashboardData();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      // Fetch projects
      const projectsRes = await fetch('/api/projects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!projectsRes.ok) {
        if (projectsRes.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch projects');
      }

      const projectsData = await projectsRes.json();
      const projects = projectsData.projects || [];

      // Calculate stats
      const totalProjects = projects.length;
      const allDeployments = projects.flatMap((p: any) => p.deployments || []);
      const totalDeployments = allDeployments.length;
      const activeDeployments = allDeployments.filter((d: any) => 
        !['READY', 'ERROR'].includes(d.status)
      ).length;
      const successfulDeployments = allDeployments.filter((d: any) => 
        d.status === 'READY'
      ).length;

      setStats({
        totalProjects,
        totalDeployments,
        activeDeployments,
        successfulDeployments,
      });

      // Get recent deployments
      const recent = allDeployments
        .sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5)
        .map((d: any) => ({
          id: d.id,
          deploymentIdExternal: d.deploymentIdExternal,
          status: d.status,
          projectName: d.project?.name || 'Unknown',
          createdAt: d.createdAt,
          url: d.url,
        }));

      setRecentDeployments(recent);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'READY') return 'text-green-600 dark:text-green-400';
    if (status === 'ERROR') return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              Dashboard
            </h1>
            <Link
              href="/deploy"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Deployment
            </Link>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Overview of your deployments
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Total Projects
            </h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.totalProjects}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Total Deployments
            </h3>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              {stats.totalDeployments}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Active Deployments
            </h3>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.activeDeployments}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Successful
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats.successfulDeployments}
            </p>
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Recent Deployments
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentDeployments.length === 0 ? (
              <div className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
                No deployments yet. <Link href="/deploy" className="text-blue-600 hover:underline">Create your first deployment</Link>
              </div>
            ) : (
              recentDeployments.map(deploy => (
                <div key={deploy.id} className="px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/deploy/${deploy.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {deploy.projectName}
                      </Link>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {deploy.deploymentIdExternal}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${getStatusColor(deploy.status)}`}>
                        {deploy.status}
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(deploy.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/projects"
            className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              View All Projects
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Manage your deployment projects
            </p>
          </Link>
          <Link
            href="/settings/tokens"
            className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              API Tokens
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Configure Vercel & GitHub tokens
            </p>
          </Link>
          <Link
            href="/instructions"
            className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow text-center"
          >
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Documentation
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Learn how to use Deploy Agent
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

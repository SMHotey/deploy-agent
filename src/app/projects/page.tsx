'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface Project {
  id: number;
  name: string;
  description: string | null;
  repoUrl: string;
  platform: string;
  environment: string;
  status: string | null;
  url: string | null;
  createdAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { error: toastError } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="mb-8"><SkeletonCard /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const statusColor = (status: string | null) => {
    if (!status) return 'bg-muted text-muted-foreground';
    if (status === 'ready') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (status === 'building' || status === 'pending') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const platformGradient = (platform: string) => {
    const g: Record<string, string> = {
      'vercel': 'from-zinc-800 to-zinc-600',
      'netlify': 'from-green-600 to-emerald-500',
      'cloudflare-pages': 'from-orange-500 to-amber-500',
      'railway': 'from-violet-600 to-purple-500',
    };
    return g[platform] || 'from-zinc-500 to-zinc-400';
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days > 7) return new Date(ts).toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    return 'Today';
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in-up">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">My Projects</h1>
              <p className="mt-1 text-lg text-muted-foreground">Manage your deployment projects</p>
            </div>
            <Link href="/deploy" className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all hover:shadow-lg">
              + New Deployment
            </Link>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="text-center py-16 animate-scale-in">
            <div className="mx-auto w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">Create your first deployment to get started</p>
            <Link href="/deploy" className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors inline-block">
              Create Deployment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <div key={project.id} style={{ animationDelay: `${i * 80}ms` }} className="animate-fade-in-up">
              <Card
                className="hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${platformGradient(project.platform)} text-white flex-shrink-0 ml-2`}>
                      {project.platform}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{project.repoUrl}</p>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(project.status)}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {project.status || 'unknown'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{timeAgo(project.createdAt)}</span>
                      {project.url && (
                        <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

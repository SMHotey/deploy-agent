'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchProjects();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok && res.status === 401) {
        router.push('/');
      }
    } catch {
      // Ignore
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch projects');
      }

      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400';
    if (status === 'ready') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'building' || status === 'pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      'vercel': 'bg-black text-white',
      'netlify': 'bg-green-600 text-white',
      'cloudflare-pages': 'bg-orange-500 text-white',
      'railway': 'bg-violet-600 text-white',
    };
    return colors[platform] || 'bg-gray-500 text-white';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                ← Back
              </button>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                My Projects
              </h1>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              + New Deployment
            </Link>
          </div>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Manage your deployment projects
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No projects yet
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Create your first deployment to get started
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Create Deployment
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {project.repoUrl}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPlatformColor(project.platform)}`}>
                    {project.platform}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                    {project.status || 'unknown'}
                  </span>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

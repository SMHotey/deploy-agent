'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface Project {
  id: number;
  name: string;
  description: string | null;
  repoUrl: string | null;
  platform: string;
  source: string;
  environment: string;
  createdAt: string;
}

interface DemandAnalysis {
  overallDemandScore: number;
  trend: 'rising' | 'stable' | 'declining';
  trendData: { date: string; value: number }[];
  competitionLevel: 'low' | 'medium' | 'high';
  estimatedMarketSize: string;
  similarProjectsCount: number;
  keywordSuggestions: string[];
  insightSummary: string;
}

type Tab = 'overview' | 'env' | 'demand' | 'deployments';

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, getToken } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [demandAnalysis, setDemandAnalysis] = useState<DemandAnalysis | null>(null);
  const [demandLoading, setDemandLoading] = useState(false);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const projectId = params.projectId as string;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    if (!user || !projectId) return;
    fetchProject();
  }, [projectId, user, authLoading]);

  const fetchProject = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      const found = data.projects?.find((p: any) => p.id === parseInt(projectId));

      if (!found) {
        toastError('Project not found');
        router.push('/projects');
        return;
      }

      setProject(found);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load project';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDemandAnalysis = async () => {
    setDemandLoading(true);
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`/api/demand?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch demand analysis');
      const data = await res.json();
      setDemandAnalysis(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load demand analysis';
      toastError(message);
    } finally {
      setDemandLoading(false);
    }
  };

  const handleImFeelingLucky = async () => {
    setAiLoading(true);
    setAiDescription(null);
    try {
      const token = getToken();
      if (!token) return;

      // Call OpenAI API for market description
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'market-description',
          projectName: project?.name,
          description: project?.description,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate AI description');
      const data = await res.json();
      setAiDescription(data.analysis || 'Market analysis generated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI description';
      toastError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const getDemandScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getTrendEmoji = (trend: string) => {
    if (trend === 'rising') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  const getCompetitionColor = (level: string) => {
    if (level === 'low') return 'text-emerald-500';
    if (level === 'medium') return 'text-amber-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <SkeletonCard />
        </div>
      </main>
    );
  }

  if (!project) return null;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/projects"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              ← Back to Projects
            </Link>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                {project.platform} • {project.environment}
                {project.source && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400">
                    {project.source}
                  </span>
                )}
              </p>
              {project.description && (
                <p className="mt-2 text-muted-foreground">{project.description}</p>
              )}
            </div>
            <Button
              onClick={() => router.push(`/deploy?projectId=${project.id}`)}
              className="bg-primary text-primary-foreground"
            >
              Deploy
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {([
            { key: 'overview' as const, label: 'Overview' },
            { key: 'env' as const, label: 'Environment Variables' },
            { key: 'demand' as const, label: 'Demand Analysis' },
            { key: 'deployments' as const, label: 'Deployments' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === 'env') {
                  router.push(`/projects/${project.id}/env`);
                } else if (tab.key === 'deployments') {
                  // TODO: Create deployments tab
                  toastError('Deployments tab coming soon!');
                } else {
                  setActiveTab(tab.key);
                }
              }}
              className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Platform</dt>
                    <dd className="text-lg font-medium">{project.platform}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Environment</dt>
                    <dd className="text-lg font-medium">{project.environment}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Source</dt>
                    <dd className="text-lg font-medium">{project.source || 'git'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Created</dt>
                    <dd className="text-lg font-medium">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'demand' && (
          <div className="space-y-6">
            {/* Demand Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>Market Demand Score</CardTitle>
                <CardDescription>
                  Based on search trends, competition, and market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {demandLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading demand analysis...
                  </div>
                ) : demandAnalysis ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className={`text-5xl font-bold ${getDemandScoreColor(demandAnalysis.overallDemandScore)}`}>
                          {demandAnalysis.overallDemandScore}
                          <span className="text-2xl text-muted-foreground">/100</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getTrendEmoji(demandAnalysis.trend)} Trend: {demandAnalysis.trend}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-semibold ${getCompetitionColor(demandAnalysis.competitionLevel)}`}>
                          {demandAnalysis.competitionLevel}
                        </p>
                        <p className="text-sm text-muted-foreground">Competition</p>
                      </div>
                    </div>

                    <div className="bg-zinc-950 rounded-lg p-4 mb-4">
                      <p className="text-sm text-zinc-300">{demandAnalysis.insightSummary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-zinc-900 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Market Size</p>
                        <p className="text-lg font-semibold text-foreground">
                          {demandAnalysis.estimatedMarketSize}
                        </p>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Similar Projects</p>
                        <p className="text-lg font-semibold text-foreground">
                          {demandAnalysis.similarProjectsCount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground">Trend Data Points</p>
                        <p className="text-lg font-semibold text-foreground">
                          {demandAnalysis.trendData.length}
                        </p>
                      </div>
                    </div>

                    {demandAnalysis.keywordSuggestions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Keyword Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                          {demandAnalysis.keywordSuggestions.map((kw, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No demand analysis available yet.
                    </p>
                    <Button onClick={fetchDemandAnalysis}>
                      Analyze Demand
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Market Description */}
            <Card>
              <CardHeader>
                <CardTitle>AI Market Insights</CardTitle>
                <CardDescription>
                  Get AI-generated market description for your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={handleImFeelingLucky}
                    disabled={aiLoading}
                    className="bg-gradient-to-r from-violet-600 to-blue-600 text-white"
                  >
                    {aiLoading ? 'Generating...' : "🎲 I'm Feeling Lucky - AI Market Description"}
                  </Button>

                  {aiDescription && (
                    <div className="bg-zinc-950 rounded-lg p-4">
                      <p className="text-sm text-zinc-300 leading-relaxed">{aiDescription}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Full Report CTA */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Full Market Report</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a comprehensive PDF report with detailed analysis
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const token = getToken();
                      if (!token) return;

                      try {
                        const res = await fetch('/api/demand/full-report', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ projectId: project.id }),
                        });

                        if (res.ok) {
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `demand-report-${project.id}.pdf`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                          toastSuccess('Report downloaded!');
                        } else {
                          const data = await res.json();
                          toastError(data.error || 'Failed to generate report');
                        }
                      } catch {
                        toastError('Failed to download report');
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Get Full Report (200 pts)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}

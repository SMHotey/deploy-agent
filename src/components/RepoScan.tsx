'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslations } from 'next-intl';

interface RepoAnalysis {
  repo: {
    name: string;
    description?: string;
    primary_language?: string;
    stars?: number;
    topics?: string[];
  };
  analysis: {
    framework: string;
    framework_confidence: number;
    build_tool?: string;
    package_manager?: string;
    suggested_platform: string;
    suggested_branch?: string;
    environment_variables?: Record<string, string>;
    notes: string[];
  };
  recommendations: {
    platform: string;
    template?: string;
    deploy_command?: string;
    estimated_build_time?: string;
    warnings: string[];
  };
}

export default function RepoScan({ repoUrl, onComplete }: {
  repoUrl: string;
  onComplete?: (params: Record<string, unknown>) => void;
}) {
  const { getToken } = useAuth();
  const t = useTranslations('deploy');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scanRepo = async () => {
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch('/api/repo-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');

      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleUseRecommendation = () => {
    if (!analysis || !onComplete) return;
    const params: Record<string, unknown> = {
      repo_url: repoUrl,
      target_platform: analysis.recommendations.platform,
    };
    if (analysis.analysis.suggested_branch) {
      params.branch = analysis.analysis.suggested_branch;
    }
    if (analysis.recommendations.template) {
      params.template = analysis.recommendations.template;
    }
    if (analysis.analysis.environment_variables) {
      params.environment_variables = analysis.analysis.environment_variables;
    }
    onComplete(params);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={scanRepo}
          disabled={loading || !repoUrl.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Scanning...' : 'Scan Repository'}
        </button>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyzing repository...
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4 mt-4">
          {/* Repo Info */}
          <div className="p-4 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">Repository Info</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span> {analysis.repo.name}
              </div>
              {analysis.repo.primary_language && (
                <div>
                  <span className="text-muted-foreground">Language:</span> {analysis.repo.primary_language}
                </div>
              )}
              {analysis.repo.stars !== undefined && (
                <div>
                  <span className="text-muted-foreground">Stars:</span> ⭐ {analysis.repo.stars}
                </div>
              )}
            </div>
            {analysis.repo.description && (
              <p className="mt-2 text-sm text-muted-foreground">{analysis.repo.description}</p>
            )}
          </div>

          {/* Analysis Results */}
          <div className="p-4 bg-card border rounded-lg">
            <h3 className="font-semibold mb-2">Analysis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Detected Framework:</span>
                <span className="font-medium">{analysis.analysis.framework}</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className={getConfidenceColor(analysis.analysis.framework_confidence)}>
                  {analysis.analysis.framework_confidence}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Build Tool:</span>
                <span className="font-medium">{analysis.analysis.build_tool || 'auto-detect'}</span>
              </div>
              <div className="flex justify-between">
                <span>Package Manager:</span>
                <span className="font-medium">{analysis.analysis.package_manager || 'npm'}</span>
              </div>
            </div>

            {analysis.analysis.notes.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {analysis.analysis.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold mb-2">Recommendations</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Platform:</span>
                <span className="font-medium capitalize">{analysis.recommendations.platform}</span>
              </div>
              {analysis.recommendations.template && (
                <div className="flex justify-between">
                  <span>Template:</span>
                  <span className="font-medium">{analysis.recommendations.template}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Build Time:</span>
                <span className="font-medium">{analysis.recommendations.estimated_build_time || 'unknown'}</span>
              </div>
            </div>

            {analysis.recommendations.warnings.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Warnings:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                  {analysis.recommendations.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {onComplete && (
              <button
                onClick={handleUseRecommendation}
                className="mt-4 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Use These Settings
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from 'react';

interface AIAnalysis {
  analysis: string;
  steps: string[];
}

interface AIAssistantProps {
  type: 'deploy-error' | 'review-feedback';
  deploymentId?: number;
  reviewId?: number;
  className?: string;
}

export default function AIAssistant({ type, deploymentId, reviewId, className = '' }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          deploymentId,
          reviewId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }

      setAnalysis(data);
      setExpanded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.674m0 0A2.25 2.25 0 0 1 13.5 19.5h-3A2.25 2.25 0 0 1 8.25 17.25m4.674 0A2.25 2.25 0 0 1 13.5 19.5h-3m0 0V6.75A2.25 2.25 0 0 1 15.75 4.5h3A2.25 2.25 0 0 1 18 6.75v10.5m-12 0V6.75A2.25 2.25 0 0 1 7.5 4.5h3A2.25 2.25 0 0 1 12 6.75v10.5" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Assistant</h3>
              <p className="text-sm text-zinc-400">
                {type === 'deploy-error' ? 'Deploy Error Analysis' : 'Review Recommendations'}
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              loading
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              <>
                {type === 'deploy-error' ? '🤖 AI Analyze' : '💡 Get AI Recommendations'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full mb-3 text-left"
          >
            <span className="font-medium text-white">Analysis Result</span>
            <svg
              className={`w-5 h-5 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="space-y-4">
              {/* Analysis */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-300 leading-relaxed">{analysis.analysis}</p>
              </div>

              {/* Steps */}
              {analysis.steps.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-300 mb-2">Action Steps:</h4>
                  <ol className="space-y-2">
                    {analysis.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm text-zinc-300 pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info when no analysis yet */}
      {!analysis && !error && (
        <div className="p-4 text-center">
          <p className="text-sm text-zinc-500">
            {loading
              ? 'AI is analyzing...'
              : type === 'deploy-error'
              ? 'Click "AI Analyze" to get explanations and fix steps for the deployment error'
              : 'Click "Get AI Recommendations" to receive actionable suggestions based on the review'}
          </p>
        </div>
      )}
    </div>
  );
}

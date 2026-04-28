'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Deployment {
  id: number;
  deploymentIdExternal: string;
  status: string;
  url: string | null;
  logsUrl: string | null;
  buildTime: number | null;
  createdAt: string;
  project: {
    name: string;
    platform: string;
  };
}

export default function DeploymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const deploymentId = params.id as string;

  useEffect(() => {
    checkAuth();
    if (deploymentId) {
      fetchDeployment();
    }
  }, [deploymentId]);

  const checkAuth = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
    }
  };

  const fetchDeployment = async () => {
    try {
      const res = await fetch(`/api/deploy?deployment_id=${deploymentId}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}` 
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error('Failed to fetch deployment');
      }

      const data = await res.json();
      setDeployment(data);
      
      if (data.logs) {
        setLogs(data.logs.split('\n').filter((l: string) => l.trim()));
      }
    } catch (err: any) {
      console.error('Failed to fetch deployment:', err);
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = () => {
    if (isStreaming) return;
    
    setIsStreaming(true);
    setLogs([]);
    
    const token = localStorage.getItem('accessToken');
    const eventSource = new EventSource(`/api/deploy/${deploymentId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent(data);
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.addEventListener('status', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ event: 'status', ...data });
      } catch (e) {
        console.error('Failed to parse status event:', e);
      }
    });

    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        handleStreamEvent({ event: 'complete', ...data });
        eventSource.close();
        setIsStreaming(false);
        fetchDeployment(); // Refresh deployment data
      } catch (e) {
        console.error('Failed to parse complete event:', e);
      }
    });

    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, `ERROR: ${data.error}`]);
      } catch (e) {
        setLogs(prev => [...prev, 'Stream error occurred']);
      }
    });

    eventSource.onerror = () => {
      setLogs(prev => [...prev, 'Connection lost. Reconnecting...']);
      eventSource.close();
      setIsStreaming(false);
    };
  };

  const handleStreamEvent = (data: any) => {
    switch (data.event) {
      case 'start':
        setLogs(prev => [...prev, `▶ ${data.message}`]);
        break;
      case 'status':
        setLogs(prev => [...prev, `Status: ${data.state}`]);
        if (deployment) {
          setDeployment({ ...deployment, status: data.state });
        }
        break;
      case 'complete':
        setLogs(prev => [...prev, `✓ Deployment ${data.success ? 'succeeded' : 'failed'}`]);
        if (data.url) {
          setLogs(prev => [...prev, `URL: ${data.url}`]);
        }
        break;
      default:
        setLogs(prev => [...prev, JSON.stringify(data)]);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'READY': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'ERROR': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'BUILDING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'QUEUED': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'INITIALIZING': 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-600 dark:text-zinc-400">Loading deployment...</div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Deployment not found
          </h2>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-4"
          >
            ← Back to Projects
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Deployment Details
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                {deployment.project?.name || 'Unknown Project'} • {deployment.deploymentIdExternal}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deployment.status)}`}>
              {deployment.status}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Platform</h3>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {deployment.project?.platform || 'N/A'}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Build Time</h3>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {deployment.buildTime ? `${Math.round(deployment.buildTime / 1000)}s` : 'N/A'}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">Created</h3>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {new Date(deployment.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          {deployment.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Visit Deployment →
            </a>
          )}
          {deployment.logsUrl && (
            <a
              href={deployment.logsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
            >
              View Logs
            </a>
          )}
          {deployment.status !== 'READY' && deployment.status !== 'ERROR' && (
            <button
              onClick={startStreaming}
              disabled={isStreaming}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? 'Streaming...' : 'Watch Live'}
            </button>
          )}
        </div>

        {/* Live Logs */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Deployment Logs
              {isStreaming && (
                <span className="ml-2 inline-flex items-center">
                  <span className="animate-pulse h-2 w-2 bg-green-500 rounded-full"></span>
                  <span className="ml-2 text-sm text-green-600 dark:text-green-400">Live</span>
                </span>
              )}
            </h2>
          </div>
          <div className="p-6">
            <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-md overflow-x-auto text-sm font-mono max-h-96 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="py-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-zinc-500">No logs available yet.</div>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

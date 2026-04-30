'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemHealth {
  id: string;
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: string;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  createdAt: string;
  updates: Array<{ time: string; message: string; status: string }>;
}

interface StatusData {
  ok: boolean;
  status: 'operational' | 'degraded' | 'down';
  systems: SystemHealth[];
  stats: {
    totalDeployments24h: number;
    successRate: number;
    failedDeployments: number;
    incidents: number;
  };
  incidents: Incident[];
  timestamp: string;
}

const statusConfig = {
  operational: { color: 'bg-green-500', text: 'Operational', emoji: '✅' },
  degraded: { color: 'bg-yellow-500', text: 'Degraded', emoji: '⚠️' },
  down: { color: 'bg-red-500', text: 'Down', emoji: '🔴' },
  investigating: { color: 'bg-yellow-500', text: 'Investigating', emoji: '🔍' },
  identified: { color: 'bg-blue-500', text: 'Identified', emoji: '🔧' },
  monitoring: { color: 'bg-purple-500', text: 'Monitoring', emoji: '👀' },
  resolved: { color: 'bg-green-500', text: 'Resolved', emoji: '✅' },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading status...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-red-500">Failed to load status</div>
      </div>
    );
  }

  const overallConfig = statusConfig[data.status];

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header with gradient bg */}
          <div className={`text-center mb-16 p-8 rounded-2xl bg-gradient-to-r ${
            data.status === 'operational' ? 'from-green-500/10 to-emerald-500/10 border-green-500/20' :
            data.status === 'degraded' ? 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20' :
            'from-red-500/10 to-pink-500/10 border-red-500/20'
          } border`}>
            <div className="text-6xl mb-4">{overallConfig.emoji}</div>
            <h1 className={`text-4xl font-bold tracking-tight mb-2 ${
              data.status === 'operational' ? 'text-green-500' :
              data.status === 'degraded' ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {overallConfig.text}
            </h1>
            <p className="text-muted-foreground">
              All systems are monitored. Last checked: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          </div>

        {/* Systems */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.systems.map((system) => {
              const config = statusConfig[system.status];
              return (
                <div
                  key={system.id}
                  className={`flex items-center justify-between rounded-xl border p-4 transition-all hover:-translate-y-0.5 ${
                    system.status === 'operational' ? 'border-green-500/20 bg-green-500/5' :
                    system.status === 'degraded' ? 'border-yellow-500/20 bg-yellow-500/5' :
                    'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <div>
                    <h3 className="font-medium">{system.name}</h3>
                    <p className="text-sm text-muted-foreground">{system.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                      <span className="text-sm font-medium">{config.text}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Uptime: {system.uptime}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">24h Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center hover:-translate-y-0.5 transition-all duration-300">
              <div className="text-3xl font-bold text-blue-500">{data.stats.totalDeployments24h}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Deployments</div>
            </div>
            <div className={`rounded-xl border p-6 text-center hover:-translate-y-0.5 transition-all duration-300 ${
              data.stats.successRate >= 95 ? 'border-green-500/20 bg-green-500/5' :
              data.stats.successRate >= 80 ? 'border-yellow-500/20 bg-yellow-500/5' :
              'border-red-500/20 bg-red-500/5'
            }`}>
              <div className={`text-3xl font-bold ${
                data.stats.successRate >= 95 ? 'text-green-500' :
                data.stats.successRate >= 80 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {data.stats.successRate}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Success Rate</div>
            </div>
            <div className={`rounded-xl border p-6 text-center hover:-translate-y-0.5 transition-all duration-300 ${
              data.stats.failedDeployments === 0 ? 'border-green-500/20 bg-green-500/5' :
              'border-red-500/20 bg-red-500/5'
            }`}>
              <div className={`text-3xl font-bold ${
                data.stats.failedDeployments === 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {data.stats.failedDeployments}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Failed Deployments</div>
            </div>
          </div>
        </section>

        {/* Incidents */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Recent Incidents</h2>
          {data.incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent incidents. All systems running smoothly! 🎉
            </div>
          ) : (
            <div className="space-y-4">
              {data.incidents.map((incident) => {
                const config = statusConfig[incident.status];
                return (
                  <div
                    key={incident.id}
                    className="rounded-xl border border-border/50 bg-card/50 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${config.color}`} />
                        <span className="text-sm">{config.text}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {incident.updates.map((update, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <time className="text-muted-foreground whitespace-nowrap">
                            {new Date(update.time).toLocaleTimeString()}
                          </time>
                          <span className="text-foreground">{update.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border flex items-center justify-between">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to Deploy Agent
          </Link>
          <Link href="/blog" className="text-blue-500 hover:underline">
            Read Blog →
          </Link>
        </footer>
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deployments, auditLogs } from '@/db/schema';
import { desc, eq, and, gte } from 'drizzle-orm';

// In-memory status store (in production, use Redis/KV)
const INCIDENTS: Array<{
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  createdAt: string;
  updates: Array<{ time: string; message: string; status: string }>;
}> = [];

const SYSTEMS = [
  { id: 'api', name: 'API', description: 'Deploy Agent API' },
  { id: 'webhooks', name: 'Webhooks', description: 'GitHub & Vercel webhooks' },
  { id: 'database', name: 'Database', description: 'PostgreSQL' },
  { id: 'deployments', name: 'Deployments', description: 'Vercel deployment engine' },
  { id: 'auth', name: 'Authentication', description: 'JWT auth service' },
];

export async function GET(req: NextRequest) {
  try {
    // Get recent deployment stats (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentDeployments = await db
      .select()
      .from(deployments)
      .where(gte(deployments.createdAt, last24h))
      .orderBy(desc(deployments.createdAt))
      .limit(100);

    const totalDeployments = recentDeployments.length;
    const successfulDeployments = recentDeployments.filter((d) => d.status === 'ready').length;
    const failedDeployments = recentDeployments.filter((d) => d.status === 'error').length;
    const successRate = totalDeployments > 0 
      ? Math.round((successfulDeployments / totalDeployments) * 100) 
      : 100;

    // Calculate system health (simplified)
    const systems = SYSTEMS.map((sys) => {
      let status: 'operational' | 'degraded' | 'down' = 'operational';
      
      if (sys.id === 'deployments' && successRate < 90) {
        status = 'degraded';
      } else if (sys.id === 'deployments' && successRate < 70) {
        status = 'down';
      }

      return {
        ...sys,
        status,
        uptime: status === 'operational' ? '99.9%' : status === 'degraded' ? '95.0%' : '0%',
      };
    });

    // Overall status
    const allOperational = systems.every((s) => s.status === 'operational');
    const anyDown = systems.some((s) => s.status === 'down');
    
    const overall = anyDown ? 'down' : allOperational ? 'operational' : 'degraded';

    return NextResponse.json({
      ok: true,
      status: overall,
      systems,
      stats: {
        totalDeployments24h: totalDeployments,
        successRate,
        failedDeployments,
        incidents: INCIDENTS.filter((i) => i.status !== 'resolved').length,
      },
      incidents: INCIDENTS.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Admin: Create incident
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, status = 'investigating' } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const incident = {
      id: `inc_${Date.now()}`,
      title,
      status,
      createdAt: new Date().toISOString(),
      updates: [
        {
          time: new Date().toISOString(),
          message: `Incident created: ${title}`,
          status,
        },
      ],
    };

    INCIDENTS.unshift(incident);

    return NextResponse.json({ ok: true, incident }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

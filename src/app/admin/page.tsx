import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, deployments, projects } from '@/db/schema';
import { count, desc } from 'drizzle-orm';
import Link from 'next/link';
import { authenticate } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function AdminDashboardPage() {
  const headersList = await headers();
  const request = new Request('http://localhost', { headers: headersList });
  const session = await authenticate(request);

  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');

  const [userCount, projectCount, deploymentStats, recentDeployments] = await Promise.all([
    db.$count(users),
    db.$count(projects),
    db.select({ status: deployments.status, count: count() })
      .from(deployments)
      .groupBy(deployments.status),
    db.query.deployments.findMany({
      limit: 10,
      orderBy: [desc(deployments.createdAt)],
      with: {
        project: { columns: { id: true, name: true } },
      },
    }),
  ]);

  const stats = {
    users: userCount,
    projects: projectCount,
    deployments: deploymentStats.reduce((sum, s) => sum + Number(s.count), 0),
    successful: deploymentStats.find(s => s.status === 'ready')?.count || 0,
    failed: deploymentStats.find(s => s.status === 'error')?.count || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">{t('overview')}</h3>
            <p className="text-3xl font-bold mt-2">{stats.deployments}</p>
            <p className="text-slate-400 text-sm mt-1">Total Deployments</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Users</h3>
            <p className="text-3xl font-bold mt-2">{stats.users}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Projects</h3>
            <p className="text-3xl font-bold mt-2">{stats.projects}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Success Rate</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">
              {stats.deployments > 0
                ? Math.round((Number(stats.successful) / stats.deployments) * 100)
                : 0}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/users" className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
            <h3 className="text-xl font-semibold">{t('users')}</h3>
            <p className="text-slate-400 mt-2">Manage user accounts and permissions</p>
          </Link>
          <Link href="/admin/deployments" className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
            <h3 className="text-xl font-semibold">{t('deployments')}</h3>
            <p className="text-slate-400 mt-2">View all deployments across projects</p>
          </Link>
          <Link href="/admin/webhook-events" className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
            <h3 className="text-xl font-semibold">{t('webhook_events')}</h3>
            <p className="text-slate-400 mt-2">Monitor and replay webhook events</p>
          </Link>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-4">Recent Deployments</h2>
          <div className="space-y-3">
            {recentDeployments.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="font-medium">{Array.isArray(d.project) ? d.project[0]?.name : d.project?.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-400">{d.branch} • {d.commitSha?.slice(0, 7)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  d.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                  d.status === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

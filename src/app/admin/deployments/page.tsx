import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { deployments, projects, users } from '@/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { authenticate } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function AdminDeploymentsPage() {
  const headersList = await headers();
  const request = new Request('http://localhost', { headers: headersList });
  const session = await authenticate(request);

  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');

  const allDeployments = await db.query.deployments.findMany({
    limit: 50,
    orderBy: [desc(deployments.createdAt)],
    with: {
      project: {
        with: {
          user: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{t('deployments')}</h1>
          <Link href="/admin" className="text-blue-400 hover:text-blue-300">
            Back to Overview
          </Link>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">ID</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Project</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">User</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Status</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Branch</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Preview</th>
                <th className="text-left p-4 text-slate-400 text-sm uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {allDeployments.map((d: any) => (
                <tr key={d.id} className="border-t border-slate-700/50">
                  <td className="p-4">{d.id}</td>
                  <td className="p-4">{d.project?.name || 'Unknown'}</td>
                  <td className="p-4">{d.project?.user?.email || '-'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      d.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                      d.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-4">{d.branch || '-'}</td>
                  <td className="p-4">
                    {d.isPreview ? (
                      <span className="text-blue-400">Yes {d.prNumber ? `#${d.prNumber}` : ''}</span>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

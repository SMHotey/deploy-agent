import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { authenticate } from '@/lib/auth';
import Link from 'next/link';

export default async function HostingAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await authenticate(new Request('http://localhost'));
  if (!session?.isAdmin) {
    redirect('/');
  }

  const { days } = await searchParams;
  const daysNum = parseInt(days || '30');

  // Fetch analytics data
  const baseUrl = process.env.DEPLOY_AGENT_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/admin/hosting-analytics?days=${daysNum}`, {
    headers: {
      Cookie: `token=${process.env.TEST_JWT || ''}`,
    },
    cache: 'no-store',
  });

  const data = await res.json();

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
        <p className="text-red-400">Failed to load analytics</p>
      </div>
    );
  }

  const { summary, providerStats, recentConversions, clickTrends } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">Hosting Analytics</h1>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <Link
                key={d}
                href={`/admin/hosting-analytics?days=${d}`}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  daysNum === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {d} days
              </Link>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Total Clicks</h3>
            <p className="text-3xl font-bold mt-2">{summary.totalClicks}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Conversions</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">{summary.totalConversions}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Conversion Rate</h3>
            <p className="text-3xl font-bold mt-2 text-blue-400">{summary.conversionRate}%</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Total Commission</h3>
            <p className="text-3xl font-bold mt-2 text-purple-400">${summary.totalCommission}</p>
          </div>
        </div>

        {/* Commission Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Pending Commission</h3>
            <p className="text-3xl font-bold mt-2 text-yellow-400">${summary.pendingCommission}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Paid Commission</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">${summary.paidCommission}</p>
          </div>
        </div>

        {/* Per-Provider Stats */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold">Provider Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Provider</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Type</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Clicks</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Conversions</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Conv. Rate</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {providerStats.map((p: any) => (
                  <tr key={p.providerId} className="border-b border-slate-700/30 hover:bg-slate-700/30">
                    <td className="p-4">
                      <p className="font-medium">{p.providerName}</p>
                      <p className="text-xs text-slate-400">{p.slug}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-sm uppercase">{p.commissionType}</span>
                    </td>
                    <td className="p-4 text-right text-sm">{p.clicks}</td>
                    <td className="p-4 text-right text-sm">{p.conversions}</td>
                    <td className="p-4 text-right text-sm">
                      <span className={Number(p.conversionRate) > 5 ? 'text-green-400' : 'text-yellow-400'}>
                        {p.conversionRate}%
                      </span>
                    </td>
                    <td className="p-4 text-right text-sm text-purple-400 font-medium">
                      ${p.totalCommission}
                    </td>
                  </tr>
                ))}
                {providerStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No data yet. Clicks and conversions will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Conversions */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold">Recent Conversions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Provider</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Type</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Value</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Commission</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentConversions.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-700/30">
                    <td className="p-4 font-medium">{c.providerName}</td>
                    <td className="p-4 text-sm">{c.conversionType}</td>
                    <td className="p-4 text-right text-sm">${c.conversionValue / 100}</td>
                    <td className="p-4 text-right text-sm text-purple-400">${c.commissionEarned / 100}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                        c.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      {new Date(c.convertedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentConversions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No conversions yet. They'll appear here when referrals convert.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

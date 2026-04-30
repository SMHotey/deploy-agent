import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { marketingActivities, marketingActivityTypeEnum, marketingActivityStatusEnum } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import Link from 'next/link';

export default async function MarketingActivitiesPage() {
  const session = await authenticate(new Request('http://localhost'));
  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');
  const activities = await db.select()
    .from(marketingActivities)
    .orderBy(desc(marketingActivities.createdAt));

  const typeLabels: Record<string, string> = {
    'email_campaign': '📧 Email Campaign',
    'social_media': '📱 Social Media',
    'content_marketing': '✍️ Content',
    'webinar': '🎥 Webinar',
    'partnership': '🤝 Partnership',
    'referral_program': '🔗 Referral',
    'discount_offer': '🏷 Discount',
  };

  const statusColors: Record<string, string> = {
    'draft': 'bg-gray-500/20 text-gray-400',
    'scheduled': 'bg-blue-500/20 text-blue-400',
    'active': 'bg-green-500/20 text-green-400',
    'completed': 'bg-purple-500/20 text-purple-400',
    'cancelled': 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">{t('marketing_activities') || 'Marketing Activities'}</h1>
          </div>
          <button
            onClick={() => (document.getElementById('create-modal') as HTMLDialogElement)?.showModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Activity
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total', value: activities.length, color: 'text-white' },
            { label: 'Active', value: activities.filter(a => a.status === 'active').length, color: 'text-green-400' },
            { label: 'Scheduled', value: activities.filter(a => a.status === 'scheduled').length, color: 'text-blue-400' },
            { label: 'Total Conversions', value: activities.reduce((sum, a) => sum + a.currentConversions, 0), color: 'text-purple-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-slate-400 text-sm uppercase">{stat.label}</h3>
              <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Activities Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Title</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Status</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Conversions</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Budget</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                    <td className="p-4">
                      <p className="font-medium">{activity.title}</p>
                      {activity.description && (
                        <p className="text-sm text-slate-400 truncate max-w-xs">{activity.description}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{typeLabels[activity.type] || activity.type}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusColors[activity.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {activity.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{activity.currentConversions}</span>
                      {activity.conversionGoal && (
                        <span className="text-xs text-slate-400"> / {activity.conversionGoal}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm">${(activity.budgetCents / 100).toFixed(2)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 text-sm mr-3">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No marketing activities yet. Create your first one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        <dialog id="create-modal" className="bg-slate-800 border border-slate-700 rounded-xl p-0 max-w-2xl w-full backdrop:bg-black/50 open:flex open:flex-col">
          <form method="dialog" className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create Marketing Activity</h2>
              <button type="button" onClick={(e) => (e.target as HTMLElement).closest('dialog')?.close()} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
                <input
                  name="title"
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Spring Sale Campaign"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Type *</label>
                  <select
                    name="type"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="email_campaign">📧 Email Campaign</option>
                    <option value="social_media">📱 Social Media</option>
                    <option value="content_marketing">✍️ Content Marketing</option>
                    <option value="webinar">🎥 Webinar</option>
                    <option value="partnership">🤝 Partnership</option>
                    <option value="referral_program">🔗 Referral Program</option>
                    <option value="discount_offer">🏷 Discount Offer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    name="status"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Campaign details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Budget ($)</label>
                  <input
                    name="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Audience</label>
                  <input
                    name="targetAudience"
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Developers, Startups"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date</label>
                  <input
                    name="startDate"
                    type="datetime-local"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date</label>
                  <input
                    name="endDate"
                    type="datetime-local"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Conversion Goal</label>
                <input
                  name="conversionGoal"
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="1000 signups"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={(e) => (e.target as HTMLElement).closest('dialog')?.close()}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Activity
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

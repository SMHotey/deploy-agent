import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { hostingProviders } from '@/db/schema';
import { authenticate } from '@/lib/auth';
import Link from 'next/link';

export default async function HostingProvidersPage() {
  const session = await authenticate(new Request('http://localhost'));
  if (!session?.isAdmin) {
    redirect('/');
  }

  const t = await getTranslations('admin');
  const providers = await db.select().from(hostingProviders).orderBy(hostingProviders.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-bold">{t('hosting_providers') || 'Hosting Providers'}</h1>
          </div>
          <button
            onClick={() => (document.getElementById('create-modal') as HTMLDialogElement)?.showModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Provider
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Total</h3>
            <p className="text-3xl font-bold mt-2">{providers.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Active</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">{providers.filter(p => p.isActive).length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">CPA</h3>
            <p className="text-3xl font-bold mt-2 text-blue-400">{providers.filter(p => p.commissionType === 'cpa').length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-slate-400 text-sm uppercase">Avg Commission</h3>
            <p className="text-3xl font-bold mt-2 text-purple-400">
              {providers.filter(p => p.commissionRate).length > 0
                ? '$' + (providers
                    .filter(p => p.commissionRate)
                    .reduce((sum, p) => sum + parseFloat(p.commissionRate!), 0) / providers.filter(p => p.commissionRate).length
                  ).toFixed(2)
                : '$0.00'
              }
            </p>
          </div>
        </div>

        {/* Providers Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Provider</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Type</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Commission</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Min Payout</th>
                  <th className="text-left p-4 text-slate-400 text-sm font-medium">Status</th>
                  <th className="text-right p-4 text-slate-400 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {provider.logoUrl && (
                          <img src={provider.logoUrl} alt={provider.name} className="w-8 h-8 rounded object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-slate-400">{provider.slug}</p>
                        </div>
                      </div>
                      {provider.description && (
                        <p className="text-sm text-slate-400 mt-1">{provider.description}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm capitalize">{provider.commissionType || 'cpa'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{provider.commissionRate || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">${provider.minPayout || 50}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        provider.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-blue-400 hover:text-blue-300 text-sm mr-3">Edit</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                    </td>
                  </tr>
                ))}
                {providers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No hosting providers yet. Create your first one!
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
              <h2 className="text-xl font-bold">Create Hosting Provider</h2>
              <button type="button" onClick={(e) => (e.target as HTMLElement).closest('dialog')?.close()} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Vercel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Slug *</label>
                  <input
                    name="slug"
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="vercel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Leading deployment platform..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Affiliate URL</label>
                  <input
                    name="affiliateUrl"
                    type="url"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="https://partner.vercel.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Referral Code</label>
                  <input
                    name="referralCode"
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., OUR_CODE for ?ref=OUR_CODE"
                  />
                  <p className="text-xs text-slate-400 mt-1">Used to generate referral links like: {process.env.NEXT_PUBLIC_APP_URL}/partners?provider=vercel&ref=OUR_CODE</p>
                </div>
              </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Affiliate URL</label>
                  <input
                    name="affiliateUrl"
                    type="url"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="https://partner.vercel.com/..."
                  />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Commission</label>
                  <input
                    name="commissionRate"
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="$20 per signup"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
                  <select
                    name="commissionType"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cpa">CPA</option>
                    <option value="cpc">CPC</option>
                    <option value="revenue_share">Revenue Share</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Min Payout ($)</label>
                  <input
                    name="minPayout"
                    type="number"
                    min="0"
                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Terms</label>
                <select
                  name="paymentTerms"
                  className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Net-15">Net-15</option>
                  <option value="Net-30">Net-30</option>
                  <option value="Net-45">Net-45</option>
                  <option value="Net-60">Net-60</option>
                </select>
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
                Create Provider
              </button>
            </div>
          </form>
        </dialog>
      </div>
    </div>
  );
}

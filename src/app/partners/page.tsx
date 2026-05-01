import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { hostingProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function PartnersPage() {
  const session = await authenticate(new Request('http://localhost'));
  if (!session) {
    redirect('/');
  }

  const t = await getTranslations('partners');
  const providers = await db
    .select()
    .from(hostingProviders)
    .where(eq(hostingProviders.isActive, true))
    .orderBy(hostingProviders.sortOrder);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors inline-block mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            {t('partner_offers') || 'Partner Hosting Offers'}
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {t('partner_description') ||
              'Deploy your projects with our partner hosting providers and get special offers, free credits, and exclusive deals.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <p className="text-slate-400 text-sm uppercase">Available Providers</p>
            <p className="text-3xl font-bold mt-2">{providers.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <p className="text-slate-400 text-sm uppercase">With Referral Offers</p>
            <p className="text-3xl font-bold mt-2 text-green-400">
              {providers.filter(p => p.referralCode).length}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700/50">
            <p className="text-slate-400 text-sm uppercase">Avg Commission</p>
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

        {/* Providers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden hover:border-blue-500/50 transition-all"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {provider.logoUrl && (
                    <img src={provider.logoUrl} alt={provider.name} className="w-10 h-10 rounded object-cover" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{provider.name}</h3>
                    <p className="text-sm text-slate-400 capitalize">{provider.commissionType || 'cpa'}</p>
                  </div>
                </div>

                {provider.description && (
                  <p className="text-slate-300 text-sm mb-4">{provider.description}</p>
                )}

                {/* Pricing */}
                {provider.pricing && provider.pricing.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-2">Pricing:</p>
                    <div className="space-y-1">
                      {provider.pricing.slice(0, 3).map((plan: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-300">{plan.plan}</span>
                          <span className="text-slate-400">{plan.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {provider.features && provider.features.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-400 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.features.slice(0, 5).map((feature: string, idx: number) => (
                        <span key={idx} className="text-xs bg-slate-700/50 px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commission */}
                {provider.commissionRate && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <p className="text-xs text-green-400 uppercase mb-1">Commission</p>
                    <p className="text-sm font-bold text-green-300">{provider.commissionRate}</p>
                  </div>
                )}
              </div>

              {/* Referral Link */}
              <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/50">
                {provider.referralCode ? (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Special Offer Available:</p>
                    <a
                      href={`${provider.affiliateUrl}?ref=${provider.referralCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm font-medium transition-all justify-center"
                      onClick={async () => {
                        await fetch('/api/referral/track', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: provider.slug,
                            userId: session.id,
                            eventType: 'click',
                          }),
                        });
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Get {provider.name} Credits →
                    </a>
                    <p className="text-xs text-slate-500 mt-2">
                      Using our referral link helps support Deploy Agent
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-500">No special offer available</p>
                    {provider.affiliateUrl && (
                      <a
                        href={provider.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Visit {provider.name} →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {providers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No partner providers available yet.</p>
            <p className="text-slate-500 text-sm mt-2">Check back later for exciting offers!</p>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to deploy?</h2>
          <p className="text-slate-400 mb-6">Choose a provider above and start deploying your projects today.</p>
          <Link href="/projects/new">
            <Button className="px-8 py-3 text-lg">
              Create New Project
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

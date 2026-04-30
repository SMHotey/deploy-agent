import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { hostingProviders, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

export default async function HostingRecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await authenticate(new Request('http://localhost'));
  if (!session) {
    redirect('/');
  }

  const { projectId } = await searchParams;

  // Get active providers
  const providers = await db.select()
    .from(hostingProviders)
    .where(eq(hostingProviders.isActive, true))
    .orderBy(hostingProviders.sortOrder);

  // Get project info if projectId provided
  let project: any = null;
  if (projectId) {
    const result = await db.select().from(projects).where(eq(projects.id, parseInt(projectId))).limit(1);
    project = result[0] || null;
  }

  // Simple recommendation logic (same as API)
  const recommendations = getRecommendations(project, providers);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href={projectId ? `/projects/${projectId}` : '/dashboard'} className="text-slate-400 hover:text-white transition-colors mb-2 inline-block">
            ← {projectId ? 'Back to Project' : 'Back to Dashboard'}
          </Link>
          <h1 className="text-3xl font-bold">Hosting Recommendations</h1>
          {project && (
            <p className="text-slate-400 mt-1">
              Recommended for <span className="text-blue-400">{(project as any).name}</span>
              {(project as any).platform && <span> ({(project as any).platform})</span>}
            </p>
          )}
        </div>

      {/* Project-based recommendation banner */}
      {project && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Why these recommendations?</h2>
          <div className="flex flex-wrap gap-2">
            {(project as any).platform && (
              <span className="px-3 py-1 bg-slate-800 rounded-full text-sm">{(project as any).platform}</span>
            )}
            {(project as any).framework && (
              <span className="px-3 py-1 bg-slate-800 rounded-full text-sm">{(project as any).framework}</span>
            )}
            {(project as any).nodeVersion && (
              <span className="px-3 py-1 bg-slate-800 rounded-full text-sm">Node {(project as any).nodeVersion}</span>
            )}
          </div>
        </div>
      )}

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, index) => (
            <div
              key={rec.provider.id}
              className={`relative bg-slate-800/50 backdrop-blur rounded-xl p-6 border transition-all hover:border-blue-500/50 ${
                index === 0 ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-700/50'
              }`}
            >
              {index === 0 && (
                <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST MATCH
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {rec.provider.logoUrl && (
                    <img src={rec.provider.logoUrl} alt={rec.provider.name} className="w-12 h-12 rounded-lg object-cover bg-white p-1" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold">{rec.provider.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        {rec.matchScore}% Match
                      </span>
                      {rec.provider.commissionType && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                          {rec.provider.commissionType.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {rec.provider.description && (
                <p className="text-slate-400 text-sm mb-4">{rec.provider.description}</p>
              )}

              {/* Match reasons */}
              <div className="mb-4">
                <p className="text-xs text-slate-500 uppercase mb-2">Why this matches</p>
                <ul className="space-y-1">
                  {rec.reasons.map((reason, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features */}
              {rec.provider.features && Array.isArray(rec.provider.features) && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(rec.provider.features as string[]).slice(0, 5).map((feature, i) => (
                      <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {rec.provider.pricing && Array.isArray(rec.provider.pricing) && (
                <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase mb-2">Pricing</p>
                  {(rec.provider.pricing as any[]).slice(0, 3).map((plan, i) => (
                    <div key={i} className="flex justify-between items-center text-sm mb-1">
                      <span className="text-slate-300">{plan.plan}</span>
                      <span className="text-white font-medium">{plan.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Commission info */}
              {rec.provider.commissionRate && (
                <div className="mb-4 text-xs text-slate-400">
                  💰 Commission: {rec.provider.commissionRate}
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/hosting/click', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ providerId: rec.provider.id, projectId: (project as any)?.id }),
                    });
                    const data = await res.json();
                    if (data.affiliateUrl) {
                      window.open(data.affiliateUrl, '_blank', 'noopener,noreferrer');
                    }
                  } catch (err) {
                    console.error('Failed to track click:', err);
                  }
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Visit {rec.provider.name} →
              </button>
            </div>
          ))}

          {recommendations.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400">
              No hosting providers configured yet. Check back later!
            </div>
          )}
        </div>
      </div>

      {/* Client-side click tracking */}
      <Script id="click-tracking" strategy="lazyOnload">
        {`
          async function trackClickAndRedirect(providerId, projectId) {
            try {
              const res = await fetch('/api/hosting/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ providerId, projectId }),
              });
              const data = await res.json();
              if (data.affiliateUrl) {
                window.open(data.affiliateUrl, '_blank', 'noopener,noreferrer');
              }
            } catch (err) {
              console.error('Failed to track click:', err);
            }
          }
        `}
      </Script>
    </div>
  );
}

function getRecommendations(project: any, providers: any[]) {
  if (!project) {
    return providers.map(p => ({
      provider: p,
      matchScore: 50,
      reasons: ['General purpose hosting'],
    }));
  }

  return providers.map(provider => {
    let score = 0;
    const reasons: string[] = [];

    if (provider.categories && Array.isArray(provider.categories)) {
      const categories = provider.categories as string[];

      if (project.platform) {
        if (categories.includes(project.platform.toLowerCase())) {
          score += 30;
          reasons.push(`Supports ${project.platform} platform`);
        }
      }

      if (project.framework) {
        const framework = project.framework.toLowerCase();
        if (framework.includes('next') && categories.includes('nextjs')) {
          score += 25;
          reasons.push('Optimized for Next.js');
        }
        if (framework.includes('react') && categories.includes('react')) {
          score += 20;
          reasons.push('Great React support');
        }
        if (framework.includes('vue') && categories.includes('vue')) {
          score += 20;
          reasons.push('Great Vue support');
        }
        if (framework.includes('static') && categories.includes('static')) {
          score += 25;
          reasons.push('Excellent for static sites');
        }
      }

      if (project.nodeVersion && categories.includes('nodejs')) {
        score += 15;
        reasons.push('Node.js runtime support');
      }

      if (categories.includes('frontend')) score += 10;
      if (categories.includes('fullstack')) score += 15;
      if (categories.includes('jamstack')) score += 10;
    }

    if (provider.features && Array.isArray(provider.features)) {
      const features = provider.features as string[];
      if (features.some((f: string) => f.toLowerCase().includes('edge'))) score += 10;
      if (features.some((f: string) => f.toLowerCase().includes('serverless'))) score += 10;
      if (features.some((f: string) => f.toLowerCase().includes('free'))) score += 15;
    }

    return {
      provider,
      matchScore: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['General purpose hosting'],
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

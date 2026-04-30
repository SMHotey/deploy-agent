import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hostingProviders, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

interface ProjectInfo {
  id: number;
  platform?: string;
  framework?: string;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  nodeVersion?: string | null;
}

export async function GET(request: NextRequest) {
  const session = await authenticate(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Get active hosting providers
    const providers = await db.select()
      .from(hostingProviders)
      .where(eq(hostingProviders.isActive, true))
      .orderBy(hostingProviders.sortOrder);

    if (!projectId) {
      // Return all providers if no project specified
      return NextResponse.json({
        recommendations: providers.map(p => ({
          provider: p,
          matchScore: 0,
          reasons: ['General recommendation'],
          affiliateUrl: p.affiliateUrl,
        })),
      });
    }

    // Get project info for personalized recommendations
    const project = await db.select()
      .from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);

    if (!project.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const proj = project[0] as any;
    const recommendations = getRecommendations(proj, providers);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 });
  }
}

function getRecommendations(project: ProjectInfo, providers: (typeof hostingProviders.$inferSelect)[]) {
  const scored = providers.map(provider => {
    let score = 0;
    const reasons: string[] = [];

    // Match by platform
    if (provider.categories && Array.isArray(provider.categories)) {
      const categories = provider.categories as string[];

      if (project.platform) {
        if (categories.includes(project.platform.toLowerCase())) {
          score += 30;
          reasons.push(`Supports ${project.platform} platform`);
        }
      }

      // Framework-specific matching
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

      // Node.js projects
      if (project.nodeVersion && categories.includes('nodejs')) {
        score += 15;
        reasons.push('Node.js runtime support');
      }

      // General categories
      if (categories.includes('frontend')) score += 10;
      if (categories.includes('fullstack')) score += 15;
      if (categories.includes('jamstack')) score += 10;
    }

    // Feature-based scoring
    if (provider.features && Array.isArray(provider.features)) {
      const features = provider.features as string[];
      if (features.some((f: string) => f.toLowerCase().includes('edge'))) score += 10;
      if (features.some((f: string) => f.toLowerCase().includes('serverless'))) score += 10;
      if (features.some((f: string) => f.toLowerCase().includes('free'))) score += 15;
      if (features.some((f: string) => f.toLowerCase().includes('global cdn'))) score += 8;
    }

    return {
      provider,
      matchScore: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['General purpose hosting'],
      affiliateUrl: provider.affiliateUrl,
    };
  });

  // Sort by match score descending
  return scored.sort((a, b) => b.matchScore - a.matchScore);
}

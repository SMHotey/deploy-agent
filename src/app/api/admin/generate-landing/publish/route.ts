import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { landingPages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import crypto from 'crypto';

interface PublishLandingRequest {
  slug: string;
  config: any;
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticate(request);
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, config } = body as PublishLandingRequest;

    if (!slug || !config) {
      return NextResponse.json(
        { error: 'Missing slug or config' },
        { status: 400 }
      );
    }

    // Validate config structure
    if (!config.hero || !config.features || !config.cta) {
      return NextResponse.json(
        { error: 'Invalid config structure' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db
      .select()
      .from(landingPages)
      .where(eq(landingPages.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(landingPages)
        .set({
          config,
          topic: config.topic || existing[0].topic,
          targetAudience: config.targetAudience || existing[0].targetAudience,
          tone: config.tone || existing[0].tone,
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(landingPages.slug, slug));

      return NextResponse.json({ success: true, slug, updated: true });
    } else {
      // Create new
      await db.insert(landingPages).values({
        slug,
        title: config.hero?.title || 'Untitled',
        topic: config.topic || '',
        targetAudience: config.targetAudience || '',
        tone: config.tone || '',
        config,
        isPublished: true,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({ success: true, slug, created: true });
    }
  } catch (error: any) {
    console.error('Publish landing error:', error);
    return NextResponse.json(
      { error: 'Failed to publish', details: error.message },
      { status: 500 }
    );
  }
}

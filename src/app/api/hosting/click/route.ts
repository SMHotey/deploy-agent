import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hostingProviders, affiliateClicks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await authenticate(request);
    const body = await request.json();
    const { providerId, projectId } = body;

    if (!providerId) {
      return NextResponse.json({ error: 'providerId is required' }, { status: 400 });
    }

    // Verify provider exists and is active
    const provider = await db.select()
      .from(hostingProviders)
      .where(eq(hostingProviders.id, providerId))
      .limit(1);

    if (!provider.length || !provider[0].isActive) {
      return NextResponse.json({ error: 'Provider not found or inactive' }, { status: 404 });
    }

    // Get client IP
    const getClientIp = (req: NextRequest): string | null => {
      return req.headers.get('x-forwarded-for')
        || req.headers.get('x-real-ip')
        || null;
    };

    // Track the click
    await db.insert(affiliateClicks).values({
      providerId,
      userId: (session as any)?.userId || null,
      projectId: projectId || null,
      referrer: request.headers.get('referer') || null,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || null,
    });

    // Return the affiliate URL for redirect
    return NextResponse.json({
      affiliateUrl: provider[0].affiliateUrl,
      providerName: provider[0].name,
    });
  } catch (error) {
    console.error('Failed to track affiliate click:', error);
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
  }
}

// Helper to get client IP
function getClientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || null;
}

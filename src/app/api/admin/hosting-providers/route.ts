import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { hostingProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active_only') === 'true';

  const providers = activeOnly
    ? await db.select().from(hostingProviders).where(eq(hostingProviders.isActive, true)).orderBy(hostingProviders.sortOrder)
    : await db.select().from(hostingProviders).orderBy(hostingProviders.sortOrder);

  return NextResponse.json({ providers });
}

export async function POST(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, slug, description, logoUrl, affiliateUrl, commissionRate, commissionType, minPayout, paymentTerms, categories, features, pricing, sortOrder } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const newProvider = await db.insert(hostingProviders).values({
      name,
      slug,
      description: description || null,
      logoUrl: logoUrl || null,
      affiliateUrl: affiliateUrl || null,
      commissionRate: commissionRate || null,
      commissionType: commissionType || 'cpa',
      minPayout: minPayout || 50,
      paymentTerms: paymentTerms || 'Net-30',
      categories: categories || null,
      features: features || null,
      pricing: pricing || null,
      sortOrder: sortOrder || 0,
    }).returning();

    return NextResponse.json({ provider: newProvider[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create hosting provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, slug, description, logoUrl, affiliateUrl, commissionRate, commissionType, minPayout, paymentTerms, categories, features, pricing, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await db.update(hostingProviders)
      .set({
        name: name || undefined,
        slug: slug || undefined,
        description: description !== undefined ? description : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        affiliateUrl: affiliateUrl !== undefined ? affiliateUrl : undefined,
        commissionRate: commissionRate !== undefined ? commissionRate : undefined,
        commissionType: commissionType || undefined,
        minPayout: minPayout !== undefined ? minPayout : undefined,
        paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
        categories: categories !== undefined ? categories : undefined,
        features: features !== undefined ? features : undefined,
        pricing: pricing !== undefined ? pricing : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        updatedAt: new Date(),
      })
      .where(eq(hostingProviders.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ provider: updated[0] });
  } catch (error) {
    console.error('Failed to update hosting provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const deleted = await db.delete(hostingProviders)
      .where(eq(hostingProviders.id, parseInt(id)))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete hosting provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}

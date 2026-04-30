import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { marketingActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  const query = db.select().from(marketingActivities);
  if (status) query.where(eq(marketingActivities.status, status));
  if (type) query.where(eq(marketingActivities.type, type));

  const activities = await query.orderBy(marketingActivities.createdAt);

  return NextResponse.json({ activities });
}

export async function POST(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, type, status, startDate, endDate, budgetCents, targetAudience, conversionGoal, notes } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Title and type are required' }, { status: 400 });
    }

    const newActivity = await db.insert(marketingActivities).values({
      title,
      description: description || null,
      type,
      status: status || 'draft',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budgetCents: budgetCents || 0,
      targetAudience: targetAudience || null,
      conversionGoal: conversionGoal || null,
      currentConversions: 0,
      notes: notes || null,
      createdBy: session.id,
    }).returning();

    return NextResponse.json({ activity: newActivity[0] }, { status: 201 });
  } catch (error) {
    console.error('Failed to create marketing activity:', error);
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
  }
}

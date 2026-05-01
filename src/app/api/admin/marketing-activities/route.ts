import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { marketingActivities } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  try {
    const activities = await db
      .select()
      .from(marketingActivities)
      .orderBy(marketingActivities.createdAt);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
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

export async function PUT(request: NextRequest) {
  const session = await authenticate(request);
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, title, description, type, status, startDate, endDate, budgetCents, targetAudience, conversionGoal, currentConversions, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updated = await db.update(marketingActivities)
      .set({
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        type: type || undefined,
        status: status || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budgetCents: budgetCents !== undefined ? budgetCents : undefined,
        targetAudience: targetAudience !== undefined ? targetAudience : undefined,
        conversionGoal: conversionGoal !== undefined ? conversionGoal : undefined,
        currentConversions: currentConversions !== undefined ? currentConversions : undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(marketingActivities.id, id))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ activity: updated[0] });
  } catch (error) {
    console.error('Failed to update marketing activity:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
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

    const deleted = await db.delete(marketingActivities)
      .where(eq(marketingActivities.id, parseInt(id)))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete marketing activity:', error);
    return NextResponse.json({ error: 'Failed to delete activity' }, { status: 500 });
  }
}

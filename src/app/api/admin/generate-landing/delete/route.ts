import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { landingPages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await authenticate(request);
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    await db
      .delete(landingPages)
      .where(eq(landingPages.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete landing error:', error);
    return NextResponse.json(
      { error: 'Failed to delete', details: error.message },
      { status: 500 }
    );
  }
}

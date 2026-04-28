import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const filePath = join(process.cwd(), 'README_RU.md');
    const content = await readFile(filePath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Failed to read instructions:', error);
    return NextResponse.json(
      { error: 'Could not load instructions' },
      { status: 500 }
    );
  }
}
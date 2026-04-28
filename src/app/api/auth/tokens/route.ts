import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { storeUserTokens } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Save tokens request', { userId: user.id });

    const body = await request.json();
    const { vercelToken, githubToken, supabaseToken } = body;

    const tokens: any = {};
    if (vercelToken) tokens.vercelToken = vercelToken;
    if (githubToken) tokens.githubToken = githubToken;
    if (supabaseToken) tokens.supabaseToken = supabaseToken;

    if (Object.keys(tokens).length === 0) {
      return NextResponse.json(
        { error: 'No tokens provided' },
        { status: 400 }
      );
    }

    await storeUserTokens(user.id, tokens, process.env.ENCRYPTION_KEY!);

    logger.info('Tokens saved', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Tokens saved successfully',
    });
  } catch (error) {
    logger.error('Save tokens error', { error });
    return NextResponse.json(
      { error: 'Failed to save tokens' },
      { status: 500 }
    );
  }
}

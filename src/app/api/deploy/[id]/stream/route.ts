import { NextRequest, NextResponse } from 'next/server';
import { createVercelClient } from '@/lib/vercel';
import { authenticate } from '@/lib/auth';
import { getUserTokens } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: deploymentId } = await params;
    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID required' },
        { status: 400 }
      );
    }

    // Get user tokens
    const tokens = await getUserTokens(user.id, process.env.ENCRYPTION_KEY!);
    const vercelToken = request.headers.get('x-vercel-token') || tokens.vercelToken;
    
    if (!vercelToken) {
      return NextResponse.json(
        { error: 'Vercel token required' },
        { status: 401 }
      );
    }

    const vercel = createVercelClient(
      vercelToken,
      request.headers.get('x-vercel-team-id') || undefined
    );

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          let lastState = '';
          let pollCount = 0;
          const maxPolls = 60; // 5 minutes (5s intervals)
          
          sendEvent('start', { message: 'Monitoring deployment...' });

          while (pollCount < maxPolls) {
            pollCount++;
            
            try {
              const deployment = await vercel.getDeployment(deploymentId);
              
              if (!deployment) {
                sendEvent('error', { error: 'Deployment not found' });
                break;
              }

              const currentState = deployment.state;
              
              // Send update if state changed
              if (currentState !== lastState) {
                lastState = currentState;
                
                sendEvent('status', {
                  state: currentState,
                  url: deployment.url,
                  ready: deployment.ready,
                  created: deployment.created,
                });

                // If deployment finished
                if (currentState === 'READY' || currentState === 'ERROR') {
                  const logs = deployment.builds?.map((b: any) => 
                    `${b.state}: ${b.use} - ${b.error || 'OK'}`
                  ).join('\n') || '';

                  sendEvent('complete', {
                    state: currentState,
                    url: deployment.url,
                    logsUrl: `https://vercel.com/${request.headers.get('x-vercel-team-id') || ''}/deployments/${deploymentId}`,
                    logs,
                    success: currentState === 'READY',
                  });

                  break;
                }
              }

              // Check if client disconnected
              if (controller.desiredSize === null) {
                logger.info('Client disconnected from SSE stream');
                break;
              }

              // Wait 5 seconds
              await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
              logger.error('SSE poll error', { error, pollCount });
              sendEvent('error', { 
                error: error instanceof Error ? error.message : 'Poll failed',
                retry: pollCount < maxPolls,
              });
              
              if (pollCount >= maxPolls) break;
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }

          if (pollCount >= maxPolls) {
            sendEvent('timeout', { message: 'Deployment monitoring timed out' });
          }

        } catch (error) {
          logger.error('SSE stream error', { error });
          try {
            sendEvent('error', { 
              error: error instanceof Error ? error.message : 'Stream failed' 
            });
          } catch {
            // Controller might be closed
          }
        } finally {
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    });

  } catch (error) {
    logger.error('SSE endpoint error', { error });
    return NextResponse.json(
      { error: 'Failed to start stream' },
      { status: 500 }
    );
  }
}

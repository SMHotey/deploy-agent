import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/db';
import { deployments, projects, users, reviews, projectSubmissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createClient, type RedisClient } from '@/lib/redis';
import { withRetry, type RetryResult } from '@/lib/retry';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface AnalyzeRequest {
  type: 'deploy-error' | 'review-feedback';
  deploymentId?: number;
  reviewId?: number;
}

interface AnalyzeResponse {
  analysis: string;
  steps: string[];
}

// Redis client for caching
let redisClient: RedisClient | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = createClient(process.env.REDIS_URL);
      await redisClient.connect();
    } catch (error) {
      console.error('Redis connection failed:', error);
      return null;
    }
  }
  return redisClient;
}

// Cache functions
async function getCachedAnalysis(cacheKey: string): Promise<AnalyzeResponse | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const cached = await client.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

async function cacheAnalysis(cacheKey: string, data: AnalyzeResponse): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    
    // Cache for 1 hour (3600 seconds)
    await client.setex(cacheKey, 3600, JSON.stringify(data));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// Fetch deploy logs
async function fetchDeployLogs(deploymentId: number): Promise<string> {
  // Try Redis first (realtime logs)
  try {
    const client = await getRedisClient();
    if (client) {
      const logs = await client.get(`deploy:logs:${deploymentId}`);
      if (logs) return logs;
    }
  } catch (error) {
    console.error('Redis logs fetch error:', error);
  }

  // Fallback to database
  const deployment = await db
    .select({ logs: deployments.logs })
    .from(deployments)
    .where(eq(deployments.id, deploymentId))
    .limit(1);
  
  return deployment[0]?.logs || 'No logs available';
}

// Fetch review data
async function fetchReviewData(reviewId: number): Promise<{
  content: string;
  rating: number;
  bugsFound: number;
  testingChecklist: any;
  screenshots: string | null;
  projectTitle: string;
} | null> {
  const review = await db
    .select({
      id: reviews.id,
      content: reviews.content,
      rating: reviews.rating,
      bugsFound: reviews.bugsFound,
      testingChecklist: reviews.testingChecklist,
      screenshots: reviews.screenshots,
      projectTitle: projectSubmissions.title,
    })
    .from(reviews)
    .leftJoin(projectSubmissions, eq(projectSubmissions.id, reviews.submissionId))
    .where(eq(reviews.id, reviewId))
    .limit(1);

  if (!review[0]) return null;

  return {
    content: review[0].content,
    rating: review[0].rating,
    bugsFound: review[0].bugsFound,
    testingChecklist: review[0].testingChecklist,
    screenshots: review[0].screenshots,
    projectTitle: review[0].projectTitle || 'Unknown Project',
  };
}

// Call OpenAI with retry
async function callOpenAI(systemPrompt: string, userMessage: string): Promise<AnalyzeResponse> {
  const result: RetryResult<string> = await withRetry(
    async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }
      
      return content;
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      shouldRetry: (error) => {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
        return (
          message.includes('429') ||
          message.includes('rate limit') ||
          message.includes('500') ||
          message.includes('502') ||
          message.includes('503') ||
          message.includes('timeout') ||
          message.includes('econnrefused')
        );
      },
    }
  );

  if (!result.success) {
    throw new Error(`OpenAI API failed after ${result.attempts} attempts: ${result.error}`);
  }

  try {
    const parsed = JSON.parse(result.data);
    if (!parsed.analysis || !Array.isArray(parsed.steps)) {
      throw new Error('Invalid JSON structure from OpenAI');
    }
    return {
      analysis: parsed.analysis,
      steps: parsed.steps,
    };
  } catch (error) {
    throw new Error(`Failed to parse OpenAI response as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const { type, deploymentId, reviewId } = body as AnalyzeRequest;

    if (!type || (type !== 'deploy-error' && type !== 'review-feedback')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "deploy-error" or "review-feedback"' },
        { status: 400 }
      );
    }

    if (type === 'deploy-error' && !deploymentId) {
      return NextResponse.json(
        { error: 'deploymentId is required for deploy-error analysis' },
        { status: 400 }
      );
    }

    if (type === 'review-feedback' && !reviewId) {
      return NextResponse.json(
        { error: 'reviewId is required for review-feedback analysis' },
        { status: 400 }
      );
    }

    // 3. Check permissions and fetch data
    let cacheKey = '';
    let userMessage = '';
    let systemPrompt = '';

    if (type === 'deploy-error' && deploymentId) {
      // Check if user has access to this deployment
      const deployment = await db
        .select({
          id: deployments.id,
          projectId: deployments.projectId,
          logs: deployments.logs,
          status: deployments.status,
          userId: projects.userId,
        })
        .from(deployments)
        .leftJoin(projects, eq(projects.id, deployments.projectId))
        .where(eq(deployments.id, deploymentId))
        .limit(1);

      if (!deployment[0]) {
        return NextResponse.json(
          { error: 'Deployment not found' },
          { status: 404 }
        );
      }

      if (deployment[0].userId !== user.id && !user.isAdmin) {
        return NextResponse.json(
          { error: 'Access denied to this deployment' },
          { status: 403 }
        );
      }

      // Fetch logs
      const logs = await fetchDeployLogs(deploymentId);
      
      cacheKey = `ai:analysis:deploy-error:${deploymentId}`;
      systemPrompt = `You are a DevOps expert helping developers understand deployment failures. 
Explain in simple terms what went wrong and provide clear, actionable steps to fix the issue.
Always respond in JSON format with "analysis" (string) and "steps" (array of strings).
Be concise but thorough. Focus on the most likely causes first.`;

      userMessage = `Deployment failed with status: ${deployment[0].status}\n\nHere are the logs:\n${logs}`;
    }

    if (type === 'review-feedback' && reviewId) {
      // Fetch review data
      const reviewData = await fetchReviewData(reviewId);
      if (!reviewData) {
        return NextResponse.json(
          { error: 'Review not found' },
          { status: 404 }
        );
      }

      // Check if user is the project author (to get recommendations)
      const submission = await db
        .select({ userId: projectSubmissions.userId })
        .from(projectSubmissions)
        .where(eq(projectSubmissions.id, reviewId))
        .limit(1);

      if (!submission[0] || (submission[0].userId !== user.id && !user.isAdmin)) {
        return NextResponse.json(
          { error: 'Only the project author can get AI recommendations' },
          { status: 403 }
        );
      }

      cacheKey = `ai:analysis:review-feedback:${reviewId}`;
      systemPrompt = `You are a Tech Lead reviewing testing feedback for a web application.
Based on the review, provide the author with a list of specific, actionable recommendations 
to improve UX, performance, and security. 
Always respond in JSON format with "analysis" (string) and "steps" (array of strings).
Focus on the most critical issues first. Be specific and technical.`;

      userMessage = `Project: ${reviewData.projectTitle}
Review Rating: ${reviewData.rating}/5
Bugs Found: ${reviewData.bugsFound}
Testing Checklist: ${JSON.stringify(reviewData.testingChecklist)}
Screenshots: ${reviewData.screenshots ? 'Available' : 'Not provided'}

Review Content:
${reviewData.content}`;
    }

    // 4. Check cache first
    const cached = await getCachedAnalysis(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // 5. Call OpenAI
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in environment variables.' },
        { status: 503 }
      );
    }

    let analysisResult: AnalyzeResponse;
    try {
      analysisResult = await callOpenAI(systemPrompt, userMessage);
    } catch (error) {
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to analyze with AI. Please try again later.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 503 }
      );
    }

    // 6. Cache the result
    await cacheAnalysis(cacheKey, analysisResult);

    // 7. Return result
    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error('AI analyze error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

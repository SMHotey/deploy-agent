import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { OpenAI } from 'openai';

interface AnalyzeRequest {
  type: 'deploy-error' | 'review-feedback' | 'market-description';
  deploymentId?: number;
  reviewId?: number;
  projectName?: string;
  description?: string;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { type, deploymentId, reviewId, projectName, description } = body as AnalyzeRequest;

    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    logger.info('AI analysis request', { type, userId: user.id });

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API is not configured. Please set OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Handle different types
    if (type === 'market-description') {
      return await handleMarketDescription(openai, projectName, description, logger);
    }

    // Original deploy-error or review-feedback logic
    if (type === 'deploy-error' && deploymentId) {
      return await handleDeployError(openai, deploymentId, user.id, logger);
    }

    if (type === 'review-feedback' && reviewId) {
      return await handleReviewFeedback(openai, reviewId, user.id, logger);
    }

    return NextResponse.json(
      { error: 'Invalid type or missing required parameters' },
      { status: 400 }
    );

  } catch (error: any) {
    logger.error('AI analyze error', { error: error.message });
    return NextResponse.json(
      { error: 'Failed to analyze with AI. Please try again later.' },
      { status: 503 }
    );
  }
}

async function handleMarketDescription(
  openai: OpenAI,
  projectName?: string,
  description?: string,
  logger?: any
): Promise<NextResponse> {
  try {
    const prompt = `Generate a concise market analysis for a project with the following details:

Project Name: ${projectName || 'Unknown'}
Description: ${description || 'No description provided'}

Please provide:
1. A brief (2-3 sentences) market analysis of this type of project
2. Key market opportunities
3. Potential challenges

Format the response as JSON:
{
  "analysis": "brief market analysis text",
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "challenges": ["challenge 1", "challenge 2", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a market analysis expert. Provide concise, actionable insights.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content);
    
    logger?.info('Market description generated', { projectName });
    
    return NextResponse.json({
      analysis: result.analysis || 'Market analysis not available.',
      opportunities: result.opportunities || [],
      challenges: result.challenges || [],
    });
  } catch (error: any) {
    logger?.error('Market description error', { error: error.message });
    throw error;
  }
}

async function handleDeployError(
  openai: OpenAI,
  deploymentId: number,
  userId: number,
  logger?: any
): Promise<NextResponse> {
  // TODO: Fetch deployment logs from database
  const mockLogs = 'Error: Cannot find module "config"\n at Function.Module._resolveFilename (internal/modules/cjs/loader.js:636:15)';

  const prompt = `Analyze this deployment error log and provide clear explanation and steps to fix:

${mockLogs}

Format the response as JSON:
{
  "analysis": "clear explanation of what went wrong",
  "steps": ["step 1", "step 2", ...]
}`;

  const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a deployment debugging expert. Be clear and actionable.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);
  
  logger?.info('Deploy error analyzed', { deploymentId, userId });
  
  return NextResponse.json(result);
}

async function handleReviewFeedback(
  openai: OpenAI,
  reviewId: number,
  userId: number,
  logger?: any
): Promise<NextResponse> {
  // TODO: Fetch review content from database
  const mockReview = {
    rating: 3,
    title: 'Good concept but needs work',
    content: 'The UI is confusing and there are several bugs.',
    bugsFound: 3,
  };

  const prompt = `Based on this review of a project, provide actionable recommendations for the project author:

Rating: ${mockReview.rating}/5
Title: ${mockReview.title}
Content: ${mockReview.content}
Bugs found: ${mockReview.bugsFound}

Format the response as JSON:
{
  "analysis": "summary of what needs improvement",
  "steps": ["recommendation 1", "recommendation 2", ...]
}`;

  const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a code review expert. Provide specific, actionable recommendations.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const result = JSON.parse(content);  
  logger?.info('Review feedback analyzed', { reviewId, userId });  
  return NextResponse.json(result);
}

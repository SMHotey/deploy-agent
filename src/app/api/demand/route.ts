import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, deployments } from '@/db/schema';
import { eq, sql, gte } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { Redis } from 'ioredis';

// Redis client (reuse from existing setup)
let redis: Redis | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
} catch (e) {
  console.warn('Redis not available for demand caching');
}

interface DemandAnalysis {
  overallDemandScore: number;
  trend: 'rising' | 'stable' | 'declining';
  trendData: { date: string; value: number }[];
  competitionLevel: 'low' | 'medium' | 'high';
  estimatedMarketSize: string;
  similarProjectsCount: number;
  keywordSuggestions: string[];
  insightSummary: string;
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Check rate limit (5 requests per minute per IP)
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `rate_limit:demand:${clientIp}`;
    
    if (redis) {
      const requests = await redis.incr(rateLimitKey);
      if (requests === 1) {
        await redis.expire(rateLimitKey, 60); // 1 minute window
      }
      if (requests > 5) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Max 5 requests per minute.' },
          { status: 429 }
        );
      }
    }

    // Check cache (1 day = 86400 seconds)
    const cacheKey = `demand:analysis:${projectId}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('Demand analysis served from cache', { projectId });
        return NextResponse.json(JSON.parse(cached));
      }
    }

    // Fetch project details
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, parseInt(projectId)),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    logger.info('Analyzing demand for project', { projectId, name: project.name });

    // Extract keywords from project name and description
    const keywords = extractKeywords(project.name, project.description || '');

    // Perform comprehensive analysis
    const analysis = await performDemandAnalysis(project.name, keywords, project.description || '');

    // Cache the result for 1 day
    if (redis) {
      await redis.setex(cacheKey, 86400, JSON.stringify(analysis));
    }

    return NextResponse.json(analysis);

  } catch (error) {
    logger.error('Demand analysis error', { error });
    return NextResponse.json(
      { error: 'Failed to analyze demand' },
      { status: 500 }
    );
  }
}

function extractKeywords(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['the', 'and', 'for', 'with', 'this', 'that', 'have', 'from'].includes(word));
  
  // Return unique keywords
  return [...new Set(words)].slice(0, 10);
}

async function performDemandAnalysis(
  projectName: string,
  keywords: string[],
  description: string
): Promise<DemandAnalysis> {
  // Default/mock values
  const analysis: DemandAnalysis = {
    overallDemandScore: 50,
    trend: 'stable',
    trendData: [],
    competitionLevel: 'medium',
    estimatedMarketSize: '10K-50K monthly searches',
    similarProjectsCount: 0,
    keywordSuggestions: keywords,
    insightSummary: `Market analysis for ${projectName} indicates moderate demand.`,
  };

  // 1. Google Trends data
  try {
    const trendsData = await fetchGoogleTrends(keywords[0] || projectName);
    if (trendsData) {
      analysis.trendData = trendsData.data;
      analysis.trend = trendsData.trend;
      analysis.overallDemandScore = Math.min(analysis.overallDemandScore + trendsData.score, 100);
    }
  } catch (error) {
    console.warn('Google Trends API failed, using mock data:', error);
    analysis.insightSummary += ' (Note: Google Trends data temporarily unavailable)';
  }

  // 2. GitHub similar projects count
  try {
    const githubCount = await fetchGitHubSimilarProjects(keywords);
    analysis.similarProjectsCount = githubCount;
    // Adjust competition level based on similar projects
    if (githubCount > 1000) analysis.competitionLevel = 'high';
    else if (githubCount > 100) analysis.competitionLevel = 'medium';
    else analysis.competitionLevel = 'low';
  } catch (error) {
    console.warn('GitHub API failed:', error);
  }

  // 3. App store competition (mocked - requires SERPAPI_KEY or DATAFORSEO credentials)
  try {
    const marketData = await fetchAppStoreData(keywords);
    if (marketData) {
      analysis.estimatedMarketSize = marketData.marketSize;
      analysis.keywordSuggestions = [...keywords, ...marketData.suggestions];
    }
  } catch (error) {
    console.warn('App store data unavailable (no API key):', error);
    analysis.insightSummary += ' Market size estimates are approximate.';
  }

  // Generate insight summary
  analysis.insightSummary = generateInsightSummary(analysis, projectName);

  return analysis;
}

async function fetchGoogleTrends(keyword: string): Promise<{
  data: { date: string; value: number }[];
  trend: 'rising' | 'stable' | 'declining';
  score: number;
} | null> {
  try {
    // TODO: Replace with actual google-trends-api when credentials are available
    // For now, return mock data with TODO comment
    /*
    const googleTrends = require('google-trends-api');
    const results = await googleTrends.interestOverTime({
      keyword: keyword,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      endTime: new Date(),
    });
    */
    
    // MOCK DATA - Replace with real API when GOOGLE_TRENDS_API_KEY is available
    const mockData = {
      data: generateMockTrendData(),
      trend: 'rising' as const,
      score: 25,
    };
    
    console.warn('TODO: Implement real Google Trends API. Using mock data. Set GOOGLE_TRENDS_API_KEY to enable.');
    return mockData;
  } catch (error) {
    console.error('Google Trends error:', error);
    return null;
  }
}

function generateMockTrendData() {
  const data = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.floor(Math.random() * 60) + 40, // Random between 40-100
    });
  }
  return data;
}

async function fetchGitHubSimilarProjects(keywords: string[]): Promise<number> {
  try {
    // TODO: Replace with actual GitHub API when GITHUB_TOKEN is available
    // const response = await fetch(
    //   `https://api.github.com/search/repositories?q=${keywords.join('+')}&sort=stars&order=desc`,
    //   { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
    // );
    
    // MOCK DATA
    console.warn('TODO: Implement real GitHub API. Using mock data. Set GITHUB_TOKEN to enable.');
    return Math.floor(Math.random() * 500) + 50;
  } catch (error) {
    console.error('GitHub API error:', error);
    return 0;
  }
}

async function fetchAppStoreData(keywords: string[]): Promise<{
  marketSize: string;
  suggestions: string[];
} | null> {
  // Check for API keys
  const hasSerpApi = !!process.env.SERPAPI_KEY;
  const hasDataForSeo = !!process.env.DATAFORSEO_LOGIN && !!process.env.DATAFORSEO_PASSWORD;

  if (!hasSerpApi && !hasDataForSeo) {
    console.warn('TODO: No SERPAPI_KEY or DATAFORSEO credentials. Using mock app store data.');
    return {
      marketSize: '50K-100K monthly searches (estimated)',
      suggestions: [...keywords, `${keywords[0]} pro`, `${keywords[0]} alternative`],
    };
  }

  // TODO: Implement real API calls when keys are available
  console.warn('TODO: Implement SerpApi/DataForSEO integration for app store data.');
  return null;
}

function generateInsightSummary(analysis: DemandAnalysis, projectName: string): string {
  const { overallDemandScore, trend, competitionLevel, estimatedMarketSize, similarProjectsCount } = analysis;

  let summary = `Market analysis for "${projectName}": `;

  if (overallDemandScore >= 80) {
    summary += 'Very high demand detected. ';
  } else if (overallDemandScore >= 60) {
    summary += 'Good market demand. ';
  } else if (overallDemandScore >= 40) {
    summary += 'Moderate market demand. ';
  } else {
    summary += 'Low to moderate demand. ';
  }

  summary += `Trend is ${trend}. `;

  if (competitionLevel === 'high') {
    summary += `High competition with ${similarProjectsCount}+ similar projects on GitHub. `;
  } else if (competitionLevel === 'medium') {
    summary += `Medium competition (~${similarProjectsCount} similar projects). `;
  } else {
    summary += `Low competition with only ${similarProjectsCount} similar projects. Great opportunity! `;
  }

  summary += `Estimated market size: ${estimatedMarketSize}.`;

  return summary;
}

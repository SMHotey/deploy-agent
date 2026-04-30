import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { repo_url } = body;

    if (!repo_url) {
      return NextResponse.json({ error: 'repo_url is required' }, { status: 400 });
    }

    // Validate URL format
    const urlMatch = repo_url.match(/github\.com[/:]([^/]+)[/]([^/]+?)(?:\.git)?$/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Only GitHub repositories are supported at this time' },
        { status: 400 }
      );
    }

    const [, owner, repo] = urlMatch;
    const repoFullName = `${owner}/${repo.replace(/\.git$/, '')}`;

    logger.info('Analyzing repository', { repo: repoFullName });

    // Fetch repo info and detect project structure
    const analysis = await analyzeRepository(repoFullName, process.env.GITHUB_TOKEN);

    return NextResponse.json({
      success: true,
      repo: {
        name: repoFullName,
        description: analysis.description,
        primary_language: analysis.primaryLanguage,
        stars: analysis.stars,
        topics: analysis.topics,
      },
      analysis: {
        framework: analysis.framework,
        framework_confidence: analysis.confidence,
        build_tool: analysis.buildTool,
        package_manager: analysis.packageManager,
        suggested_platform: analysis.suggestedPlatform,
        suggested_branch: analysis.suggestedBranch || 'main',
        environment_variables: analysis.suggestedEnvVars,
        notes: analysis.notes,
      },
      recommendations: {
        platform: analysis.suggestedPlatform,
        template: analysis.suggestedTemplate,
        deploy_command: analysis.deployCommand,
        estimated_build_time: analysis.estimatedBuildTime,
        warnings: analysis.warnings,
      },
    });

  } catch (error) {
    logger.error('Repo analysis error', { error });
    return NextResponse.json(
      { error: 'Failed to analyze repository' },
      { status: 500 }
    );
  }
}

interface RepoAnalysis {
  description?: string;
  primaryLanguage?: string;
  stars?: number;
  topics?: string[];
  framework?: string;
  confidence: number;
  buildTool?: string;
  packageManager?: string;
  suggestedPlatform: string;
  suggestedBranch?: string;
  suggestedTemplate?: string;
  suggestedEnvVars?: Record<string, string>;
  deployCommand?: string;
  estimatedBuildTime?: string;
  notes: string[];
  warnings: string[];
}

async function analyzeRepository(repoFullName: string, githubToken?: string): Promise<RepoAnalysis> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const results = await Promise.allSettled([
    fetch(`https://api.github.com/repos/${repoFullName}`, { headers }),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/package.json`, { headers }).then(r => r.ok ? r.json() : null),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/next.config.js`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/vite.config.ts`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/vite.config.js`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/astro.config.mjs`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/angular.json`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/vue.config.js`, { headers }).then(r => r.ok),
    fetch(`https://api.github.com/repos/${repoFullName}/contents/Dockerfile`, { headers }).then(r => r.ok),
  ]);

  const repoInfo = results[0].status === 'fulfilled' ? await results[0].value.json() : {};
  const packageJson = results[1].status === 'fulfilled' ? results[1].value : null;
  const hasNextConfig = results[2].status === 'fulfilled' ? results[2].value : false;
  const hasViteConfig = results[3].status === 'fulfilled' ? results[3].value || results[4].status === 'fulfilled' && results[4].value : false;
  const hasAstroConfig = results[5].status === 'fulfilled' ? results[5].value : false;
  const hasAngular = results[6].status === 'fulfilled' ? results[6].value : false;
  const hasVueConfig = results[7].status === 'fulfilled' ? results[7].value : false;
  const hasDockerfile = results[8].status === 'fulfilled' ? results[8].value : false;

  // Analyze package.json
  let framework = 'unknown';
  let confidence = 0;
  let buildTool = 'npm run build';
  let packageManager = 'npm';
  let suggestedPlatform = 'vercel';
  let suggestedTemplate = 'nextjs-vercel';
  let deployCommand = 'npm run build';
  let estimatedBuildTime = '1-3 minutes';
  const notes: string[] = [];
  const warnings: string[] = [];
  const envVars: Record<string, string> = {};

  if (packageJson) {
    const pkg = typeof packageJson === 'string' ? JSON.parse(packageJson) : packageJson;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.next) {
      framework = 'Next.js';
      confidence = hasNextConfig ? 95 : 80;
      buildTool = 'next build';
      deployCommand = 'npm run build';
      suggestedTemplate = 'nextjs-vercel';
      suggestedPlatform = 'vercel';
      estimatedBuildTime = '2-4 minutes';
      notes.push('Next.js project detected - optimized for Vercel deployment');
      if (deps['next-auth']) envVars['NEXTAUTH_SECRET'] = 'generate-strong-secret-here';
      if (deps['@prisma/client']) {
        notes.push('Prisma detected - ensure database is configured');
        envVars['DATABASE_URL'] = 'your-database-url-here';
      }
    } else if (hasViteConfig || deps.react && deps['react-dom']) {
      framework = 'React (Vite)';
      confidence = 90;
      buildTool = 'vite build';
      deployCommand = 'npm run build';
      suggestedTemplate = 'react-vite';
      suggestedPlatform = 'vercel';
      estimatedBuildTime = '1-3 minutes';
      notes.push('Vite-based React app - fast builds on Vercel');
    } else if (hasVueConfig || deps.vue) {
      framework = 'Vue.js';
      confidence = 90;
      buildTool = 'vite build';
      deployCommand = 'npm run build';
      suggestedTemplate = 'vue-vite';
      suggestedPlatform = 'vercel';
      estimatedBuildTime = '1-3 minutes';
      notes.push('Vue.js project detected');
    } else if (hasAstroConfig || deps.astro) {
      framework = 'Astro';
      confidence = 95;
      buildTool = 'astro build';
      deployCommand = 'npm run build';
      suggestedTemplate = 'astro-static';
      suggestedPlatform = 'vercel';
      estimatedBuildTime = '1-2 minutes';
      notes.push('Astro static site - excellent for documentation and content sites');
    } else if (hasAngular || deps['@angular/core']) {
      framework = 'Angular';
      confidence = 85;
      buildTool = 'ng build';
      deployCommand = 'npm run build';
      suggestedTemplate = 'react-vite'; // No Angular template yet
      suggestedPlatform = 'vercel';
      estimatedBuildTime = '3-5 minutes';
      warnings.push('Angular deployment may require additional configuration');
    } else if (hasDockerfile) {
      framework = 'Docker';
      confidence = 70;
      buildTool = 'docker build';
      suggestedPlatform = 'railway';
      suggestedTemplate = 'express-api';
      estimatedBuildTime = '3-10 minutes';
      warnings.push('Docker deployment requires Railway or self-hosted');
      notes.push('Dockerfile detected - consider Railway or custom deployment');
    } else {
      framework = 'Node.js / Other';
      confidence = 50;
      suggestedPlatform = 'vercel';
      suggestedTemplate = 'express-api';
      warnings.push('Could not auto-detect framework - manual configuration may be required');
    }

    // Detect package manager
    if (deps.pnpm) packageManager = 'pnpm';
    else if (deps.yarn) packageManager = 'yarn';
    else packageManager = 'npm';
  }

  if (repoInfo.language) {
    if (repoInfo.language === 'TypeScript' || repoInfo.language === 'JavaScript') {
      // Already handled above
    }
  }

  if (repoInfo.description) {
    notes.push(`Repository: ${repoInfo.description}`);
  }

  return {
    description: repoInfo.description,
    primaryLanguage: repoInfo.language,
    stars: repoInfo.stargazers_count,
    topics: repoInfo.topics,
    framework,
    confidence,
    buildTool,
    packageManager,
    suggestedPlatform,
    suggestedBranch: repoInfo.default_branch || 'main',
    suggestedTemplate,
    suggestedEnvVars: Object.keys(envVars).length > 0 ? envVars : undefined,
    deployCommand,
    estimatedBuildTime,
    notes,
    warnings,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

interface RepoAnalysis {
  repoUrl: string;
  platform: 'github' | 'gitlab' | 'bitbucket' | 'unknown';
  repoName: string;
  defaultBranch: string;
  stack: {
    frontend: string[];
    backend: string[];
    database: string[];
    infra: string[];
  };
  frameworks: string[];
  buildTool: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
  recommendedHosting: string[];
  estimatedBuildTime: number; // in seconds
  requirements: {
    nodeVersion?: string;
    pythonVersion?: string;
    environmentVars: { key: string; required: boolean; description: string }[];
    buildCommand?: string;
    outputDirectory?: string;
  };
  fileStructure: {
    hasDockerfile: boolean;
    hasDockerCompose: boolean;
    hasNextConfig: boolean;
    hasPackageJson: boolean;
    hasRequirementsTxt: boolean;
    hasMakefile: boolean;
  };
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
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    // Parse repo URL
    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
    }

    logger.info('Analyzing repository', { repoUrl, ...repoInfo });

    // In a real implementation, this would:
    // 1. Fetch repo metadata via GitHub/GitLab API
    // 2. Read key files (package.json, requirements.txt, Dockerfile, etc.)
    // 3. Analyze dependencies and structure
    // For now, return an analysis based on URL patterns

    const analysis: RepoAnalysis = {
      repoUrl,
      platform: repoInfo.platform,
      repoName: repoInfo.repoName,
      defaultBranch: 'main', // Would fetch from API
      stack: {
        frontend: detectFrontend(repoUrl),
        backend: detectBackend(repoUrl),
        database: detectDatabase(repoUrl),
        infra: detectInfra(repoUrl),
      },
      frameworks: detectFrameworks(repoUrl),
      buildTool: detectBuildTool(repoUrl),
      packageManager: detectPackageManager(repoUrl),
      recommendedHosting: recommendHosting(repoUrl),
      estimatedBuildTime: estimateBuildTime(repoUrl),
      requirements: {
        environmentVars: suggestEnvVars(repoUrl),
        buildCommand: suggestBuildCommand(repoUrl),
        outputDirectory: suggestOutputDir(repoUrl),
      },
      fileStructure: {
        hasDockerfile: false, // Would check via API
        hasDockerCompose: false,
        hasNextConfig: repoUrl.includes('next'),
        hasPackageJson: true, // Most repos have this
        hasRequirementsTxt: repoUrl.includes('python'),
        hasMakefile: false,
      },
    };

    return NextResponse.json({ analysis });
  } catch (error) {
    logger.error('Repo analysis error', { error });
    return NextResponse.json(
      { error: 'Failed to analyze repository' },
      { status: 500 }
    );
  }
}

function parseRepoUrl(url: string): { platform: 'github' | 'gitlab' | 'bitbucket' | 'unknown'; owner: string; repoName: string } | null {
  // GitHub: https://github.com/owner/repo
  const githubMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (githubMatch) {
    return { platform: 'github', owner: githubMatch[1], repoName: githubMatch[2].replace(/\.git$/, '') };
  }

  // GitLab: https://gitlab.com/owner/repo
  const gitlabMatch = url.match(/gitlab\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (gitlabMatch) {
    return { platform: 'gitlab', owner: gitlabMatch[1], repoName: gitlabMatch[2].replace(/\.git$/, '') };
  }

  // Bitbucket: https://bitbucket.org/owner/repo
  const bbMatch = url.match(/bitbucket\.org\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (bbMatch) {
    return { platform: 'bitbucket', owner: bbMatch[1], repoName: bbMatch[2].replace(/\.git$/, '') };
  }

  return null;
}

function detectFrontend(url: string): string[] {
  const frameworks: string[] = [];
  if (url.includes('react') || url.includes('next')) frameworks.push('React');
  if (url.includes('vue')) frameworks.push('Vue');
  if (url.includes('angular')) frameworks.push('Angular');
  if (url.includes('svelte')) frameworks.push('Svelte');
  return frameworks.length > 0 ? frameworks : ['Unknown'];
}

function detectBackend(url: string): string[] {
  const backends: string[] = [];
  if (url.includes('node') || url.includes('express')) backends.push('Node.js');
  if (url.includes('python') || url.includes('fastapi') || url.includes('django')) backends.push('Python');
  if (url.includes('go')) backends.push('Go');
  if (url.includes('rust')) backends.push('Rust');
  return backends.length > 0 ? backends : ['None detected'];
}

function detectDatabase(url: string): string[] {
  const dbs: string[] = [];
  if (url.includes('mongo')) dbs.push('MongoDB');
  if (url.includes('postgres') || url.includes('supabase')) dbs.push('PostgreSQL');
  if (url.includes('mysql')) dbs.push('MySQL');
  if (url.includes('redis')) dbs.push('Redis');
  return dbs;
}

function detectInfra(url: string): string[] {
  const infra: string[] = [];
  if (url.includes('docker')) infra.push('Docker');
  if (url.includes('k8s') || url.includes('kubernetes')) infra.push('Kubernetes');
  if (url.includes('terraform')) infra.push('Terraform');
  return infra;
}

function detectFrameworks(url: string): string[] {
  const frameworks: string[] = [];
  if (url.includes('next')) frameworks.push('Next.js');
  if (url.includes('nuxt')) frameworks.push('Nuxt.js');
  if (url.includes('gatsby')) frameworks.push('Gatsby');
  if (url.includes('vite')) frameworks.push('Vite');
  return frameworks;
}

function detectBuildTool(url: string): string {
  if (url.includes('webpack')) return 'Webpack';
  if (url.includes('vite')) return 'Vite';
  if (url.includes('rollup')) return 'Rollup';
  if (url.includes('esbuild')) return 'ESBuild';
  return 'Unknown';
}

function detectPackageManager(url: string): 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown' {
  // In real implementation, would check package.json#packageManager or lock files
  return 'npm'; // Default
}

function recommendHosting(url: string): string[] {
  const recommendations: string[] = [];

  if (url.includes('next') || url.includes('react')) {
    recommendations.push('vercel');
  }
  if (url.includes('vue') || url.includes('nuxt')) {
    recommendations.push('netlify');
  }
  if (url.includes('static') || url.includes('html')) {
    recommendations.push('vercel', 'netlify', 'cloudflare-pages');
  }
  if (url.includes('python') || url.includes('django') || url.includes('fastapi')) {
    recommendations.push('railway', 'render');
  }
  if (url.includes('docker')) {
    recommendations.push('railway', 'render', 'self-hosted-docker');
  }

  return recommendations.length > 0 ? [...new Set(recommendations)] : ['vercel'];
}

function estimateBuildTime(url: string): number {
  // Rough estimates in seconds
  if (url.includes('next')) return 180; // 3 min
  if (url.includes('react') || url.includes('vue')) return 120;
  if (url.includes('python')) return 60;
  return 90; // Default
}

function suggestEnvVars(url: string): { key: string; required: boolean; description: string }[] {
  const vars: { key: string; required: boolean; description: string }[] = [];

  if (url.includes('next') || url.includes('react')) {
    vars.push({ key: 'NEXT_PUBLIC_API_URL', required: false, description: 'API endpoint URL' });
    vars.push({ key: 'NEXT_PUBLIC_SUPABASE_URL', required: false, description: 'Supabase project URL (if using Supabase)' });
  }
  if (url.includes('python')) {
    vars.push({ key: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' });
    vars.push({ key: 'SECRET_KEY', required: true, description: 'Application secret key' });
  }
  if (url.includes('supabase')) {
    vars.push({ key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase URL' });
    vars.push({ key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anon key' });
    vars.push({ key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Supabase service role key' });
  }

  return vars;
}

function suggestBuildCommand(url: string): string | undefined {
  if (url.includes('next')) return 'npm run build';
  if (url.includes('vite') || url.includes('react')) return 'npm run build';
  if (url.includes('python')) return 'pip install -r requirements.txt';
  return undefined;
}

function suggestOutputDir(url: string): string | undefined {
  if (url.includes('next')) return '.next';
  if (url.includes('vite') || url.includes('react')) return 'dist';
  if (url.includes('vue')) return 'dist';
  return undefined;
}

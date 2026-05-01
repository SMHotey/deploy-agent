import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as tar from 'tar';

const execAsync = promisify(exec);

interface LocalRepoAnalysis {
  projectName: string;
  localPath: string;
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
  estimatedBuildTime: number;
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

    logger.info('AI-start project creation request', { userId: user.id });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;
    const aiTool = formData.get('aiTool') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isZip = fileName.endsWith('.zip');
    const isTarGz = fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz');
    const isTar = fileName.endsWith('.tar');
    const isRar = fileName.endsWith('.rar');

    if (!isZip && !isTarGz && !isTar && !isRar) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: .zip, .tar.gz, .tar, .rar' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Create temp directory
    const tmpDir = join(tmpdir(), 'deploy-agent-ai', `${Date.now()}-${Math.random().toString(36).substring(7)}`);
    await fs.mkdir(tmpDir, { recursive: true });

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(tmpDir, file.name);
    await fs.writeFile(filePath, buffer);

    logger.info('File saved', { filePath, size: file.size });

    // Extract archive
    const extractDir = join(tmpDir, 'extracted');
    await fs.mkdir(extractDir, { recursive: true });

    try {
      if (isZip) {
        await extractZip(filePath, extractDir);
      } else if (isTarGz || isTar) {
        await extractTar(filePath, extractDir);
      } else if (isRar) {
        await extractRar(filePath, extractDir);
      }
    } catch (extractError: any) {
      logger.error('Extraction failed', { error: extractError });
      await cleanupTmpDir(tmpDir);
      return NextResponse.json(
        { error: 'Failed to extract archive. Please check the file format.' },
        { status: 400 }
      );
    }

    // Analyze the extracted code
    const analysis = await analyzeLocalCode(extractDir, file.name, logger);

    // Create project in database
    const projectName = description || analysis.projectName || 'AI-Generated Project';
    const [project] = await db.insert(projects).values({
      name: projectName,
      repoUrl: null, // No repo URL for uploaded code
      source: 'upload',
      platform: analysis.recommendedHosting[0] as any || 'vercel',
      userId: user.id,
      description: [
        description || null,
        aiTool ? `AI Tool: ${aiTool}` : null,
        `Source: Uploaded archive (${file.name})`
      ].filter(Boolean).join(' | '),
    }).returning();

    logger.info('Project created', { projectId: project.id, source: 'upload' });

    // Schedule cleanup (after 1 hour)
    setTimeout(() => {
      cleanupTmpDir(tmpDir).catch(e => {
        logger.warn('Failed to cleanup temp dir', { tmpDir, error: e });
      });
    }, 60 * 60 * 1000); // 1 hour

    return NextResponse.json({
      projectId: project.id,
      projectName: project.name,
      recommendedPlatform: analysis.recommendedHosting[0] || 'vercel',
      detectedStack: analysis.stack,
      frameworks: analysis.frameworks,
      buildCommand: analysis.requirements.buildCommand,
      outputDirectory: analysis.requirements.outputDirectory,
      environmentVars: analysis.requirements.environmentVars,
      message: 'Project created successfully. You can now configure deployment.',
    }, { status: 201 });

  } catch (error) {
    logger.error('AI-start project creation error', { error });
    return NextResponse.json(
      { error: 'Failed to process uploaded code' },
      { status: 500 }
    );
  }
}

async function extractZip(filePath: string, extractDir: string): Promise<void> {
  // Use PowerShell's Expand-Archive on Windows
  try {
    await execAsync(`powershell -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${extractDir}' -Force"`);
  } catch (error: any) {
    throw new Error(`Zip extraction failed: ${error.stderr || error.message}`);
  }
}

async function extractTar(filePath: string, extractDir: string): Promise<void> {
  try {
    // Use tar npm package
    await tar.extract({ file: filePath, cwd: extractDir });
  } catch (tarError: any) {
    // Fallback: try system tar command
    try {
      await execAsync(`tar -xf "${filePath}" -C "${extractDir}"`);
    } catch (execError: any) {
      throw new Error(`Tar extraction failed: ${tarError.message}. Please ensure tar is available or use .zip format.`);
    }
  }
}

async function extractRar(filePath: string, extractDir: string): Promise<void> {
  try {
    // Try using 7-Zip if available
    await execAsync(`7z x "${filePath}" -o"${extractDir}" -y`);
  } catch (error: any) {
    try {
      // Try with PowerShell and 7-Zip
      await execAsync(`powershell -Command "7z x '${filePath}' -o'${extractDir}' -y"`);
    } catch (psError: any) {
      throw new Error(`RAR extraction failed: ${error.message}. Please install 7-Zip or use .zip format.`);
    }
  }
}

async function analyzeLocalCode(dirPath: string, originalFileName: string, logger: any): Promise<LocalRepoAnalysis> {
  const analysis: LocalRepoAnalysis = {
    projectName: originalFileName.replace(/\.(zip|tar\.gz|tar|rar|tgz)$/i, '').substring(0, 50),
    localPath: dirPath,
    stack: {
      frontend: [],
      backend: [],
      database: [],
      infra: [],
    },
    frameworks: [],
    buildTool: 'unknown',
    packageManager: 'unknown',
    recommendedHosting: ['vercel'],
    estimatedBuildTime: 90,
    requirements: {
      environmentVars: [],
    },
    fileStructure: {
      hasDockerfile: false,
      hasDockerCompose: false,
      hasNextConfig: false,
      hasPackageJson: false,
      hasRequirementsTxt: false,
      hasMakefile: false,
    },
  };

  // Read package.json if exists
  const packageJsonPath = await findFile(dirPath, 'package.json');
  if (packageJsonPath) {
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      analysis.fileStructure.hasPackageJson = true;

      // Detect framework from dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps['next']) {
        analysis.frameworks.push('Next.js');
        analysis.stack.frontend.push('Next.js');
        analysis.recommendedHosting = ['vercel', 'netlify'];
        analysis.buildTool = 'Next.js build';
        analysis.requirements.buildCommand = 'npm run build';
        analysis.requirements.outputDirectory = '.next';
        analysis.fileStructure.hasNextConfig = !!deps['next'];
      }
      if (deps['react']) {
        analysis.stack.frontend.push('React');
        if (!analysis.frameworks.includes('Next.js')) {
          analysis.frameworks.push('React');
        }
      }
      if (deps['vue']) {
        analysis.stack.frontend.push('Vue');
        analysis.frameworks.push('Vue');
        analysis.recommendedHosting = ['netlify', 'vercel'];
      }
      if (deps['@angular/core']) {
        analysis.stack.frontend.push('Angular');
        analysis.frameworks.push('Angular');
      }
      if (deps['express']) {
        analysis.stack.backend.push('Node.js/Express');
      }
      if (deps['fastify']) {
        analysis.stack.backend.push('Node.js/Fastify');
      }

      // Detect package manager
      const hasYarnLock = await fileExists(dirPath, 'yarn.lock');
      const hasPnpmLock = await fileExists(dirPath, 'pnpm-lock.yaml');
      const hasBunLock = await fileExists(dirPath, 'bun.lockb');

      if (hasYarnLock) {
        analysis.packageManager = 'yarn';
      } else if (hasPnpmLock) {
        analysis.packageManager = 'pnpm';
      } else if (hasBunLock) {
        analysis.packageManager = 'bun';
      } else {
        analysis.packageManager = 'npm';
      }

      // Suggest env vars based on deps
      if (deps['next'] || deps['react']) {
        analysis.requirements.environmentVars.push(
          { key: 'NEXT_PUBLIC_API_URL', required: false, description: 'API endpoint URL' }
        );
      }
      if (deps['@supabase/supabase-js']) {
        analysis.requirements.environmentVars.push(
          { key: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL' },
          { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anon key' }
        );
      }
    } catch (e) {
      // Failed to parse package.json
      logger.warn('Failed to parse package.json', { error: e });
    }
  }

  // Check for Python
  const requirementsTxtPath = await findFile(dirPath, 'requirements.txt');
  if (requirementsTxtPath) {
    analysis.fileStructure.hasRequirementsTxt = true;
    analysis.stack.backend.push('Python');
    analysis.recommendedHosting = ['railway', 'render'];
    analysis.requirements.buildCommand = 'pip install -r requirements.txt';

    try {
      const requirements = await fs.readFile(requirementsTxtPath, 'utf-8');
      if (requirements.includes('django')) {
        analysis.frameworks.push('Django');
      } else if (requirements.includes('flask')) {
        analysis.frameworks.push('Flask');
      } else if (requirements.includes('fastapi')) {
        analysis.frameworks.push('FastAPI');
      }
    } catch (e) {
      // Ignore read errors
    }
  }

  // Check for Docker
  const dockerfilePath = await findFile(dirPath, 'Dockerfile');
  if (dockerfilePath) {
    analysis.fileStructure.hasDockerfile = true;
    analysis.stack.infra.push('Docker');
    analysis.recommendedHosting = ['railway', 'render', 'self-hosted-docker'];
  }

  const dockerComposePath = await findFile(dirPath, 'docker-compose.yml') ||
                          await findFile(dirPath, 'docker-compose.yaml');
  if (dockerComposePath) {
    analysis.fileStructure.hasDockerCompose = true;
  }

  // Check for Makefile
  const makefilePath = await findFile(dirPath, 'Makefile');
  if (makefilePath) {
    analysis.fileStructure.hasMakefile = true;
  }

  // Check for next.config.js/ts/mjs
  const nextConfigPath = await findFile(dirPath, 'next.config.js') ||
                       await findFile(dirPath, 'next.config.ts') ||
                       await findFile(dirPath, 'next.config.mjs');
  if (nextConfigPath) {
    analysis.fileStructure.hasNextConfig = true;
  }

  return analysis;
}

async function findFile(dirPath: string, fileName: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name === fileName) {
        return join(entry.parentPath || dirPath, entry.name);
      }
    }
  } catch (e) {
    // Directory read error
  }
  return null;
}

async function fileExists(dirPath: string, fileName: string): Promise<boolean> {
  const filePath = await findFile(dirPath, fileName);
  return filePath !== null;
}

async function cleanupTmpDir(tmpDir: string): Promise<void> {
  try {
    await fs.access(tmpDir);
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // Directory doesn't exist or cleanup failed
  }
}

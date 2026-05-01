import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { startupTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { createLogger, generateRequestId } from '@/lib/logger';

// Default templates to seed the database
const defaultTemplates = [
  {
    name: 'Next.js + Supabase Starter',
    description: 'Complete stack with Next.js 14, Supabase for database/auth, and Vercel deployment',
    stack: 'nextjs-supabase',
    config: {
      platform: 'vercel',
      environment: 'production',
      frameworkPreset: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: '.next',
      environmentVariables: {
        NEXT_PUBLIC_SUPABASE_URL: '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
      },
      createSupabaseProject: true,
      supabaseRegion: 'us-east-1',
      setupGithubActions: true,
      runMigrations: true,
    },
    isActive: true,
  },
  {
    name: 'React + Vite + Netlify',
    description: 'Lightweight React SPA with Vite bundler and Netlify deployment',
    stack: 'react-vite-netlify',
    config: {
      platform: 'netlify',
      environment: 'production',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      environmentVariables: {},
      setupGithubActions: true,
    },
    isActive: true,
  },
  {
    name: 'Python FastAPI + Railway',
    description: 'Python backend API with FastAPI and Railway deployment',
    stack: 'python-fastapi-railway',
    config: {
      platform: 'railway',
      environment: 'production',
      buildCommand: 'pip install -r requirements.txt',
      environmentVariables: {
        DATABASE_URL: '',
        SECRET_KEY: '',
      },
      setupGithubActions: true,
    },
    isActive: true,
  },
  {
    name: 'MERN Stack (MongoDB + Express + React + Node)',
    description: 'Full MERN stack with Vercel deployment',
    stack: 'mern-vercel',
    config: {
      platform: 'vercel',
      environment: 'production',
      frameworkPreset: 'create-react-app',
      buildCommand: 'npm run build',
      outputDirectory: 'build',
      environmentVariables: {
        MONGODB_URI: '',
        JWT_SECRET: '',
        API_URL: '',
      },
      setupGithubActions: true,
    },
    isActive: true,
  },
  {
    name: 'Static HTML/CSS/JS',
    description: 'Simple static site deployment to any platform',
    stack: 'static',
    config: {
      platform: 'vercel',
      environment: 'production',
      buildCommand: '',
      outputDirectory: '.',
      environmentVariables: {},
      setupGithubActions: false,
    },
    isActive: true,
  },
];

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    // Get all active templates
    const templates = await db.select()
      .from(startupTemplates)
      .where(eq(startupTemplates.isActive, true))
      .orderBy(startupTemplates.name);

    // If no templates exist, seed with defaults
    if (templates.length === 0) {
      await db.insert(startupTemplates).values(defaultTemplates);
      logger.info('Seeded default startup templates');
      
      // Fetch again
      const seeded = await db.select()
        .from(startupTemplates)
        .where(eq(startupTemplates.isActive, true))
        .orderBy(startupTemplates.name);
      
      return NextResponse.json({ templates: seeded, seeded: true });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('Get startup templates error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, stack, config, isActive } = body;

    if (!name || !stack || !config) {
      return NextResponse.json(
        { error: 'name, stack, and config are required' },
        { status: 400 }
      );
    }

    const [template] = await db.insert(startupTemplates)
      .values({
        name,
        description: description || null,
        stack,
        config,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    logger.info('Startup template created', { templateId: template.id, stack });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    logger.error('Create startup template error', { error });
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, stack, config, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await db.update(startupTemplates)
      .set({
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        stack: stack || undefined,
        config: config || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(startupTemplates.id, id));

    const updated = await db.query.startupTemplates.findFirst({
      where: eq(startupTemplates.id, id),
    });

    logger.info('Startup template updated', { templateId: id });

    return NextResponse.json({ template: updated });
  } catch (error) {
    logger.error('Update startup template error', { error });
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger(requestId);

  try {
    const user = await authenticate(request);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await db.update(startupTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(startupTemplates.id, id));

    logger.info('Startup template deleted', { templateId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete startup template error', { error });
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

import { describe, it, expect } from 'vitest';

describe('Startup Features - Basic Verification', () => {
  it('should have startup analytics API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'startup-analytics', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should have startup validation API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'validate', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should have startup templates API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'templates', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should have startup health score API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'health-score', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should have billing usage API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'billing', 'usage', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should have new schema tables', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.ts');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    
    expect(content).toContain('startupTemplates');
    expect(content).toContain('startupReadinessChecks');
    expect(content).toContain('startupHealthScores');
  });

  it('should have default templates defined', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'templates', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    expect(content).toContain('nextjs-supabase');
    expect(content).toContain('react-vite-netlify');
    expect(content).toContain('python-fastapi-railway');
  });

  it('should have validation checks in validate API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'validate', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    expect(content).toContain('vercel-token');
    expect(content).toContain('github-token');
    expect(content).toContain('repo-url');
    expect(content).toContain('env-vars');
  });

  it('should have health score calculation', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'startup', 'health-score', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    expect(content).toContain('calculateHealthScore');
    expect(content).toContain('successRate');
    expect(content).toContain('buildTime');
  });

  it('should have budget limits defined', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'billing', 'usage', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    expect(content).toContain('PLAN_LIMITS');
    expect(content).toContain('deployments');
    expect(content).toContain('projects');
  });
});

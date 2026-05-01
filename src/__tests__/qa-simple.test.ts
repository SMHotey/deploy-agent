import { describe, it, expect } from 'vitest';

describe('QA Integration Tests - Simple', () => {
  it('should verify repo-analyze route exists', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/repo-analyze/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('should verify demand route exists', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/demand/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('should verify marketing showcase route exists', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/marketing/showcase/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('should verify startup templates route exists', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/startup/templates/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('should verify analytics export route exists', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/analytics/export/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
  });

  it('should verify deploy route has repo analysis integration', () => {
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(process.cwd(), 'src/app/api/deploy/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    expect(content).toContain('repo-analyze');
    expect(content).toContain('repo_analysis');
  });

  it('should verify startup tables in schema', () => {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), 'src/db/schema.ts');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('startupTemplates');
    expect(content).toContain('startupReadinessChecks');
    expect(content).toContain('startupHealthScores');
  });

  it('should verify analytics page has export functionality', () => {
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(process.cwd(), 'src/app/analytics/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).toContain('handleExport');
    expect(content).toContain('AnimatedNumber');
  });
});

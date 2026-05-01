import { describe, it, expect } from 'vitest';

describe('Analytics Export - Basic Tests', () => {
  it('should verify API route file exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'analytics', 'export', 'route.ts');
    const exists = fs.existsSync(routePath);
    
    expect(exists).toBe(true);
  });

  it('should verify analytics page exists', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const pagePath = path.join(process.cwd(), 'src', 'app', 'analytics', 'page.tsx');
    const exists = fs.existsSync(pagePath);
    
    expect(exists).toBe(true);
  });

  it('should have exportData function in analytics page', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const pagePath = path.join(process.cwd(), 'src', 'app', 'analytics', 'page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    expect(content).toContain('exportData');
    expect(content).toContain('/api/analytics/export');
  });

  it('should have CSV format support in API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'analytics', 'export', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    expect(content).toContain("format === 'csv'");
    expect(content).toContain('text/csv');
  });

  it('should have JSON format support in API', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'analytics', 'export', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    
    // Check for JSON content type or default format
    expect(content).toContain('application/json');
    expect(content).toContain("format || 'json'");
  });
});

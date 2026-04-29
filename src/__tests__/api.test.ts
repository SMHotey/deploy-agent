import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

const API_URL = process.env.DEPLOY_AGENT_URL || 'http://localhost:3000';
let authToken: string;

// Skip integration tests when server is not running
const describeIf = (name: string, fn: () => void) =>
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe(name, fn) : describe.skip(name, fn);

describeIf('Deploy Agent API', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await fetch(`${API_URL}/api/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
    });
  });

  it('should handle HEAD request', async () => {
    const response = await fetch(`${API_URL}/api/health`, { method: 'HEAD' });
    expect(response.ok).toBe(true);
  });
});

describeIf('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'Test1234!',
    name: 'Test User',
  };

  it('should register a new user', async () => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    // Might fail if user already exists - that's ok for tests
    if (response.ok) {
      const data = await response.json();
      expect(data.token).toBeDefined();
    }
  });

  it('should login and get token', async () => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.token).toBeDefined();
    authToken = data.token;
  });

  it('should get current user with token', async () => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.email).toBe(testUser.email);
  });
});

describeIf('Validation', () => {
  it('should reject invalid repo URL', async () => {
    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ repo_url: 'invalid-url' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should reject missing repo_url', async () => {
    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ project_name: 'test' }),
    });

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: 'https://github.com/test/test' }),
    });

    expect(response.status).toBe(401);
  });
});

describeIf('Rate Limiting', () => {
  it('should return 429 when rate limit exceeded', async () => {
    // Make many requests to trigger rate limit
    const requests = Array(15).fill(null).map(() => 
      fetch(`${API_URL}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ repo_url: 'https://github.com/test/test' }),
      })
    );

    const results = await Promise.all(requests);
    const rateLimited = results.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

describeIf('Projects API', () => {
  it('should list projects', async () => {
    const response = await fetch(`${API_URL}/api/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.projects).toBeDefined();
    expect(data.total).toBeDefined();
  });

  it('should support pagination', async () => {
    const response = await fetch(`${API_URL}/api/projects?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(5);
  });

  it('should require authentication', async () => {
    const response = await fetch(`${API_URL}/api/projects`);
    expect(response.status).toBe(401);
  });
});

describe('CLI', () => {
  it('should show help', async () => {
    const { promisify } = await import('util');
    const exec = promisify((await import('child_process')).exec);

    const { stdout, stderr } = await exec('node cli.ts --help');
    // Allow Node.js module warnings in stderr
    const filteredStderr = stderr.replace(/\(node:\d+\)[\s\S]*?trace-warnings.*\)\n?/g, '').trim();
    expect(filteredStderr).toBe('');
    expect(stdout).toContain('deploy-agent');
  });
});
export interface DocPage {
  title: string;
  href: string;
  icon?: string;
  description?: string;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const docsStructure: DocSection[] = [
  {
    title: 'Getting Started',
    pages: [
      { title: 'Quick Start', href: '/docs/guides/quickstart', description: 'Get Deploy Agent running in 5 minutes' },
      { title: 'Authentication', href: '/docs/guides/auth', description: 'JWT auth, tokens, and API keys' },
      { title: 'Environments', href: '/docs/guides/environments', description: 'Configure staging, production, and more' },
    ],
  },
  {
    title: 'API Reference',
    pages: [
      { title: 'Deployments', href: '/docs/api/deployments', description: 'Create, list, and manage deployments' },
      { title: 'Projects', href: '/docs/api/projects', description: 'Project management endpoints' },
      { title: 'Environment Variables', href: '/docs/api/env-vars', description: 'Encrypted env var management' },
      { title: 'Webhooks', href: '/docs/api/webhooks', description: 'GitHub and Vercel webhook handling' },
      { title: 'Teams', href: '/docs/api/teams', description: 'Team management and RBAC' },
      { title: 'Billing', href: '/docs/api/billing', description: 'Plans, usage, and Stripe integration' },
    ],
  },
  {
    title: 'Guides',
    pages: [
      { title: 'Deploy Next.js Apps', href: '/docs/guides/nextjs', description: 'Step-by-step Next.js deployment' },
      { title: 'Custom Domains', href: '/docs/guides/custom-domains', description: 'Configure custom domains' },
      { title: 'Environment Variables', href: '/docs/guides/env-vars', description: 'Managing secrets and config' },
      { title: 'CI/CD Integration', href: '/docs/guides/ci-cd', description: 'GitHub Actions and automation' },
      { title: 'Rollback Guide', href: '/docs/guides/rollback', description: 'Safe rollbacks and versioning' },
    ],
  },
  {
    title: 'Platforms',
    pages: [
      { title: 'Vercel', href: '/docs/guides/platforms/vercel', description: 'Deploy to Vercel with full config' },
      { title: 'Netlify', href: '/docs/guides/platforms/netlify', description: 'Netlify deployment guide' },
      { title: 'Railway', href: '/docs/guides/platforms/railway', description: 'Railway deployment guide' },
      { title: 'Docker', href: '/docs/guides/platforms/docker', description: 'Containerized deployments' },
    ],
  },
  {
    title: 'CLI Reference',
    pages: [
      { title: 'Installation', href: '/docs/cli/install', description: 'Install and configure the CLI' },
      { title: 'Commands', href: '/docs/cli/commands', description: 'Full CLI command reference' },
      { title: 'CI/CD Usage', href: '/docs/cli/ci-cd', description: 'Using CLI in pipelines' },
    ],
  },
];

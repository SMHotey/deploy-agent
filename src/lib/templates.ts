export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon name
  platform: 'vercel' | 'netlify' | 'cloudflare-pages';
  defaults: {
    branch?: string;
    framework_preset?: string;
    build_command?: string;
    output_directory?: string;
    install_command?: string;
    dev_command?: string;
    environment_variables?: Record<string, string>;
  };
}

export const TEMPLATES: DeploymentTemplate[] = [
  {
    id: 'nextjs-vercel',
    name: 'Next.js + Vercel',
    description: 'Deploy Next.js apps with zero config. Perfect for React-based full-stack apps.',
    icon: '▲',
    platform: 'vercel',
    defaults: {
      framework_preset: 'nextjs',
      branch: 'main',
      build_command: 'npm run build',
      output_directory: '.next',
    },
  },
  {
    id: 'react-vite',
    name: 'React (Vite)',
    description: 'Lightweight React app with Vite bundler. Fast HMR and build.',
    icon: '⚛️',
    platform: 'vercel',
    defaults: {
      framework_preset: 'react',
      branch: 'main',
      build_command: 'npm run build',
      output_directory: 'dist',
    },
  },
  {
    id: 'vue-vite',
    name: 'Vue + Vite',
    description: 'Vue.js app with Vite for lightning-fast development.',
    icon: '💚',
    platform: 'vercel',
    defaults: {
      framework_preset: 'vue',
      branch: 'main',
      build_command: 'npm run build',
      output_directory: 'dist',
    },
  },
  {
    id: 'astro-static',
    name: 'Astro Static Site',
    description: 'Static site generator. Perfect for content-focused sites.',
    icon: '🚀',
    platform: 'vercel',
    defaults: {
      framework_preset: 'astro',
      branch: 'main',
      build_command: 'npm run build',
      output_directory: 'dist',
    },
  },
  {
    id: 'express-api',
    name: 'Express API',
    description: 'Node.js Express API. Deploy as serverless functions.',
    icon: '🚂',
    platform: 'vercel',
    defaults: {
      framework_preset: 'other',
      branch: 'main',
      build_command: 'npm run build',
    },
  },
  {
    id: 'nextjs-netlify',
    name: 'Next.js + Netlify',
    description: 'Deploy Next.js to Netlify with ISR support.',
    icon: '🌐',
    platform: 'netlify',
    defaults: {
      framework_preset: 'nextjs',
      branch: 'main',
      build_command: 'npm run build',
    },
  },
  {
    id: 'docs-sphinx',
    name: 'Documentation Site',
    description: 'Markdown-based docs with MkDocs or Docusaurus.',
    icon: '📚',
    platform: 'vercel',
    defaults: {
      framework_preset: 'other',
      branch: 'main',
      build_command: 'npm run build',
      output_directory: 'build',
    },
  },
];

export function getTemplate(id: string): DeploymentTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByPlatform(platform: string): DeploymentTemplate[] {
  return TEMPLATES.filter(t => t.platform === platform);
}

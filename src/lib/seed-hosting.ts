import { db } from '@/db';
import { hostingProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Seed hosting providers with popular affiliate programs
 * Run with: npx tsx src/lib/seed-hosting.ts
 */

const providers = [
  {
    name: 'Vercel',
    slug: 'vercel',
    description: 'The platform for frontend developers, built on Next.js. Deploy with zero configuration.',
    logoUrl: 'https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_dark_background.png',
    affiliateUrl: 'https://vercel.com/signup?ref=youraffiliatecode',
    commissionRate: '$0',
    commissionType: 'revenue_share' as const,
    minPayout: 100,
    paymentTerms: 'Net-30',
    categories: ['frontend', 'nextjs', 'react', 'jamstack', 'serverless'],
    features: ['Edge Network', 'Zero Config', 'Git Integration', 'Preview Deployments', 'Serverless Functions', 'Global CDN'],
    pricing: [
      { plan: 'Hobby', price: '$0', specs: ['Unlimited personal projects', 'SSL', 'Global Edge Network', 'Up to 100GB bandwidth'] },
      { plan: 'Pro', price: '$20/mo per user', specs: ['Team collaboration', 'Advanced analytics', 'Password protection', 'More bandwidth'] },
      { plan: 'Enterprise', price: 'Custom', specs: ['SLA', 'Dedicated support', 'SSO', 'Custom domains'] },
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Netlify',
    slug: 'netlify',
    description: 'Build, deploy, and scale modern web projects. The gold standard for Jamstack.',
    logoUrl: 'https://www.netlify.com/v3/img/components/logomark-dark-mode.png',
    affiliateUrl: 'https://www.netlify.com/affiliates',
    commissionRate: '10% recurring',
    commissionType: 'revenue_share' as const,
    minPayout: 50,
    paymentTerms: 'Net-30',
    categories: ['frontend', 'jamstack', 'static', 'vue', 'react'],
    features: ['Continuous Deployment', 'Branch Deploys', 'Split Testing', 'Forms', 'Functions', 'Edge Handlers'],
    pricing: [
      { plan: 'Starter', price: '$0', specs: ['100GB bandwidth', '300 build minutes', '1 concurrent build'] },
      { plan: 'Pro', price: '$19/mo', specs: ['1TB bandwidth', '1000 build minutes', '3 concurrent builds'] },
      { plan: 'Business', price: '$99/mo', specs: ['2TB bandwidth', '3000 build minutes', 'Team features'] },
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'DigitalOcean',
    slug: 'digitalocean',
    description: 'Cloud infrastructure designed for developers. Simple, scalable, and affordable.',
    logoUrl: 'https://www.digitalocean.com/_next/static/media/logo.svg',
    affiliateUrl: 'https://m.do.co/c/yourreferralcode',
    commissionRate: '$25 per signup',
    commissionType: 'cpa' as const,
    minPayout: 50,
    paymentTerms: 'Net-30',
    categories: ['backend', 'fullstack', 'nodejs', 'docker', 'vps'],
    features: ['Droplets (VPS)', 'Managed Databases', 'Spaces (Object Storage)', 'Load Balancers', 'Kubernetes', 'DDoS Protection'],
    pricing: [
      { plan: 'Basic Droplet', price: '$4/mo', specs: ['1GB RAM', '1 vCPU', '25GB SSD', '1TB transfer'] },
      { plan: 'Professional', price: '$12/mo', specs: ['2GB RAM', '1 vCPU', '50GB SSD', '2TB transfer'] },
      { plan: 'Managed DB', price: '$15/mo', specs: ['1GB RAM', '1 vCPU', '10GB storage', 'Automated backups'] },
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Railway',
    slug: 'railway',
    description: 'Infrastructure, simplified. Deploy your apps with ease. No DevOps required.',
    logoUrl: 'https://railway.app/logo.png',
    affiliateUrl: 'https://railway.app?ref=yourcode',
    commissionRate: '$5 credit',
    commissionType: 'cpa' as const,
    minPayout: 0,
    paymentTerms: 'Immediate',
    categories: ['fullstack', 'backend', 'nodejs', 'docker'],
    features: ['Automatic Deployments', 'SSL by Default', 'Private Networking', 'Volume Storage', 'Metrics Dashboard'],
    pricing: [
      { plan: 'Developer', price: '$5/mo', specs: ['$5 free credit', 'Shared CPU', '512MB RAM', '1GB storage'] },
      { plan: 'Team', price: 'Pay-as-you-go', specs: ['Dedicated resources', 'Team collaboration', 'Usage-based billing'] },
    ],
    isActive: true,
    sortOrder: 4,
  },
  {
    name: 'Render',
    slug: 'render',
    description: 'Modern cloud platform for developers. Build, deploy, and scale apps and websites.',
    logoUrl: 'https://render.com/logo-dark.svg',
    affiliateUrl: 'https://render.com/referrals',
    commissionRate: '10% for 12 months',
    commissionType: 'revenue_share' as const,
    minPayout: 100,
    paymentTerms: 'Net-30',
    categories: ['fullstack', 'backend', 'nodejs', 'static', 'docker'],
    features: ['Managed SSL', 'Auto Deploys', 'Private Services', 'Background Workers', 'Cron Jobs', 'Persistent Disks'],
    pricing: [
      { plan: 'Starter', price: '$0', specs: ['750 hours free', 'Static sites free', 'Shared CPU'] },
      { plan: 'Individual', price: '$7/mo', specs: ['1GB RAM', '0.5 vCPU', 'Auto-scaling', 'Private services'] },
      { plan: 'Team', price: '$15/mo per user', specs: ['Collaboration', 'Granular permissions', 'Usage alerts'] },
    ],
    isActive: true,
    sortOrder: 5,
  },
  {
    name: 'Fly.io',
    slug: 'flyio',
    description: 'Run your full stack apps close to your users. Deploy to edge locations worldwide.',
    logoUrl: 'https://fly.io/favicon.ico',
    affiliateUrl: 'https://fly.io/referrals',
    commissionRate: '$10 credit',
    commissionType: 'cpa' as const,
    minPayout: 0,
    paymentTerms: 'Immediate',
    categories: ['fullstack', 'backend', 'nodejs', 'docker', 'edge'],
    features: ['Edge Computing', 'Anycast IPs', 'Fly Volumes', 'Machine-based', 'Multi-region', 'LiteFS'],
    pricing: [
      { plan: 'Shared-1x', price: '$2/mo', specs: ['256MB RAM', '1 vCPU', '3GB storage', 'Shared cores'] },
      { plan: 'Dedicated-1x', price: '$11/mo', specs: ['2GB RAM', '1 vCPU', '40GB storage', 'Dedicated cores'] },
    ],
    isActive: true,
    sortOrder: 6,
  },
  {
    name: 'Cloudflare Pages',
    slug: 'cloudflare-pages',
    description: 'Deploy your full-stack applications to the edge with Cloudflare Workers integration.',
    logoUrl: 'https://pages.cloudflare.com/logo.svg',
    affiliateUrl: 'https://www.cloudflare.com/partners',
    commissionRate: '10% recurring',
    commissionType: 'revenue_share' as const,
    minPayout: 50,
    paymentTerms: 'Net-30',
    categories: ['frontend', 'jamstack', 'static', 'edge', 'workers'],
    features: ['Edge Network', 'Preview Deployments', 'Custom Domains', 'SSL', 'Access Control', 'D1 Database'],
    pricing: [
      { plan: 'Free', price: '$0', specs: ['Unlimited sites', '500 builds/mo', '1 concurrent build'] },
      { plan: 'Pro', price: '$20/mo', specs: ['5000 builds/mo', '3 concurrent builds', 'Advanced analytics'] },
    ],
    isActive: true,
    sortOrder: 7,
  },
  {
    name: 'Heroku',
    slug: 'heroku',
    description: 'Cloud platform that lets companies build, deliver, monitor and scale apps.',
    logoUrl: 'https://www.herokucdn.com/logo.png',
    affiliateUrl: 'https://www.heroku.com/referral',
    commissionRate: '15% for 6 months',
    commissionType: 'revenue_share' as const,
    minPayout: 100,
    paymentTerms: 'Net-45',
    categories: ['fullstack', 'backend', 'nodejs', 'ruby', 'python'],
    features: ['Dynos', 'Add-ons Marketplace', 'Heroku Postgres', 'Heroku Redis', 'CI/CD Integration', 'Review Apps'],
    pricing: [
      { plan: 'Eco', price: '$5/mo', specs: ['512MB RAM', 'Sleeps when inactive', 'Basic compute'] },
      { plan: 'Basic', price: '$7/mo', specs: ['512MB RAM', 'No sleeping', '10K rows DB free'] },
      { plan: 'Standard-1X', price: '$25/mo', specs: ['512MB RAM', 'Dedicated', 'Enhanced features'] },
    ],
    isActive: true,
    sortOrder: 8,
  },
  {
    name: 'AWS Amplify',
    slug: 'aws-amplify',
    description: 'Build and deploy mobile and web apps with AWS. Full-stack web and mobile development.',
    logoUrl: 'https://amplify-assets.s3.amazonaws.com/logo.png',
    affiliateUrl: 'https://aws.amazon.com/referral',
    commissionRate: 'Up to 5%',
    commissionType: 'revenue_share' as const,
    minPayout: 100,
    paymentTerms: 'Net-30',
    categories: ['fullstack', 'frontend', 'mobile', 'react', 'vue'],
    features: ['Hosting', 'CI/CD', 'Authentication', 'API (GraphQL/REST)', 'Storage', 'Analytics'],
    pricing: [
      { plan: 'Free Tier', price: '$0', specs: ['1000 build minutes/mo', '5GB storage', '15GB bandwidth'] },
      { plan: 'Pay-as-you-go', price: 'Usage-based', specs: ['$0.01/build minute', '$0.15/GB storage', '$0.15/GB bandwidth'] },
    ],
    isActive: true,
    sortOrder: 9,
  },
  {
    name: 'Bluehost',
    slug: 'bluehost',
    description: 'Recommended WordPress hosting provider. Perfect for small businesses and blogs.',
    logoUrl: 'https://www.bluehost.com/logo.png',
    affiliateUrl: 'https://www.bluehost.com/track/youraffiliate',
    commissionRate: '$65 per sale',
    commissionType: 'cpa' as const,
    minPayout: 100,
    paymentTerms: 'Net-45',
    categories: ['wordpress', 'shared', 'php', 'cms'],
    features: ['Free Domain (1st year)', 'Free SSL', '1-Click WordPress', '24/7 Support', 'cPanel', '30-day Guarantee'],
    pricing: [
      { plan: 'Basic', price: '$2.95/mo', specs: ['1 website', '10GB storage', 'Free SSL'] },
      { plan: 'Plus', price: '$5.45/mo', specs: ['Unlimited websites', 'Unmetered storage', 'Domain privacy'] },
      { plan: 'Choice Plus', price: '$6.95/mo', specs: ['Spam protection', 'Domain privacy', 'Site backup'] },
    ],
    isActive: true,
    sortOrder: 10,
  },
];

export async function seedHostingProviders() {
  console.log('Seeding hosting providers...');

  for (const provider of providers) {
    try {
      const existing = await db.select()
        .from(hostingProviders)
        .where(eq(hostingProviders.slug, provider.slug))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(hostingProviders).values(provider);
        console.log(`✓ Added: ${provider.name}`);
      } else {
        console.log(`- Skipped (exists): ${provider.name}`);
      }
    } catch (error) {
      console.error(`✗ Failed to add ${provider.name}:`, error);
    }
  }

  console.log('\nDone!');
}

// Run if called directly
if (require.main === module) {
  seedHostingProviders()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

# Deploy Agent

A production-ready deployment automation agent that deploys git repositories to Vercel (and other platforms) with full configuration support.

## Features

### Core Deployment
- **One-click deployment** from GitHub, GitLab, or Bitbucket repositories
- **Multi-platform support**: Vercel, Netlify, Cloudflare Pages, Railway
- **Full configuration** via API or UI (100+ parameters)
- **Environment variable encryption** (AES-256-GCM)
- **Rate limiting** (Redis or in-memory)
- **Retry with exponential backoff** for all external APIs
- **GitHub Actions integration** for CI/CD
- **Real-time deployment logs**
- **Supabase backend automation** support

### 🆕 AI Marketing Landing Generator (2026-05)
- **AI-Powered Generation** - Create marketing landing pages using OpenAI (gpt-4o-mini)
- **Targeted Segments** - Generate pages for different audiences (startups, developers, enterprises)
- **Customizable Sections** - Hero, features, CTA, testimonials, pricing
- **Live Preview** - Preview generated config before publishing
- **Publish to /landing/[slug]** - Instantly publish pages to your domain
- **Admin Management** - List, preview, publish, delete landing pages

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/admin/generate-landing` | Generate landing page config via OpenAI |
| POST | `/api/admin/generate-landing/publish` | Publish landing page to /landing/[slug] |
| POST | `/api/admin/generate-landing/delete` | Delete a landing page |

**Pages:**
- `/admin/marketing/generate-landing` - Admin UI for AI generation
- `/landing/[slug]` - Public landing pages

### 🆕 Referral & Affiliate System (2026-05)
- **Referral Codes** - Auto-generated unique codes for each user
- **Hosting Partner Tracking** - Track clicks & conversions for Vercel, Netlify, Railway
- **Commission Tracking** - Record referral events with metadata
- **Partner Pages** - `/partners` page showcasing hosting offers with referral links
- **Admin Analytics** - Referral stats in admin dashboard

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/referral/track` | Track referral click/conversion |
| GET | `/api/referrals` | Get user's referral stats |

**Database Tables:**
- `referral_events` - Track referral clicks and conversions
- `hosting_providers` - Configured with `referralCode` field

### 🆕 Stripe Billing System (2026-05)
- **Subscription Plans** - Free, Pro ($29/mo), Team ($99/mo), Enterprise ($499+/mo)
- **Stripe Integration** - Checkout sessions, webhooks, customer portal
- **Usage Enforcement** - Deploy limits, project quotas, team member caps
- **Billing Dashboard** - `/billing` page with plan management
- **Webhook Security** - Signature verification for all Stripe events

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|------------|
| GET/POST | `/api/billing` | Get plans, create checkout, customer portal |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |

**Features:**
- Free: 3 projects, 10 deploys/day
- Pro: 20 projects, 100 deploys/day, 5 team members
- Team: Unlimited projects, 1000 deploys/day, 50 members, SSO
- Enterprise: Dedicated instance, custom SLA

### 🆕 Smart Analysis & Marketing (2026-05)
- **Repository Analysis System** - Auto-detect tech stack and recommend optimal hosting
- **Demand Analytics** - Track project interest, calculate demand scores
- **Marketing Tools** - Project showcase, share tracking, promotional analytics
- **Startup Features** - Readiness validation, project templates, health scores
- **Enhanced Dashboards** - Analytics export (CSV/JSON), financial analytics

### 🆕 Review & Testing Marketplace (2026-05)
- **Project Submissions** - Users submit projects for community review
- **Review System** - Testers provide feedback with ratings and bug reports
- **Points System** - Earn points for quality reviews (10-100 points)
- **Leaderboard** - Overall and per-category rankings

## Quick Start

### 1. Clone and install

```bash
cd deploy-agent
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your tokens
```

Required tokens:
- `VERCEL_TOKEN` - Your Vercel API token (https://vercel.com/account/tokens)
- `GITHUB_TOKEN` - GitHub Personal Access Token (repo scope)
- `OPENAI_API_KEY` - OpenAI API key for AI landing generation
- `STRIPE_SECRET_KEY` - Stripe secret key for billing
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret

### 3. Setup database

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/vercel/next.js",
    "project_name": "my-next-app"
  }'
```

## API Endpoints

### Core Deployment

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/deploy` | Create deployment |
| GET | `/api/deploy?deployment_id=xxx` | Get deployment status/logs |
| GET | `/api/projects` | List projects |
| GET | `/api/health` | Health check |

### AI Landing Pages

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/admin/generate-landing` | Generate landing page via OpenAI |
| POST | `/api/admin/generate-landing/publish` | Publish landing page |
| POST | `/api/admin/generate-landing/delete` | Delete landing page |

### Billing & Referrals

| Method | Endpoint | Description |
|--------|----------|------------|
| GET/POST | `/api/billing` | Billing operations |
| POST | `/api/webhooks/stripe` | Stripe webhook |
| POST | `/api/referral/track` | Track referral events |
| GET | `/api/referrals` | Get referral stats |

### Analytics & Marketing

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/repo-analyze` | Analyze repository |
| GET | `/api/demand` | Get demand analytics |
| GET | `/api/marketing/showcase` | Project showcase |
| GET | `/api/startup/templates` | Startup templates |
| GET | `/api/analytics/export` | Export analytics |

## Page Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with graphics |
| `/landing/[slug]` | AI-generated marketing landing pages |
| `/partners` | Hosting partner offers with referral links |
| `/billing` | Subscription management |
| `/admin` | Admin dashboard |
| `/admin/marketing/generate-landing` | AI landing generator UI |
| `/dashboard` | User dashboard |
| `/projects/new` | New project with hosting banners |

## Configuration

All parameters are optional. See API Reference for full list.

### Example: Full-stack app with Supabase

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/my-org/my-app",
    "project_name": "my-fullstack-app",
    "target_platform": "vercel",
    "create_supabase_project": true,
    "supabase_region": "us-east-1",
    "environment_variables": {
      "NEXT_PUBLIC_API_URL": "https://api.example.com"
    },
    "setup_github_actions": true
  }'
```

## Docker

### Development

```bash
docker-compose up --build
```

### Production

```bash
docker-compose -f docker-compose.yml up -d --build
```

## Architecture

- **Frontend**: Next.js 16 (App Router) + TailwindCSS + React 19.2
- **Backend**: Next.js API Routes + Node.js services
- **Database**: PostgreSQL (via Drizzle ORM)
- **Queue/Cache**: Redis (Upstash compatible)
- **AI**: OpenAI API (gpt-4o-mini)
- **Payments**: Stripe

## Security

- All sensitive data (API keys, passwords) encrypted with AES-256-GCM
- Rate limiting (10 requests/minute by default)
- Environment variables never logged
- Webhook signature validation (Stripe)
- JWT authentication with HTTP-only cookies

## Monetization Plan

### Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 projects, 10 deployments/day, 1 user, 100MB storage |
| **Pro** | $29/mo | 20 projects, 100 deployments/day, 5 team members, 1GB storage |
| **Team** | $99/mo | Unlimited projects, 1,000 deployments/day, 50 members, 10GB storage, SSO |
| **Enterprise** | $499+/mo | Unlimited everything, Dedicated instance, On-premise, Custom SLA |

### Revenue Projections (Week 8 target: 100 beta users)

- 80 Free users (learning product)
- 15 Pro users × $29 = $435/mo
- 5 Team users × $99 = $495/mo
- **Total MRR**: ~$930/mo

## Roadmap

- [x] Repository Analysis & Hosting Recommendation
- [x] Demand Analytics System
- [x] Marketing Tools & Project Showcase
- [x] Startup Features (Templates, Validation, Health Scores)
- [x] Enhanced Dashboards (Analytics Export, Admin Analytics)
- [x] AI Landing Page Generator
- [x] Referral & Affiliate System
- [x] Stripe Billing Integration
- [ ] OAuth for private repositories
- [ ] Self-hosted Docker/K8s deployment
- [ ] Vercel Edge Functions support
- [ ] A/B testing with Vercel Flags

## SVG Graphics System

All graphics are **inline SVG components** — no external image files, no npm dependencies for icons.

```
src/components/graphics/
├── HeroIllustration.tsx    # Animated hero scene: code → servers → rocket
├── FeatureIcons.tsx        # 6 unique feature icons with gradients
├── BackgroundPatterns.tsx  # Grid, dots, waves, floating particles
└── index.ts                # Barrel exports
```

### Build Status
- ✅ TypeScript: 0 errors
- ✅ Next.js build: 32+ pages, 0 errors
- ✅ Turbopack enabled by default
- ✅ Zero external icon dependencies

## License

MIT

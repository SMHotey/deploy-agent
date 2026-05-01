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

### 🆕 New: Smart Analysis & Marketing (2026-05)
- **Repository Analysis System** - Auto-detect tech stack (Next.js, React, Vue, Python, etc.) and recommend optimal hosting
- **Demand Analytics** - Track project interest, calculate demand scores, identify trending projects
- **Marketing Tools** - Project showcase, share tracking (social/email/embed), promotional analytics
- **Startup Features** - Readiness validation, project templates, health scores, budget control
- **Enhanced Dashboards** - Analytics export (CSV/JSON), financial analytics, system health monitoring

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

### 3. Run locally

```bash
npm run dev
```

### 4. Deploy

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/vercel/next.js",
    "project_name": "my-next-app"
  }'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/deploy` | Create deployment |
| GET | `/api/deploy?deployment_id=xxx` | Get deployment status/logs |
| GET | `/api/projects` | List projects |
| GET | `/api/health` | Health check |

### 🆕 New API Endpoints (2026-05)

| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/repo-analyze?repo_url=...` | Analyze repository & recommend hosting |
| GET | `/api/demand` | Get demand analytics for projects |
| POST | `/api/demand/track` | Track demand event (view, deploy, share) |
| GET | `/api/marketing/showcase` | Public project showcase |
| POST | `/api/marketing/showcase` | Track share event |
| GET | `/api/startup/templates` | Get startup project templates |
| POST | `/api/startup/validate` | Validate startup readiness |
| GET | `/api/startup/health-score` | Get project health score |
| GET | `/api/analytics/export` | Export analytics (CSV/JSON) |
| GET | `/api/admin/billing-analytics` | Admin: Financial analytics |

## Configuration

All parameters are optional. See [API Reference](#api-reference) for full list.

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
    "setup_github_actions": true,
    "notification_slack": "https://hooks.slack.com/services/xxx"
  }'
```

### Example: Monorepo with custom build

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/my-org/monorepo",
    "root_directory": "/apps/web",
    "build_override": "turbo run build --filter=web",
    "output_directory": "dist",
    "custom_domain": "myapp.example.com",
    "generate_terraform": true
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

- **Frontend**: Next.js (App Router) + TailwindCSS
- **Backend**: Next.js API Routes + Node.js services
- **Database**: PostgreSQL (via Drizzle ORM)
- **Queue/Cache**: Redis (Upstash compatible)

## Security

- All sensitive data (API keys, passwords) encrypted with AES-256-GCM
- Rate limiting (10 requests/minute by default)
- Environment variables never logged
- Webhook signature validation

## Roadmap

- [x] Repository Analysis & Hosting Recommendation
- [x] Demand Analytics System
- [x] Marketing Tools & Project Showcase
- [x] Startup Features (Templates, Validation, Health Scores)
- [x] Enhanced Dashboards (Analytics Export, Admin Analytics)
- [x] Deployment Flow Integration (auto-analyze before deploy)
- [ ] OAuth for private repositories
- [ ] Self-hosted Docker/K8s deployment
- [ ] Vercel Edge Functions support
- [ ] A/B testing with Vercel Flags

## License

MIT

## Monetization Plan (Stealth Startup - Option A)

### Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 projects, 10 deployments/day, 1 user, 100MB storage, Community support |
| **Pro** | $29/mo | 20 projects, 100 deployments/day, 5 team members, 1GB storage, Priority support, Custom domains |
| **Team** | $99/mo | Unlimited projects, 1,000 deployments/day, 50 team members, 10GB storage, SSO, Sentry, 99.9% SLA |
| **Enterprise** | $499+/mo | Unlimited everything, Dedicated instance, On-premise, Custom SLA, Phone support |

### Usage Tracking

- Daily deployment limits (resets at midnight UTC)
- Project count limits
- Storage quotas (environment variables, build artifacts)
- Team member limits

### Billing System

- **Billing Dashboard**: `/billing` - View plans, upgrade/cancel (demo mode)
- **API Endpoint**: `GET/POST /api/billing`
- **Usage API**: Track deployments, projects, storage
- **Plan Limits**: Enforced at API level (409 Conflict if exceeded)

### Revenue Projections (Week 8 target: 100 beta users)

- 80 Free users (learning product)
- 15 Pro users × $29 = $435/mo
- 5 Team users × $99 = $495/mo
- **Total MRR**: ~$930/mo

### Go-to-Market

1. **Beta (Weeks 1-4)**: Free tier only, 50-100 users, gather feedback
2. **Launch (Weeks 5-6)**: Enable Pro/Team, content marketing, Product Hunt launch
3. **Scale (Weeks 7-8)**: Enterprise outreach, partnerships, $930 MRR goal

### Key Metrics to Track

- Deployment success rate (target: >95%)
- User retention (Week 1 → Week 4)
- Upgrade conversion rate (Free → Pro/Team)
- Support ticket volume (target: <5% of user base)

---

## 🆕 New Features (May 2026)

### Repository Analysis System
Automatically analyzes repository URLs to detect:
- **Frontend stack**: Next.js, React, Vue, Angular, Svelte
- **Backend stack**: Node.js/Express, Python/Flask, Python/Django, Go, Rust
- **Databases**: PostgreSQL, MongoDB, MySQL, SQLite, Redis
- **Infrastructure**: Docker, Docker Compose, Kubernetes

**Endpoint**: `GET /api/repo-analyze?repo_url=https://github.com/vercel/next.js`

**Returns**: Detected stack + hosting recommendation with confidence score

### Demand Analytics System
Tracks project interest and calculates demand scores (0-100):
- Based on deployment frequency, project age, recent activity
- Identifies trending projects
- Platform distribution analytics

**Endpoints**:
- `GET /api/demand` - Get demand analytics
- `POST /api/demand/track` - Track demand event (view, deploy, share)

### Marketing Tools
Promotes deployed projects:
- **Project Showcase**: Public discovery of top-deployed projects
- **Share Tracking**: Track shares across social, email, embed, direct
- **Promotional Analytics**: Measure marketing effectiveness

**Endpoints**:
- `GET /api/marketing/showcase` - Browse projects
- `POST /api/marketing/showcase` - Track share event

### Startup Features
Tools for early-stage projects:
- **Readiness Validation**: Check repo against best practices
- **Project Templates**: Pre-configured setups (SaaS, E-commerce, Blog, etc.)
- **Health Scores**: Monitor project vital signs
- **Budget Control**: Track usage against billing plan

**Endpoints**:
- `GET /api/startup/templates` - Browse templates
- `POST /api/startup/validate` - Validate readiness
- `GET /api/startup/health-score` - Get health metrics

### Enhanced Dashboards
- **Analytics Page** (`/analytics`): Export to CSV/JSON, ProjectDetail deep-dive, AnimatedNumber components
- **Admin Dashboard** (`/admin`): Financial analytics, system health monitoring, user analytics, notification center

### Deployment Flow Integration
The deployment process now:
1. **Auto-analyzes** repository before deployment
2. **Recommends hosting** if not specified
3. **Tracks demand** after successful deployment
4. **Returns analysis** in deployment response

---

## SVG Graphics System (Added 2026-04-29)

### Architecture

All graphics are **inline SVG components** — no external image files, no npm dependencies for icons. Everything is pure SVG + CSS animations, built directly into the codebase.

```
src/components/graphics/
├── HeroIllustration.tsx    # Animated hero scene: code → servers → rocket
├── FeatureIcons.tsx        # 6 unique feature icons with gradients
├── BackgroundPatterns.tsx  # Grid, dots, waves, floating particles
└── index.ts                # Barrel exports
```

### Hero Illustration (`HeroIllustration.tsx`)
**800×400 SVG**, pure CSS animations, no external dependencies.

| Animation | Effect | Duration |
|-----------|--------|----------|
| `float-slow` | Gentle Y-axis floating (code editor, servers) | 4s ease-in-out |
| `float-fast` | Faster floating (rocket) | 2.5s ease-in-out |
| `rocket-launch` | Rocket rocking with rotation | 3s ease-in-out |
| `flame-flicker` | Flame scaling + opacity | 0.3s ease-in-out |
| `pulse-glow` | Server LED indicators glow | 2s ease-in-out |
| `dash-move` | Data flow lines (dotted, animated) | 1s linear |
| `particle-drift` | Particles rising + fading | 1.8–2.5s ease-out |

**Scene composition:**
- **Left**: Code editor window with syntax-highlighted lines (`deploy.ts`)
- **Center**: Two server racks with pulsing LED indicators
- **Right**: Rocket with gradient body, window, fins, and animated flame
- **Connections**: Dotted SVG paths with `stroke-dashoffset` animation
- **Background**: Grid pattern, floating ambient particles
- **Success badge**: Green checkmark circle (floating)

### Feature Icons (`FeatureIcons.tsx`)
6 hand-crafted SVG icons, each 48×48 with circular background and gradient fills:

| Icon | Gradient | Visual Elements |
|------|----------|-----------------|
| `IconInstantDeploys` | `#60a5fa → #818cf8` | Lightning bolt + deploy arrow |
| `IconSecureByDefault` | `#34d399 → #10b981` | Shield with lock + keyhole |
| `IconRealtimeLogs` | `#fbbf24 → #f97316` | Terminal window + streaming dots |
| `IconHundredParams` | `#c084fc → #a855f7` | Three horizontal sliders with knobs |
| `IconMultiPlatform` | `#38bdf8 → #3b82f6` | Central hub + 4 connected nodes |
| `IconAnalytics` | `#22c55e → #16a34a` | Bar chart + trend line with dot |

**Usage:**
```tsx
import { IconInstantDeploys } from '@/components/graphics/FeatureIcons';

<IconInstantDeploys /> // renders 40×40 SVG
```

### Background Patterns (`BackgroundPatterns.tsx`)

| Component | Purpose | Props |
|-----------|---------|-------|
| `GridPattern` | Subtle grid overlay | None |
| `DotPattern` | Dot matrix texture | None |
| `WavePattern` | Section divider wave | `className?` for sizing |
| `FloatingParticles` | Ambient floating dots | `count` (default: 20) |

**Usage:**
```tsx
import { GridPattern, FloatingParticles, WavePattern } from '@/components/graphics/BackgroundPatterns';

<section className="relative overflow-hidden">
  <GridPattern />
  <FloatingParticles count={15} />
  <WavePattern className="h-24" />
  {/* content */}
</section>
```

### OG Images (`next/og`)

| File | Route | Purpose |
|------|-------|---------|
| `src/app/opengraph-image.tsx` | `/` | Root page (auth) social share |
| `src/app/landing/opengraph-image.tsx` | `/landing` | Landing page social share |

Both generate **1200×630 PNG** images via `ImageResponse` (edge runtime). Features:
- Dark gradient background (`#0f172a → #1e293b`)
- Grid overlay pattern
- 3 colored glow orbs (blue, violet, green)
- Shield logo SVG with gradient
- Gradient title text ("Ship Code Faster")
- Feature badges at bottom
- Gradient bottom bar

**Usage in social sharing:**
```html
<meta property="og:image" content="https://your-domain.com/landing/opengraph-image" />
```

### Landing Page Integration

The landing page (`src/app/landing/page.tsx`) uses all graphics components:

```tsx
import { HeroIllustration } from '@/components/graphics/HeroIllustration';
import { GridPattern, FloatingParticles, WavePattern } from '@/components/graphics/BackgroundPatterns';
import { IconInstantDeploys, IconSecureByDefault, /* ... */ } from '@/components/graphics/FeatureIcons';
```

**Changes from previous version:**
- Heroicons → `FeatureIcons` components (6 unique icons)
- Added `HeroIllustration` below CTA buttons
- Added `GridPattern` + `FloatingParticles` to hero background
- Added `WavePattern` divider between hero and features
- Feature cards now have `hover:border-blue-500/30` + `group-hover:scale-110` icon animation
- Platform cards have gradient overlay on hover
- Footer logo now has gradient background (`from-blue-500 to-violet-500`)

### Build Status
- ✅ TypeScript: 0 errors
- ✅ Next.js build: 32 pages, 0 errors
- ✅ OG images: edge runtime, static generation compatible
- ✅ Zero external dependencies added
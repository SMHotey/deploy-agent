# Deploy Agent

A production-ready deployment automation agent that deploys git repositories to Vercel (and other platforms) with full configuration support.

## Features

- **One-click deployment** from GitHub, GitLab, or Bitbucket repositories
- **Multi-platform support**: Vercel, Netlify, Cloudflare Pages, Railway
- **Full configuration** via API or UI (100+ parameters)
- **Environment variable encryption** (AES-256-GCM)
- **Rate limiting** (Redis or in-memory)
- **Retry with exponential backoff** for all external APIs
- **GitHub Actions integration** for CI/CD
- **Real-time deployment logs**
- **Supabase backend automation** support

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

- [ ] OAuth for private repositories
- [ ] Self-hosted Docker/K8s deployment
- [ ] Vercel Edge Functions support
- [ ] A/B testing with Vercel Flags
- [ ] Dashboard with analytics

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
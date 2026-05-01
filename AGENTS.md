# Deploy Agent - Agent Guidelines

## Essential Commands
- `npm run dev` - Start dev server (Turbopack default in Next.js 16)
- `npm run build` - Production build (Turbopack default)
- `npm run start` - Start production server
- `npm run lint` - ESLint (flat config, uses eslint-config-next)
- `npm run typecheck` - Typecheck (`tsc --noEmit`)
- `npm run test` - Run unit + integration tests
  - Unit tests only: `npm run test -- src/lib/__tests__/`
  - Integration tests require server: set `DEPLOY_AGENT_URL=http://localhost:3000` then run `npm run test -- src/__tests__/api.test.ts`
- `npm run db:push` - Push Drizzle schema to database
- `npm run db:generate` - Generate Drizzle migrations (outputs to `drizzle/`)

## Next.js 16 Critical Notes
- **Turbopack is default** for `dev` and `build`. No `--turbopack` flag needed. Custom webpack config requires `--webpack`.
- **Async Request APIs**: `cookies()`, `headers()`, `params`, `searchParams` are async-only. Always `await`.
- **`middleware` renamed to `proxy`**: File is `src/proxy.ts`, export is `proxy()`.
- **`revalidateTag` requires 2 args**: `revalidateTag('tag', 'cacheLifeProfile')`.
- **Parallel routes require explicit `default.js`** files.
- **React 19.2** features: View Transitions, `useEffectEvent`, Activity.

## Environment Setup
- Copy `.env.example` to `.env`
- Required: `DATABASE_URL`, `REDIS_URL`, `VERCEL_TOKEN`, `GITHUB_TOKEN`, `ENCRYPTION_KEY`, `JWT_SECRET`
  - `JWT_SECRET` falls back to `ENCRYPTION_KEY` if not set.
- **OpenAI**: `OPENAI_API_KEY` for AI landing page generation
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Testing
- Unit tests (no server needed): `npm run test -- src/lib/__tests__/`
- Integration tests (require running server):
    1. Start dev server: `npm run dev` (in another terminal)
    2. Set `DEPLOY_AGENT_URL=http://localhost:3000`
    3. Run: `npm run test -- src/__tests__/api.test.ts`
- To run a single test by name: `npm run test -- -t "test name"`

## Database
- Uses Drizzle ORM with PostgreSQL (`node-postgres` driver)
- Schema: `src/db/schema.ts`
- Connection: `src/db/index.ts`
- **Key Tables**:
  - `landing_pages` - AI-generated marketing pages
  - `referral_events` - Referral click/conversion tracking
  - `hosting_providers` - With `referralCode` field
  - `subscriptions` - Stripe subscription data
  - `users` - With `referralCode`, `referredBy` fields

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
| POST | `/api/admin/generate-landing/publish` | Publish landing page to `/landing/[slug]` |
| POST | `/api/admin/generate-landing/delete` | Delete a landing page |

### Billing & Stripe
| Method | Endpoint | Description |
|--------|----------|------------|
| GET/POST | `/api/billing` | Get plans, create checkout, customer portal |
| POST | `/api/webhooks/stripe` | Stripe webhook handler (signature verified) |

### Referrals & Affiliates
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/referral/track` | Track referral click/conversion |
| GET | `/api/referrals` | Get user's referral stats |

### Analytics & Marketing
| Method | Endpoint | Description |
|--------|----------|------------|
| GET | `/api/repo-analyze` | Analyze repository & recommend hosting |
| GET | `/api/demand` | Get demand analytics for projects |
| POST | `/api/demand/track` | Track demand event (view, deploy, share) |
| GET | `/api/marketing/showcase` | Public project showcase |
| POST | `/api/marketing/showcase` | Track share event |
| GET | `/api/startup/templates` | Get startup project templates |
| POST | `/api/startup/validate` | Validate startup readiness |
| GET | `/api/startup/health-score` | Get project health score |
| GET | `/api/analytics/export` | Export analytics (CSV/JSON) |

### Review Marketplace
| Method | Endpoint | Description |
|--------|----------|------------|
| POST | `/api/projects/submit-for-review` | Submit project for review |
| GET | `/api/projects/submit-for-review` | List projects available for review |
| POST | `/api/reviews` | Submit a review for a project |
| GET | `/api/reviews?submissionId=...` | Get reviews for a submission |
| POST | `/api/reviews/rate` | Rate review quality & award points |
| GET | `/api/leaderboard` | Get leaderboard rankings |

## Page Routes

### Public Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page with SVG graphics |
| `/landing/[slug]` | AI-generated marketing landing pages |
| `/landing` | Landing page listing |
| `/partners` | Hosting partner offers with referral links |
| `/billing` | Subscription management (Stripe) |
| `/pricing` | Pricing page |
| `/blog` | Blog posts |

### Dashboard & Admin
| Route | Description |
|-------|-------------|
| `/dashboard` | User dashboard |
| `/projects` | Project list |
| `/projects/new` | New project (with hosting banners) |
| `/admin` | Admin dashboard (analytics, referrals) |
| `/admin/marketing/generate-landing` | AI landing generator UI |
| `/settings` | User settings |
| `/profile` | User profile (with subscription tab) |

## Gotchas & Conventions
- `cli.ts` is excluded from `tsconfig` (Commander CLI, tested via `node cli.ts --help`).
- Integration tests (`src/__tests__/api.test.ts`) require a running server and hit live endpoints.
- Rate limiter uses in-memory fallback when `REDIS_URL` is not set.
- AES-GCM encryption may produce Node.js warnings about authTag length (cosmetic, works correctly).
- SVG graphics system: inline SVG components in `src/components/graphics/` (HeroIllustration, FeatureIcons, BackgroundPatterns).
- **OpenAI calls**: Use `gpt-4o-mini` model, return JSON config only (no markdown).
- **Stripe webhooks**: Always verify signature using `STRIPE_WEBHOOK_SECRET`.
- **Referral tracking**: Automatic on `/projects/new` hosting banners, manual via `/api/referral/track`.

## Project Structure (brief)
- `src/app/` - Next.js App Router (pages, layouts, route handlers)
- `src/app/api/` - API routes (auth, deploy, billing, referrals, AI landing)
- `src/app/admin/marketing/` - Admin UI for AI landing generator
- `src/app/landing/[slug]/` - Dynamic landing pages
- `src/lib/` - Services (auth, deploy, vercel, github, encryption, stripe, referrals)
- `src/components/` - React components
  - `DynamicLanding.tsx` - Renders AI-generated landing config
  - `graphics/` - SVG graphics (HeroIllustration, FeatureIcons, BackgroundPatterns)
- `src/db/` - Database schema and connection
  - `schema.ts` - All tables: users, projects, landing_pages, referral_events, subscriptions
- `src/proxy.ts` - Next.js middleware (renamed from middleware.ts)

## Stripe Billing Plans
| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 3 projects, 10 deploys/day, 1 user |
| Pro | $29/mo | 20 projects, 100 deploys/day, 5 team members |
| Team | $99/mo | Unlimited projects, 1000 deploys/day, 50 members, SSO |
| Enterprise | $499+/mo | Unlimited everything, dedicated instance |

Usage limits enforced at API level (returns 409 Conflict if exceeded).

## AI Landing Page Generator
- Uses OpenAI `gpt-4o-mini` to generate JSON config
- Config structure: `{ hero, features[], cta }`
- Publish to `/landing/[slug]` with one click
- Admin UI at `/admin/marketing/generate-landing`
- Preview before publishing with `DynamicLanding` component
- Delete published pages via API or admin UI

## Referral System
- Each user gets auto-generated `referralCode`
- Track clicks/conversions in `referral_events` table
- Hosting providers configured with `referralCode` in `hosting_providers`
- Partner page at `/partners` with referral banners
- Admin analytics show referral stats and conversion rates

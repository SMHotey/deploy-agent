<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploy Agent

Deployment automation agent: deploys git repos to Vercel (and other platforms). Next.js 16 App Router frontend + API routes, PostgreSQL via Drizzle ORM, Redis for rate limiting.

## Commands (exact, verified)

```bash
npm run dev          # Start dev server (Turbopack by default in Next.js 16)
npm run build        # Production build (Turbopack by default)
npm run start        # Start production server
npm run lint         # ESLint (flat config, eslint-config-next)
npm run typecheck    # Typecheck (npx tsc --noEmit)
npm run test         # Run unit tests (vitest run)
npm run db:push      # Push Drizzle schema to database
npm run db:generate  # Generate Drizzle migrations
```

**Single test / focused run:**
```bash
npx vitest run src/__tests__/api.test.ts
npx vitest run --t "Health Check"
```

Docker: `docker-compose up --build` spins up app + Postgres 15 + Redis 7.

## Next.js 16 Breaking Changes (Critical)

Read `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` before any Next.js work.

Key differences from Next.js 14/15 that **will** bite you:

- **Turbopack is default** for both `dev` and `build`. No `--turbopack` flag needed. Custom `webpack` config will **fail** the build unless you pass `--webpack`.
- **Async Request APIs** — `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are all **async-only**. Synchronous access is fully removed. Always `await` them.
- **`middleware` renamed to `proxy`** — file is now `proxy.ts`, export is `proxy()`. Config flags like `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`. This repo has neither.
- **`next lint` removed** — use ESLint CLI directly (`npm run lint` already does this).
- **`revalidateTag` requires 2 args** — `revalidateTag('tag', 'cacheLifeProfile')`. Single-arg form is deprecated.
- **`cacheLife`/`cacheTag` stable** — drop `unstable_` prefix.
- **`experimental.dynamicIO` → `cacheComponents`**
- **`experimental.turbopack` → top-level `turbopack`** in next.config
- **`.next/dev` is separate from `.next`** — dev and build use different output dirs.
- **Parallel routes require explicit `default.js`** files or build fails.
- **React 19.2** with View Transitions, `useEffectEvent`, Activity.

## Project Structure (verified paths)

```
src/
  app/
    page.tsx              # Auth page (login/register) with gradient hero
    layout.tsx            # Root layout (server component, metadata, fonts)
    globals.css           # Tailwind v4 styles + 40+ CSS vars + 8 keyframe animations
    opengraph-image.tsx   # OG image for root page (1200x630, edge runtime)
    landing/
      page.tsx            # Landing page with SVG graphics system
      opengraph-image.tsx # OG image for landing page
    api/
      auth/
        login/route.ts    # User login (JWT)
        register/route.ts # User registration (JWT)
        me/route.ts       # Get current user (JWT)
        tokens/route.ts   # User token management
      deploy/route.ts     # POST create deployment, GET status/logs
      deploy/[id]/
        stream/route.ts   # SSE streaming for deployment logs
      health/route.ts     # Health check (DB + Redis ping)
      projects/route.ts   # GET list, POST create, DELETE projects
      projects/[projectId]/
        env-vars/route.ts     # GET/POST env vars (AES-256-GCM encrypted)
        env-vars/[envVarId]/route.ts # GET/PUT/DELETE single env var
      teams/route.ts          # GET/POST teams
      teams/[teamId]/route.ts # GET/PUT/DELETE team
      teams/[teamId]/
        members/route.ts      # GET/POST team members
        members/[userId]/route.ts # PUT/DELETE member role
      webhooks/
        github/route.ts   # GitHub push webhook (auto-deploy)
        vercel/route.ts   # Vercel deployment status webhook (idempotent)
      billing/route.ts    # Plan management + usage tracking
      analytics/route.ts  # Deployment analytics
      instructions/route.ts # API documentation
      config/supabase/route.ts # Supabase config
    dashboard/page.tsx    # User dashboard
    deploy/page.tsx       # Deploy form
    deploy/[id]/page.tsx  # Deployment status viewer
    projects/page.tsx     # Projects list + cards
    projects/[projectId]/
      env/page.tsx        # Environment variables management UI
    teams/page.tsx        # Teams management
    billing/page.tsx      # Billing dashboard (demo mode)
    analytics/page.tsx    # Analytics dashboard
    audit-logs/page.tsx   # Audit log viewer (paginated, filtered)
    settings/page.tsx     # Settings page
    settings/supabase/page.tsx  # Supabase settings
    settings/tokens/page.tsx    # Token management
    instructions/page.tsx # API docs viewer
    providers.tsx         # ThemeProvider + AuthProvider + ToastProvider
  components/
    graphics/
      HeroIllustration.tsx   # Animated SVG hero scene (code→servers→rocket)
      FeatureIcons.tsx       # 6 unique feature icons with gradients
      BackgroundPatterns.tsx # Grid, dots, waves, floating particles
      index.ts               # Barrel exports
    ui/
      Input.tsx              # Form input with label, error, hint (ReactNode)
      Button.tsx             # Button with loading spinner
      Toast.tsx              # Toast notification system
      Skeleton.tsx           # Shimmer loading skeleton (3 variants)
      Navbar.tsx             # Top navigation with links + theme toggle
  lib/
    auth.ts               # JWT auth, user management, encrypted token storage
    auth-context.tsx      # React context: useAuth() with getToken()
    theme-context.tsx     # React context: useTheme() with toggleTheme()
    deploy.ts             # DeployService — core deployment orchestration
    vercel.ts             # Vercel API client (with 30s timeouts)
    github.ts             # GitHub API client (with 30s timeouts)
    validation.ts         # Zod schemas (DeployParams, webhooks)
    rate-limiter.ts       # Redis-backed rate limiter (in-memory fallback)
    encryption.ts         # AES-256-GCM encryption for secrets
    retry.ts              # Retry with exponential backoff
    logger.ts             # Structured logging with request IDs
    shutdown.ts           # Graceful shutdown handlers (SIGTERM/SIGINT)
    config.ts             # Startup validation for env vars
    idempotency.ts        # Idempotency store (Redis + in-memory, 24h TTL)
  db/
    schema.ts             # Drizzle schema: 5 tables
    index.ts              # DB connection pool (pg + drizzle-orm/node-postgres)
  __tests__/
    api.test.ts           # Vitest integration tests (hit live API)
  lib/
    __tests__/
      encryption.test.ts  # Encryption unit tests (4 tests)
      retry.test.ts       # Retry logic unit tests (4 tests)
      validation.test.ts  # Validation unit tests (7 tests)
      auth.test.ts        # Auth unit tests (7 tests)
cli.ts                    # Commander CLI (excluded from tsconfig)
drizzle.config.ts         # Drizzle Kit config (PostgreSQL)
vitest.config.ts          # Vitest configuration (aliases: @/ → ./src/)
proxy.ts                  # Security headers + CORS (Next.js 16)
README_RU.md              # Russian user manual
```

Path alias: `@/*` maps to `./src/*` (tsconfig + vitest config).

## Environment

Copy `.env.example` to `.env`. Required vars:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string (rate limiter falls back to in-memory)
- `VERCEL_TOKEN` — Vercel API token (for deployments)
- `GITHUB_TOKEN` — GitHub PAT (repo scope)
- `ENCRYPTION_KEY` — 32-byte key for AES-256-GCM
- `JWT_SECRET` — Secret for JWT tokens (falls back to ENCRYPTION_KEY)

Optional: `SUPABASE_TOKEN`, `VERCEL_TEAM_ID`, `SENTRY_DSN`, rate limit tuning vars, `LOG_LEVEL`, `ALLOWED_ORIGINS`.

## Database

- Drizzle ORM with `node-postgres` driver
- Schema: `src/db/schema.ts` — 5 tables: `users`, `projects`, `deployments`, `environment_variables`, `audit_logs`
- Connection: `src/db/index.ts` — uses `pg.Pool` with `DATABASE_URL`
- Migrations output to `./drizzle/` — run `npm run db:generate` to create
- Push schema: `npm run db:push`

**Key schema details:**
- `users`: id, email (unique), passwordHash, name, vercelToken (encrypted), githubToken (encrypted)
- `projects`: 50+ columns including platform, repoUrl, build settings, notification config
- `deployments`: deploymentIdExternal, status (enum), url, logsUrl, buildTime
- `environment_variables`: projectId FK, encryptedValue (AES-256-GCM with iv/salt)
- `audit_logs`: projectId/userId FK, action, details (JSONB), ipAddress

## Security & Auth

- **JWT Authentication**: Users register/login via `/api/auth/register` and `/api/auth/login`
- **Per-user tokens**: Users store their own Vercel/GitHub tokens (encrypted in DB via `storeUserTokens()`)
- **Encrypted storage**: AES-256-GCM for all sensitive data (tokens, env vars)
  - `encrypt(value, key)` → `{ encrypted, iv, authTag, salt }`
  - `decrypt(encryptedValue, key)` → plaintext
  - Key: 32+ chars, stored in ENCRYPTION_KEY/JWT_SECRET
- **Rate limiting**: 10 requests/minute per IP (Redis or in-memory `MemoryStore`)
- **Security headers**: Set via `proxy.ts` (X-Content-Type-Options, X-Frame-Options, CORS via ALLOWED_ORIGINS)
- **Error handling**: Standardized error responses (no internal details leak in production)

**Auth flow (verified from code):**
1. Registration: `password → bcrypt.hash(10)` → store in DB → `jwt.sign({ sub, email, name })` → return token
2. Login: Find user by email → `bcrypt.compare(password, hash)` → `jwt.sign(...)` → return token
3. Auth middleware: Read `Authorization: Bearer <token>` → `jwt.verify(token)` → return `{ id, email, name }`
4. Token storage: `encrypt(vercelToken, ENCRYPTION_KEY)` → store JSON string in `users.vercelToken`

## Style & Conventions

- **TypeScript strict mode**, target ES2017, bundler module resolution
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **ESLint flat config** (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals`
- **Zod** for request validation
- **Vitest** for testing (unit + integration)
  - Config: `vitest.config.ts` with alias `@/` → `src/`
  - Globals: `true` (no imports needed for describe/it/expect)
  - Environment: `node` (not jsdom — these are API/unit tests)
  - **Integration tests require running server** — set `DEPLOY_AGENT_URL` (default: `http://localhost:3000`)
  - To run single test: `npx vitest run --t "test name"`
  - To run single file: `npx vitest run path/to/file.test.ts`
- API routes export named HTTP method handlers with JWT auth

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
- Lint, typecheck, unit tests (with Postgres + Redis services)
- Integration tests (requires running server)
- Production build verification

## Gotchas (repo-specific, verified)

- **Dockerfile is fixed**: Removed stale Prisma references, aligned with Drizzle + Next.js 16
- **`cli.ts` excluded from tsconfig** — uses Commander, tested in api.test.ts via `node cli.ts --help`
- **Tests require running server** — api.test.ts calls `fetch()` against `DEPLOY_AGENT_URL` (default `http://localhost:3000`). No mocking.
- **npm audit** — 6 moderate vulnerabilities (esbuild <0.24.2, postcss <8.5.10) — require breaking changes to fix
- **Build status**: ✅ passes, TypeScript: ✅ passes, Lint: ✅ passes (warnings only)
- **schema.ts**: Fixed typo `Branch` → `branch` (line 120)
- **next.config.ts** is minimal placeholder — no webpack/turbopack overrides; relies on Next.js 16 defaults (Turbopack)
- **Vitest aliases**: Configured in both `tsconfig.json` (`paths`) and `vitest.config.ts` (`test.alias`) for `@/*` → `src/`
- **Rate limiter**: Uses in-memory fallback when Redis unavailable; `initRateLimiter(undefined)` in tests
- **Encryption warnings**: Node.js may warn about AES-GCM authTag length — this is cosmetic, encryption works correctly

## Scripts (verified from package.json)

| Script | Exact Command | Notes |
|--------|---------------|-------|
| `dev` | `next dev` | Turbopack default (Next.js 16) |
| `build` | `next build` | Turbopack default, outputs to `.next/` |
| `start` | `next start` | Production server |
| `lint` | `eslint` | Uses flat config, eslint-config-next |
| `typecheck` | `tsc --noEmit` | Uses tsconfig.json settings |
| `test` | `vitest run` | Runs unit + integration tests |
| `db:push` | `drizzle-kit push` | Pushes schema to DB |
| `db:generate` | `drizzle-kit generate` | Generates migrations in `drizzle/` |

## Quick Reference: Running Tests

```bash
# All tests
npm test

# Single file
npx vitest run src/__tests__/api.test.ts

# Single test by name
npx vitest run --t "Health Check"

# Unit tests only (no server needed)
npx vitest run src/lib/__tests__/

# Integration tests (requires server at DEPLOY_AGENT_URL)
DEPLOY_AGENT_URL=http://localhost:3000 npm test -- src/__tests__/api.test.ts
```

## Quick Reference: Database

```bash
# Push current schema to DB (no migrations needed)
npm run db:push

# Generate migration files (emits to drizzle/)
npm run db:generate

# Migrations location: drizzle/*.sql (generated by drizzle-kit)
```

## SVG Graphics System (Added 2026-04-29)

### Architecture

All graphics are **inline SVG components** — no external image files, no npm dependencies. Pure SVG + CSS animations.

```
src/components/graphics/
├── HeroIllustration.tsx    # Animated hero scene: code → servers → rocket (800x400)
├── FeatureIcons.tsx        # 6 unique feature icons with gradients (48x48 each)
├── BackgroundPatterns.tsx  # Grid, dots, waves, floating particles
└── index.ts                # Barrel exports
```

### Hero Illustration
- **Animations**: `float-slow` (4s), `float-fast` (2.5s), `rocket-launch` (3s), `flame-flicker` (0.3s), `pulse-glow` (2s), `dash-move` (1s), `particle-drift` (1.8-2.5s)
- **Scene**: Code editor (left) → Servers (center) → Rocket (right) with animated data flow lines
- **'use client'**: Required for `<style>` tag with keyframes

### Feature Icons (6 total)
| Component | Color | Elements |
|-----------|-------|----------|
| `IconInstantDeploys` | blue→violet | Lightning bolt + deploy arrow |
| `IconSecureByDefault` | green | Shield + lock + keyhole |
| `IconRealtimeLogs` | amber→orange | Terminal window + streaming dots |
| `IconHundredParams` | purple | Three horizontal sliders |
| `IconMultiPlatform` | sky blue | Central hub + 4 connected nodes |
| `IconAnalytics` | green | Bar chart + trend line |

### Background Patterns
| Component | Props | Purpose |
|-----------|-------|---------|
| `GridPattern` | none | Subtle grid overlay |
| `DotPattern` | none | Dot matrix texture |
| `WavePattern` | `className?` | Section divider wave |
| `FloatingParticles` | `count` (default: 20) | Ambient floating dots |

### OG Images (next/og)
- `src/app/opengraph-image.tsx` → Root `/` page (1200x630 PNG, edge runtime)
- `src/app/landing/opengraph-image.tsx` → `/landing` page (1200x630 PNG, edge runtime)
- Both: dark gradient, grid overlay, 3 glow orbs, shield logo, gradient text, feature badges

### Landing Page Integration
- Hero: `GridPattern` + `FloatingParticles` + `HeroIllustration` + `WavePattern`
- Features: heroicons → `FeatureIcons` (6 unique), hover `scale-110` + `border-blue-500/30`
- Platforms: gradient overlay on hover per platform
- Footer: gradient logo badge

### Build Status
- ✅ TypeScript: 0 errors
- ✅ Next.js build: 32 pages, 0 errors
- ✅ Zero external dependencies added
- ✅ Commit: `22fab94`

## Current State (as of 2026-04-29)

### Completed
- Roadmap: All 10 tasks completed and committed
- UI/UX Redesign: Full redesign with glassmorphism, animations, theme toggle
- Components: Input, Button, Toast, Skeleton, Navbar
- Contexts: useAuth(), useToast(), useTheme()
- New APIs: Env vars CRUD, Audit logs, GitHub webhook, Vercel webhook (idempotent), Teams CRUD
- Security fixes: User enumeration, idempotency, audit logging, atomic deletes
- Tests: 63 passing, 12 skipped, 0 failures
- SVG Graphics System: Hero illustration, 6 feature icons, background patterns, OG images

### Pending Work
1. Stripe billing integration (schema exists, API pending)
2. Admin dashboard page for monitoring all deployments/users
3. Webhook event replay/retry mechanism
4. PR-based preview deployments via GitHub webhook
5. i18n support (currently all strings hardcoded in English)

### Branch Status
- Branch: `master`, up to date with `origin/master`
- Last commit: `22fab94` — feat: add SVG graphics system
- Build: 32 pages, 0 errors
- TypeScript: 0 errors

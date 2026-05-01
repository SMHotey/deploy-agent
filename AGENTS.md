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

## Gotchas & Conventions
- `cli.ts` is excluded from `tsconfig` (Commander CLI, tested via `node cli.ts --help`).
- Integration tests (`src/__tests__/api.test.ts`) require a running server and hit live endpoints.
- Rate limiter uses in-memory fallback when `REDIS_URL` is not set.
- AES-GCM encryption may produce Node.js warnings about authTag length (cosmetic, works correctly).
- SVG graphics system: inline SVG components in `src/components/graphics/` (HeroIllustration, FeatureIcons, BackgroundPatterns).

## Project Structure (brief)
- `src/app/` - Next.js App Router (pages, layouts, route handlers)
- `src/api/` - API routes (auth, deploy, projects, etc.)
- `src/lib/` - Services (auth, deploy, vercel, github, encryption, etc.)
- `src/components/graphics/` - SVG graphics (HeroIllustration, FeatureIcons, BackgroundPatterns)
- `src/db/` - Database schema and connection
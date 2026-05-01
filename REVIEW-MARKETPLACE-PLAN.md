# Review & Testing Marketplace - Implementation Plan & Progress

## Goal
Create a system where users can:
1. Submit their projects for review/testing by others
2. Receive quality reviews and testing reports
3. Award points to testers (based on review quality rated by project owner)
4. Maintain leaderboards (overall + by category)

---

## Database Schema (✅ Complete)

Added to `src/db/schema.ts`:
- `projectSubmissions` - Projects submitted for review
- `reviews` - Reviews and testing reports
- `reviewRatings` - Project owner rates review quality
- `userPoints` - User points (internal currency)
- `pointsTransactions` - Points history
- `leaderboard` - Cached leaderboard (overall + category)

### Categories (Enum)
- saas, e-commerce, blog, portfolio, web-app, mobile-app, api, dashboard, landing-page, other

### Points System
- Quality score 5 → 100 points
- Quality score 4 → 50 points  
- Quality score 3 → 30 points
- Quality score 2 → 20 points
- Quality score 1 → 10 points
- Bonus: +20 for detailed review (rating 4-5)
- Bonus: +20 for screenshots
- Bonus: +20 for testing checklist

---

## API Endpoints (✅ Schema Done, ⚠️ Routes Need Fix)

### ✅ Schema Complete
- `src/db/schema.ts` - All new tables added
- Relations defined
- Type exports available

### ⚠️ Routes Created (Drizzle ORM Type Issues)
- `src/app/api/projects/submit-for-review/route.ts` - Submit project for review
- `src/app/api/reviews/route.ts` - Submit/get reviews
- `src/app/api/reviews/rate/route.ts` - Rate review quality (award points)
- `src/app/api/leaderboard/route.ts` - Get leaderboard + user points

**Issue**: Drizzle ORM type errors when chaining `.where()` after `.orderBy()/.limit()/.offset()`.
**Status**: Working on fixes (see TROUBLESHOOTING.md)

---

## Frontend (❌ Not Started)

### Pages Needed
1. **Submit Project for Review** (`/projects/submit-for-review`)
   - Form: project selection, category, description, demo credentials, testing instructions
   
2. **Browse Projects for Review** (`/review/available`)
   - List approved submissions
   - Filter by category
   - Show points reward

3. **Submit Review** (`/review/[submissionId]`)
   - Rating (1-5 stars)
   - Title & content
   - Pros/cons
   - Bug count
   - Screenshots upload
   - Testing checklist

4. **Leaderboard** (`/leaderboard`)
   - Overall rankings
   - Category rankings
   - User's rank highlight
   - Points & level display

5. **User Profile** (`/profile`)
   - Points balance
   - Transactions history
   - Leaderboard ranks

---

## Points & Leaderboard Logic (✅ Designed)

### Points Awarding Flow
1. Tester submits review
2. Project owner rates review quality (1-5)
3. System calculates points based on quality score
4. Points credited to tester
5. Transaction recorded
6. Leaderboard updated
7. Ranks recalculated

### Leaderboard Update
- Overall leaderboard (category = null)
- Category leaderboard (per category)
- Rank calculation: order by points, assign ranks
- Only updates when points change

---

## Testing Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Complete | All tables added |
| API: Submit Project | ⚠️ Type Errors | Drizzle ORM chaining issue |
| API: Submit Review | ⚠️ Type Errors | Same issue |
| API: Rate Review | ⚠️ Type Errors | Same issue |
| API: Leaderboard | ⚠️ Type Errors | Same issue |
| Frontend Pages | ❌ Not Started | - |
| Build | ❌ Fails | Due to type errors |

---

## Next Steps to Complete

1. **Fix Drizzle ORM Type Issues** (High Priority)
   - Restructure queries: `where()` BEFORE `orderBy/limit/offset`
   - Use `and()` for multiple conditions
   - Fix enum comparisons
   - Test with `npm run typecheck`

2. **Complete API Routes** (High Priority)
   - Test each route individually
   - Verify points calculation
   - Verify leaderboard updates

3. **Build Frontend** (Medium Priority)
   - Create pages listed above
   - Connect to APIs
   - Add points display components

4. **Integration Testing** (Medium Priority)
   - Test full flow: submit → review → rate → points
   - Verify leaderboard updates
   - Test edge cases

---

## Files Modified/Created

### Database
- `src/db/schema.ts` - Added 6 new tables + relations

### API Routes (Need Fix)
- `src/app/api/projects/submit-for-review/route.ts`
- `src/app/api/reviews/route.ts`
- `src/app/api/reviews/rate/route.ts`
- `src/app/api/leaderboard/route.ts`

### Documentation
- `REVIEW-MARKETPLACE-PLAN.md` (this file)
- `TROUBLESHOOTING.md` - Drizzle ORM issues

---

## Quick Fix for Drizzle ORM

```typescript
// ❌ WRONG: where after orderBy/limit/offset
const data = await db
  .select()
  .from(table)
  .orderBy(asc(table.id))
  .limit(10)
  .where(eq(table.status, 'active')); // ERROR: where doesn't exist!

// ✅ CORRECT: where BEFORE orderBy/limit/offset
const data = await db
  .select()
  .from(table)
  .where(eq(table.status, 'active'))
  .orderBy(asc(table.id))
  .limit(10);
```

**Key Rule**: In Drizzle ORM, `where()` must be called before `orderBy()`, `limit()`, `offset()`.

---

## Commit Strategy

Once Drizzle ORM issues are fixed:
```bash
git add -A
git commit -m "feat: Add review & testing marketplace with points system

- Add database schema for review marketplace
- Add project submissions, reviews, ratings tables
- Add user points and leaderboard system
- Design points calculation based on review quality
- Add API routes (needs Drizzle ORM fixes)
- Document implementation plan"
git push origin master
```

---

**Current Blocker**: Drizzle ORM type errors in API routes.
**Estimated Time to Fix**: 1-2 hours (restructure queries).
**Alternative**: Use raw SQL queries to avoid Drizzle ORM type issues.

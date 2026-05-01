# QA Testing Plan - Deploy Agent

## Overview
Comprehensive testing plan for all new functionality added to the Deploy Agent project.

**Test Scope:**
1. Repository Analysis System
2. Demand Analytics System
3. Marketing Tools
4. Startup Features
5. Enhanced Dashboards
6. Deployment Flow Integration

---

## 1. Repository Analysis System (`/api/repo-analyze`)

### 1.1 API Endpoint Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| RPA-001 | Valid GitHub repo URL (Next.js) | 200, detected stack, hosting recommendation | High |
| RPA-002 | Valid GitHub repo URL (React SPA) | 200, React detected, Vercel/Netlify recommended | High |
| RPA-003 | Valid GitHub repo URL (Python/Flask) | 200, Python detected, Railway recommended | High |
| RPA-004 | Valid GitHub repo URL (Node.js/Express) | 200, Node.js detected, Railway recommended | High |
| RPA-005 | Invalid URL format | 400, error message | High |
| RPA-006 | Non-existent repository | 200, fallback analysis (no GitHub API) | Medium |
| RPA-007 | Empty repo_url parameter | 400, validation error | High |
| RPA-008 | Very long URL (>2048 chars) | 400 or 414 | Low |

### 1.2 Stack Detection Tests
| Test Case | Repository Type | Expected Detection |
|-----------|-----------------|-------------------|
| RPS-001 | Next.js project | frontend: Next.js, framework: next |
| RPS-002 | Create React App | frontend: React, framework: create-react-app |
| RPS-003 | Vue.js project | frontend: Vue, framework: vue |
| RPS-004 | Express.js backend | backend: Node.js, framework: express |
| RPS-005 | Python/Flask | backend: Python, framework: flask |
| RPS-006 | PostgreSQL database | database: postgresql |
| RPS-007 | MongoDB database | database: mongodb |
| RPS-008 | Dockerfile present | infrastructure: docker |

### 1.3 Hosting Recommendation Tests
| Test Case | Detected Stack | Expected Recommendation |
|-----------|---------------|------------------------|
| RPH-001 | Next.js frontend | Vercel (score: 95+) |
| RPH-002 | React SPA, no backend | Vercel or Netlify (score: 90+) |
| RPH-003 | Node.js + MongoDB | Railway (score: 85+) |
| RPH-004 | Static HTML/CSS | Cloudflare Pages or Netlify (score: 95+) |
| RPH-005 | Python + PostgreSQL | Railway (score: 80+) |
| RPH-006 | Docker + any stack | Self-hosted Docker (score: 90+) |

---

## 2. Demand Analytics System (`/api/demand`)

### 2.1 API Endpoint Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| DAR-001 | GET /api/demand (no auth) | 200, public demand data | High |
| DAR-002 | GET /api/demand?projectId=1 | 200, specific project demand | High |
| DAR-003 | GET /api/demand?timeframe=7d | 200, 7-day timeframe | Medium |
| DAR-004 | POST /api/demand/track (valid) | 200, event tracked | High |
| DAR-005 | POST /api/demand/track (invalid) | 400, validation error | High |
| DAR-006 | POST /api/demand/track (no auth) | 401, auth required | High |

### 2.2 Demand Score Calculation Tests
| Test Case | Input Factors | Expected Score Range |
|-----------|--------------|---------------------|
| DAS-001 | New project, 0 deployments | 0-20 |
| DAS-002 | 1-week old, 5 deployments | 20-40 |
| DAS-003 | 1-month old, 20 deployments | 40-60 |
| DAS-004 | 3-months old, 50 deployments | 60-80 |
| DAS-005 | 6-months old, 100+ deployments | 80-100 |

### 2.3 Trending Projects Tests
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| DAT-001 | GET /api/demand?trending=true | Array of top 10 projects |
| DAT-002 | GET /api/demand?trending=true&limit=5 | Array of top 5 projects |
| DAT-003 | Trending with no projects | Empty array |

---

## 3. Marketing Tools (`/api/marketing/showcase`)

### 3.1 Project Showcase Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| MPS-001 | GET /api/marketing/showcase (no auth) | 200, public projects list | High |
| MPS-002 | GET with platform filter | Filtered by platform | High |
| MPS-003 | GET with limit=5 | Max 5 results | Medium |
| MPS-004 | GET with invalid platform | 400 or empty results | Medium |
| MPS-005 | POST /api/marketing/showcase (share) | 200, share tracked | High |
| MPS-006 | POST share (no auth) | 401 | High |
| MPS-007 | POST share (invalid type) | 400 | Medium |

### 3.2 Share Tracking Tests
| Test Case | Share Type | Expected Behavior |
|-----------|-----------|-------------------|
| MST-001 | social | Valid share type |
| MST-002 | email | Valid share type |
| MST-003 | embed | Valid share type |
| MST-004 | direct | Valid share type |
| MST-005 | invalid_type | 400 error |

---

## 4. Startup Features (`/api/startup/*`)

### 4.1 Readiness Validation Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| SFR-001 | POST /api/startup/validate (valid) | 200, readiness score | High |
| SFR-002 | POST /api/startup/validate (no auth) | 401 | High |
| SFR-003 | POST with missing repo_url | 400 | High |
| SFR-004 | GET /api/startup/validate/history | 200, history array | Medium |

### 4.2 Templates Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| SFT-001 | GET /api/startup/templates | 200, templates array | High |
| SFT-002 | GET with category=saas | Filtered templates | Medium |
| SFT-003 | GET with invalid category | 200, empty or all | Low |

### 4.3 Health Score Tests
| Test Case | Input | Expected Output | Priority |
|-----------|-------|-----------------|----------|
| SFH-001 | GET /api/startup/health-score (auth) | 200, health metrics | High |
| SFH-002 | GET (no auth) | 401 | High |
| SFH-003 | Score calculation accuracy | Verify formula | Medium |

---

## 5. Enhanced Dashboards

### 5.1 Analytics Page (`/analytics`)
| Test Case | Element | Expected Behavior | Priority |
|-----------|---------|-------------------|----------|
| EDA-001 | Export button (CSV) | Downloads CSV file | High |
| EDA-002 | Export button (JSON) | Downloads JSON file | High |
| EDA-003 | ProjectDetail modal | Opens with project data | High |
| EDA-004 | AnimatedNumber component | Animates on scroll | Medium |
| EDA-005 | Time range selector | Updates data | Medium |

### 5.2 Admin Dashboard (`/admin`)
| Test Case | Element | Expected Behavior | Priority |
|-----------|---------|-------------------|----------|
| EDA-006 | Financial analytics section | Displays revenue data | High |
| EDA-007 | System health section | Shows CPU, memory, disk | High |
| EDA-008 | User analytics section | Shows user growth | Medium |
| EDA-009 | Notification center | Shows unread count | Medium |

---

## 6. Deployment Flow Integration

### 6.1 Integration Tests
| Test Case | Flow | Expected Behavior | Priority |
|-----------|------|-------------------|----------|
| DFI-001 | Deploy with repo analysis | Calls /api/repo-analyze first | High |
| DFI-002 | Deploy without target_platform | Uses recommended platform | High |
| DFI-003 | Deploy success + demand tracking | Tracks demand event | High |
| DFI-004 | Response includes repo_analysis | Returns analysis in response | Medium |
| DFI-005 | Repo analysis failure (non-blocking) | Deployment continues | High |

---

## 7. Build & TypeScript Verification

| Test Case | Command | Expected Output | Priority |
|-----------|---------|-----------------|----------|
| BTV-001 | `npm run build` | Exit 0, no errors | Critical |
| BTV-002 | `npm run typecheck` | Exit 0, no errors | Critical |
| BTV-003 | `npm run lint` | Exit 0, no errors | High |
| BTV-004 | `npm run test` | All tests pass | Critical |

---

## 8. Test Execution Strategy

### Phase 1: API Unit Tests (Automated)
- Run existing test suite: `npm run test`
- Create new test files for each API endpoint
- Mock external dependencies (GitHub API, etc.)

### Phase 2: Integration Tests (Semi-Automated)
- Test deployment flow with real(ish) data
- Verify database interactions (if DB available)
- Check API chaining (repo-analyze → deploy → demand-track)

### Phase 3: Manual UI Tests
- Test analytics page in browser
- Test admin dashboard
- Verify export functionality
- Check responsive design

### Phase 4: Load & Performance Tests
- Stress test API endpoints
- Check rate limiting
- Verify caching behavior

---

## 9. Test Environment Requirements

- **Database**: PostgreSQL (optional, some tests mock DB)
- **Redis**: For rate limiting tests (optional)
- **GitHub Token**: For real repo analysis (optional, falls back to mock)
- **Environment Variables**: All required vars in .env

---

## 10. Success Criteria

✅ All API endpoints return expected status codes
✅ All responses match JSON schema
✅ Error handling works correctly (400, 401, 404, 500)
✅ Build passes with 0 TypeScript errors
✅ All automated tests pass
✅ UI components render without errors
✅ Integration flow works end-to-end

---

## Test Execution Log

| Date | Tester | Tests Run | Passed | Failed | Notes |
|------|--------|-----------|--------|--------|-------|
| 2026-05-01 | Sisyphus | - | - | - | Starting execution |


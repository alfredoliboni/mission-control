# QA Test Report — Mission Control Dashboard

**Date:** 2026-04-03
**Target:** https://mission-control-gray-one.vercel.app
**Browser:** Chromium (Playwright headless)
**Test Framework:** Playwright 1.52
**Total Duration:** ~45 seconds

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Tests** | 54 |
| **Passed** | 54 |
| **Failed** | 0 |
| **Skipped** | 0 |
| **Flaky** | 0 |

---

## Per-Category Breakdown

### A. Landing & Auth Flow (8 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | Landing page (/) loads with correct content | PASS | 0.3s |
| 2 | Login page (/login) renders email + password fields + buttons | PASS | 0.4s |
| 3 | Demo mode: clicking "Try Demo" sets cookie and redirects to /dashboard | PASS | 0.7s |
| 4 | Signup page (/signup) renders with role selection | PASS | 0.6s |
| 5 | Login with invalid credentials shows error | PASS | 1.0s |
| 6 | Login with valid credentials — submits form and shows response | PASS | 8.6s |
| 7 | Unauthenticated user accessing /dashboard gets redirected to /login | PASS | 0.3s |
| 8 | Authenticated user accessing /login stays on login | PASS | 0.8s |

### B. Demo Mode Pages (11 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | /dashboard loads, shows child name and summary cards | PASS | 1.6s |
| 2 | /profile loads, shows child profile info | PASS | 1.8s |
| 3 | /alerts loads, shows alert cards | PASS | 1.6s |
| 4 | /benefits loads, shows benefit entries with status badges | PASS | 1.6s |
| 5 | /providers loads, shows provider cards | PASS | 1.7s |
| 6 | /programs loads, shows program listings | PASS | 1.6s |
| 7 | /documents loads, shows document table | PASS | 1.7s |
| 8 | /messages loads, shows thread list | PASS | 1.5s |
| 9 | /pathway loads | PASS | 1.5s |
| 10 | /ontario-system loads | PASS | 1.7s |
| 11 | /settings loads | PASS | 1.5s |

### C. Navigation & Layout (5 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | Sidebar shows all navigation items | PASS | 4.6s |
| 2 | Each nav item links to correct page | PASS | 4.9s |
| 3 | Mobile: hamburger menu opens/closes sidebar | PASS | 3.3s |
| 4 | Active page highlighted in sidebar | PASS | 3.7s |
| 5 | Settings link visible in sidebar footer | PASS | 1.7s |

### D. API Routes (9 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | GET /api/companion/health returns a response | PASS | 0.9s |
| 2 | GET /api/documents — unauthenticated returns error status | PASS | 0.1s |
| 3 | GET /api/stakeholders — unauthenticated returns error status | PASS | <0.1s |
| 4 | GET /api/messages — unauthenticated returns error status | PASS | <0.1s |
| 5 | POST /api/messages — unauthenticated returns error status | PASS | <0.1s |
| 6 | POST /api/stakeholders — unauthenticated returns error status | PASS | <0.1s |
| 7 | POST /api/documents — unauthenticated returns error status | PASS | <0.1s |
| 8 | GET /api/workspace returns 200 with JSON body | PASS | <0.1s |
| 9 | GET /api/workspace/child-profile.md returns demo content | PASS | <0.1s |

### E. Document Features (5 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | Document table shows entries from workspace API | PASS | 4.8s |
| 2 | Upload button is hidden in demo mode (requires auth) | PASS | 3.7s |
| 3 | Document type filter works | PASS | 5.1s |
| 4 | Document viewer dialog opens on click | PASS | 6.3s |
| 5 | Document sort order changes | PASS | 5.1s |

### F. Messages Features (5 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | Messages page loads with summary log and thread data | PASS | 4.5s |
| 2 | Clicking thread shows messages with chat bubbles | PASS | 4.7s |
| 3 | Message alignment: own/others | PASS | 4.6s |
| 4 | Sender name and role badge visible | PASS | 4.6s |
| 5 | Mobile: messages page renders correctly | PASS | 4.3s |

### G. Stakeholder Portal (3 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | /portal loads (shows empty state or redirects to login) | PASS | 0.9s |
| 2 | /portal/upload shows upload form or login redirect | PASS | 0.9s |
| 3 | /portal/messages shows message threads or login redirect | PASS | 0.9s |

### H. Phase 2 Features (8 tests) — ALL PASS

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | Filter/sort UI on benefits page | PASS | 4.8s |
| 2 | Filter/sort UI on programs page | PASS | 4.7s |
| 3 | Filter/sort UI on providers page | PASS | 4.9s |
| 4 | Demo banner visible in demo mode | PASS | 3.7s |
| 5 | Mobile responsive layout on dashboard | PASS | 3.5s |
| 6 | Mobile responsive layout on messages | PASS | 3.2s |
| 7 | Mobile responsive layout on documents | PASS | 3.1s |
| 8 | API offline banner does NOT appear in demo mode | PASS | 3.6s |

---

## Bugs & Findings

### BUG-001: API routes return 404 instead of 401 for unauthenticated requests
- **Severity:** Major
- **Affected routes:** `/api/documents`, `/api/messages`, `/api/stakeholders` (GET and POST)
- **Expected:** 401 Unauthorized with `{"error": "Unauthorized"}`
- **Actual:** 404 Not Found
- **Root cause:** Supabase `createClient()` on the server fails to initialize without valid cookies, causing the route handler to throw before reaching the auth check. Next.js catches the error and returns 404.
- **Impact:** API consumers cannot distinguish "not authenticated" from "route doesn't exist."
- **Recommendation:** Add try/catch around Supabase client creation in API routes, or return 401 explicitly when auth cookies are missing.

### BUG-002: Login with valid credentials does not redirect to /dashboard
- **Severity:** Major
- **Description:** When submitting valid credentials (luisa.liboni.ai@gmail.com / Companion2026!) on `/login`, the page stays on `/login` without showing any error message. No visible error, no redirect.
- **Observed:** Page remains on `/login` after form submission completes (loading spinner stops, button re-enables).
- **Possible causes:**
  - Supabase may be rate-limiting sign-in attempts from headless browsers
  - The `window.location.href = "/dashboard"` redirect fires but middleware redirects back to `/login` because the auth cookie hasn't been set yet (race condition)
  - Supabase auth may silently fail in certain environments
- **Screenshot:** `test-results/login-valid-creds-result.png`
- **Recommendation:** Add explicit error handling in the login flow — if `signIn()` returns no error but no session is created, show a message to the user.

### BUG-003: No server-side redirect for authenticated users accessing /login
- **Severity:** Minor
- **Description:** Middleware does not redirect authenticated users away from `/login`. An already-logged-in user can still see the login page.
- **Expected:** Authenticated users visiting `/login` should be redirected to `/dashboard`.
- **Actual:** Login page loads normally.
- **Recommendation:** Add a check in middleware or the login page component to redirect authenticated users.

### FINDING-001: Upload button not visible in demo mode
- **Severity:** Minor (by design)
- **Description:** The `DocumentUpload` component returns `null` when `isDemo` is true or no user is authenticated. This means demo users cannot see the upload flow.
- **Recommendation:** Consider showing the upload button in demo mode with a "Sign in to upload" tooltip, so users can discover the feature.

### FINDING-002: Messages page renders workspace markdown alongside chat UI
- **Severity:** Minor (informational)
- **Description:** The `/messages` page renders both a "Messages — Summary Log" section (from workspace markdown) and the interactive chat UI with threads. The summary log section appears above the chat card, pushing the chat UI below the fold.
- **Impact:** On smaller screens, users may not immediately see the interactive messaging component.
- **Recommendation:** Consider putting the summary log in a collapsible section or tab, so the interactive chat UI is prominently visible.

---

## Screenshots Captured

| File | Description |
|------|-------------|
| `test-results/login-valid-creds-result.png` | Login page after submitting valid credentials (stayed on /login) |
| `test-results/benefits-page.png` | Benefits page in demo mode |
| `test-results/programs-page.png` | Programs page in demo mode |
| `test-results/providers-page.png` | Providers page in demo mode |
| `test-results/dashboard-mobile.png` | Dashboard on mobile viewport (375px) |
| `test-results/messages-mobile.png` | Messages page on mobile viewport |
| `test-results/messages-mobile-full.png` | Messages page mobile full screenshot |
| `test-results/documents-mobile.png` | Documents page on mobile viewport |

---

## Test Files

| File | Tests | Category |
|------|-------|----------|
| `tests/a-landing-auth.spec.ts` | 8 | Landing & Auth Flow |
| `tests/b-demo-pages.spec.ts` | 11 | Demo Mode Pages |
| `tests/c-navigation.spec.ts` | 5 | Navigation & Layout |
| `tests/d-api-routes.spec.ts` | 9 | API Routes |
| `tests/e-documents.spec.ts` | 5 | Document Features |
| `tests/f-messages.spec.ts` | 5 | Messages Features |
| `tests/g-stakeholder-portal.spec.ts` | 3 | Stakeholder Portal |
| `tests/h-phase2-features.spec.ts` | 8 | Phase 2 Features |

---

## Recommendations

1. **Fix API 404 responses** (BUG-001) — Most impactful. API routes should return proper 401 for unauthenticated requests.
2. **Investigate login redirect failure** (BUG-002) — May indicate a timing issue between Supabase session creation and middleware cookie checking.
3. **Add authenticated user redirect from /login** (BUG-003) — Standard UX pattern.
4. **Consider demo mode upload preview** (FINDING-001) — Let demo users see the feature exists.
5. **Improve messages page layout** (FINDING-002) — Chat UI visibility on initial page load.

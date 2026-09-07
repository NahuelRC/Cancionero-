# QATES Test Plan: Klave

Version: 1.0
Date: 2026-08-31
Author: QATES qa-analyst

## Scope

In scope:
- Functional smoke for public entry points, auth gates, register/login UI, song library navigation, upload entry points, users, and En Vivo.
- API smoke and contract checks for public and protected endpoints.
- UX/UI checks for visible controls, form validation, keyboard focus, and basic error states.
- Responsive checks for login and register on mobile, tablet, and desktop widths.
- Local performance budgets for public pages and health endpoint.
- Optional authenticated UI/API smoke when `KLAVE_TEST_EMAIL` and `KLAVE_TEST_PASSWORD` are available.

Out of scope for this first set:
- Full data lifecycle tests that create churches, invitations, songs, and En Vivo sessions in the database.
- External integrations with Resend, Google OAuth, Sentry, R2, and payment providers.
- Visual snapshot baselines.
- Load testing with high concurrency.

## Test Strategy

| Category | Approach | Priority | Automation |
| --- | --- | --- | --- |
| Functional | Playwright browser smoke and auth gate checks | High | Yes |
| API | Playwright APIRequestContext contract checks | High | Yes |
| UX/UI | Role/text visibility, form validity, keyboard focus | High | Yes |
| Responsive | Viewport matrix with overflow checks | High | Yes |
| Performance | Warmed local response budget checks | Medium | Yes |
| Security | Public/protected route boundary checks | High | Partial |

## Test Scenarios

| ID | Requirement | Category | Scenario | Expected Result | Priority |
| --- | --- | --- | --- | --- | --- |
| TS-001 | Public auth pages | Functional | Visit `/login` | Login form and Google button are visible | High |
| TS-002 | Public registration | Functional | Visit `/register` | Register form or payment gate is visible | High |
| TS-003 | Root routing | Functional | Visit `/` without session | User is redirected to `/login` | High |
| TS-004 | Protected app routes | Security | Visit `/usuarios`, `/repertorio`, `/subir`, `/en-vivo` without session | Each route redirects to `/login` | High |
| TS-005 | Health endpoint | API | `GET /api/health` without session | Returns JSON `{ ok: true, db: ... }` and status 200 | High |
| TS-006 | Protected APIs | API/Security | `GET /api/canciones`, `/api/usuarios`, `/api/envivo` without session | Each endpoint redirects to `/login` | High |
| TS-007 | Public API validation | API | Invalid invitation acceptance payload | Returns validation error with status 422 | High |
| TS-008 | Webhook auth | API/Security | Payment webhook without shared secret | Returns 401 JSON | High |
| TS-009 | Login UX | UX/UI | Empty login submit | Required fields remain invalid and page stays on login | Medium |
| TS-010 | Keyboard navigation | UX/UI | Tab through login form | Email, password, and submit are keyboard reachable | Medium |
| TS-011 | Responsive public pages | Responsive | Render login/register at 375, 768, and 1280 px | No horizontal overflow; primary controls visible | High |
| TS-012 | Local page performance | Performance | Warm and measure `/login`, `/register`, `/api/health` | Durations stay below configurable local budgets | Medium |
| TS-013 | Authenticated API smoke | API | With test credentials, call `/api/canciones` and `/api/envivo` | Authenticated JSON contracts return `ok: true` | High |

## Test Data

- Public tests require no seed data.
- Authenticated tests require `KLAVE_TEST_EMAIL` and `KLAVE_TEST_PASSWORD` for an active tenant user.
- Performance budgets can be tuned with `KLAVE_PERF_PAGE_MS` and `KLAVE_PERF_API_MS`.

## Environment

- Node.js 20 or newer.
- MongoDB available for `/api/health` and authenticated tests.
- Local app available at `PLAYWRIGHT_BASE_URL` or started by Playwright with `npm run dev`.
- Playwright browser installed with `npx playwright install chromium`.

## Entry Criteria

- `npm install` completed.
- `.env.local` configured.
- `npm run lint` passes.
- Local database is reachable for health and authenticated tests.

## Exit Criteria

- All public API/UI/responsive/performance smoke tests pass.
- Authenticated tests pass when valid test credentials are provided, or are explicitly skipped when credentials are absent.
- No critical auth boundary regression remains open.

## Risks

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| No seeded test tenant | High | High | Keep auth tests optional until a test fixture strategy exists |
| Dev server first-request compilation affects performance | Medium | Medium | Warm URLs before measuring |
| Broad API CRUD tests can mutate real data | Medium | High | Do not create/delete tenant data without dedicated test DB |
| UI text encoding inconsistencies | Medium | Medium | Prefer stable roles, forms, and partial names in tests |

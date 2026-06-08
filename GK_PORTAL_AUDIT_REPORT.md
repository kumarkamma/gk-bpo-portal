# GK Tax Consultancy BPO Portal
# Complete Project Audit Report

**Date:** June 2025
**Project:** GK Tax Consultancy BPO Operations Portal
**Version Audited:** v1.0
**Auditor:** Amazon Q Developer (AI)
**Stack:** React 19 · Vite · Tailwind CSS · Supabase · GSAP · Lenis

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure Overview](#2-project-structure-overview)
3. [Dependency Audit](#3-dependency-audit)
4. [Security Findings](#4-security-findings)
5. [Architecture & Code Quality](#5-architecture--code-quality)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Authentication & Session Management](#7-authentication--session-management)
8. [Database & Supabase Layer](#8-database--supabase-layer)
9. [Performance Issues](#9-performance-issues)
10. [UI/UX & Consistency Issues](#10-uiux--consistency-issues)
11. [Animation & Scroll Issues](#11-animation--scroll-issues)
12. [Individual Page Audit](#12-individual-page-audit)
13. [Missing Features vs SOW](#13-missing-features-vs-sow)
14. [Recommendations Priority List](#14-recommendations-priority-list)
15. [SOW Completion Status](#15-sow-completion-status)

---

## 1. Executive Summary

The GK BPO Portal is a well-structured, production-intended React 19 + Supabase application. The UI is polished, consistent, and follows a strong design system. The core workflows (leads, call logs, filings, payments, attendance) are implemented and functional.

However, there are **critical security gaps** that must be addressed before production deployment, along with **architecture improvements** and **missing SOW features** that need to be completed.

### Overall Health Score

| Category | Score | Notes |
|---|---|---|
| UI / Design System | 9/10 | Excellent, cohesive, professional |
| Code Structure | 7/10 | Good but has inconsistencies |
| Security | 4/10 | Critical gaps present |
| RBAC Enforcement | 5/10 | Frontend only, no backend enforcement |
| Performance | 6/10 | Multiple N+1 and over-fetch patterns |
| SOW Completion | 65% | Several modules still missing |
| Production Readiness | 5/10 | Not production-ready yet |

---

## 2. Project Structure Overview

```
gk-bpo-portal/
├── src/
│   ├── assets/               ✅ Logo, icons
│   ├── components/
│   │   ├── layout/           ✅ AppLayout, Sidebar, Topbar
│   │   ├── ui/               ✅ StatCard, Modal, Badges, Pagination, LoadingSpinner
│   │   └── ProtectedRoute.jsx ⚠ Exists but NOT used in routes.jsx
│   ├── context/
│   │   ├── AuthContext.jsx   ✅ Solid implementation
│   │   └── NotificationContext.jsx ✅ Good localStorage-backed notifications
│   ├── hooks/
│   │   └── useAnimations.js  ⚠ Lenis conflict with overflow:auto scroll
│   ├── lib/
│   │   ├── constants.js      ✅ Well-organized
│   │   ├── supabase.js       ✅ Clean client setup
│   │   └── utils.js          ✅ Good utility functions
│   ├── pages/
│   │   ├── admin/            ✅ Most pages implemented
│   │   ├── superadmin/       ✅ Implemented
│   │   ├── supervisor/       ✅ Implemented
│   │   ├── agent/            ✅ Implemented
│   │   ├── auditor/          ✅ Implemented
│   │   ├── accounts/         ✅ Implemented
│   │   ├── LoginPage.jsx     ✅ Polished, with forgot password
│   │   └── ProfilePage.jsx   ✅ Complete
│   ├── App.jsx               ✅ Clean
│   ├── routes.jsx            ⚠ ProtectedRoute NOT applied
│   └── main.jsx              ✅ Standard
├── .env                      🔴 CRITICAL: Credentials committed to repo
├── .gitignore                ✅ .env listed — but file may already be tracked
├── supabase-schema.sql       ✅ Present
└── package.json              ✅ Dependencies look correct
```

---

## 3. Dependency Audit

### Current Dependencies

| Package | Version | Status | Notes |
|---|---|---|---|
| react | ^19.2.6 | ✅ Latest | |
| react-dom | ^19.2.6 | ✅ Latest | |
| react-router-dom | ^7.16.0 | ✅ Latest | |
| @supabase/supabase-js | ^2.107.0 | ✅ Latest | |
| tailwindcss | ^4.3.0 | ✅ Latest v4 | |
| gsap | ^3.15.0 | ✅ Latest | |
| lenis | ^1.3.23 | ✅ Latest | |
| recharts | ^3.8.1 | ✅ Latest | |
| @tanstack/react-table | ^8.21.3 | ⚠ Installed but NOT used anywhere | Unused dependency |
| react-hook-form | ^7.77.0 | ✅ Used | |
| zod | ^4.4.3 | ✅ Used | |
| @hookform/resolvers | ^5.4.0 | ✅ Used | |
| xlsx | ^0.18.5 | ⚠ Old version | Use `xlsx@0.20.x` or `exceljs` — v0.18 has known vulnerabilities |
| lucide-react | ^1.17.0 | ✅ Used | |
| date-fns | ^4.4.0 | ⚠ Installed but NOT used | Unused dependency |
| file-saver | ^2.0.5 | ⚠ Installed but NOT used | Unused dependency |

### Issues

1. **`xlsx@0.18.5`** — This version has publicly disclosed prototype pollution vulnerabilities. Upgrade to `0.20.x` or switch to `exceljs`.
2. **`@tanstack/react-table`** — Installed but never imported. Remove to reduce bundle size.
3. **`date-fns`** — Installed but unused. Date formatting done manually with `Intl`. Remove.
4. **`file-saver`** — Installed but unused. Remove.

---

## 4. Security Findings

### 4.1 🔴 CRITICAL — Supabase Credentials in `.env` File Committed to Repo

**File:** `.env`

```
VITE_SUPABASE_URL=https://marivqxfaxmpliodxuib.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ix4DJIcJ9zhYt4MwIsU_yQ_OZIkHgEr
```

While the `.gitignore` lists `.env`, if this file was ever committed before being added to `.gitignore`, the credentials are in git history. The VITE_ prefix also means these are bundled into the frontend JS — any user can see them in the browser.

**Risk:** Anyone can directly access your Supabase database if RLS is not configured.
**Action Required:**
- Rotate these credentials in Supabase dashboard immediately if the repo is public
- Verify `.env` was never committed (`git log --all --full-history -- .env`)
- The `sb_publishable_` key is by design public-facing for Supabase anon access — this is acceptable but RLS MUST be enforced

---

### 4.2 🔴 CRITICAL — ProtectedRoute Component Exists But Is NOT Used

**File:** `src/routes.jsx`

```jsx
// ProtectedRoute is imported in the file BUT never applied to any route:
import ProtectedRoute from './components/ProtectedRoute'  // ← NOT imported in routes.jsx

// All routes are unprotected:
<Route path="/leads" element={<WrappedPage component={LeadsPage} />} />
<Route path="/payments" element={<WrappedPage component={PaymentsPage} />} />
// etc.
```

**Risk:** Any unauthenticated user can directly navigate to `/payments`, `/leads`, `/users`, `/audit-logs` etc. by typing the URL. There is zero route-level protection.

**Fix:** Wrap all private routes with ProtectedRoute:
```jsx
<Route path="/leads" element={
  <ProtectedRoute allowedRoles={['super_admin', 'supervisor', 'bpo_agent']}>
    <WrappedPage component={LeadsPage} />
  </ProtectedRoute>
} />
```

---

### 4.3 🔴 CRITICAL — No Row Level Security (RLS) Enforcement Verified

The SOW specifies RLS. The `supabase-schema.sql` file exists but there's no evidence RLS policies are written for:
- Agents seeing only their own leads
- Auditors seeing only their assigned clients
- Accounts team accessing only payment records

Currently all queries pull data based on JS-side role checks (e.g., `.eq('assigned_bpo', profile.id)`). If an agent calls the API directly without the app, they can read all leads.

**Action Required:** Verify and implement RLS policies in Supabase for every table.

---

### 4.4 🟠 HIGH — Client-Side Only Role-Based Access Control

**Files:** All page components

Role checks are done entirely in the frontend (e.g., `isAgent`, `canAdmin`, `isSuperAdmin`). A malicious user can modify these in browser devtools or call Supabase APIs directly to bypass them.

**Fix:** Implement Supabase RLS policies that enforce permissions at the database level regardless of what the frontend sends.

---

### 4.5 🟠 HIGH — User Creation Uses Client-Side `signUp` (Not Admin API)

**File:** `src/pages/admin/UsersPage.jsx` — `onCreateUser()`

```js
const { data: authData, error: authErr } = await supabase.auth.signUp({
  email: values.email,
  password: values.password,
})
```

Using `supabase.auth.signUp()` from the client has issues:
1. Supabase may send a confirmation email to the new user, breaking the flow
2. The currently logged-in super admin session is NOT affected, but on some Supabase plans this can cause issues
3. Should use a Supabase Edge Function with the `admin` client (service role key) for proper user creation

**Fix:** Create a Supabase Edge Function to create users using the `supabase-admin` client with the service role key.

---

### 4.6 🟠 HIGH — Password Displayed in Plaintext in Create User Modal

**File:** `src/pages/admin/UsersPage.jsx`

The "Generate Password" button creates a temp password shown in the modal. This temp password is never actually SET in Supabase Auth — only displayed. The real password is set via `signUp`. The temp password generator is cosmetic and misleading.

---

### 4.7 🟡 MEDIUM — Error Messages Leak Auth Info

**File:** `src/pages/LoginPage.jsx`

```js
if (error) setAuthError('Invalid email or password. Please try again.')
```

This is actually correct. However, in `ProfilePage.jsx`:
```js
if (authErr) { setPwError('Current password is incorrect.'); return }
```

This is a timing attack vector — it confirms account existence. Acceptable for internal tool, document it.

---

### 4.8 🟡 MEDIUM — No CSRF Protection on Forms

All forms submit directly to Supabase. Since Supabase uses JWT tokens stored in localStorage, CSRF is less of a concern for API calls. However, the localStorage storage of auth tokens is vulnerable to XSS.

---

### 4.9 🟡 MEDIUM — No Input Sanitization Before Supabase Inserts

**Files:** `LeadsPage.jsx`, `CallLogModal.jsx`, `PaymentsPage.jsx`

Free-text fields like `remarks`, `client_name`, `city` are inserted directly into Supabase without sanitization. The Supabase JS client uses parameterized queries so SQL injection is not possible, but XSS could occur if data is later rendered as `innerHTML` (not currently the case — verify this is never done).

---

## 5. Architecture & Code Quality

### 5.1 🟠 HIGH — ProtectedRoute Defined But Unused (Route-Level Auth Gap)

As noted in security — this is both a security and architecture issue. The component is well-written but never connected.

---

### 5.2 🟠 HIGH — Style Inconsistency: Mixed Tailwind + Inline Styles

The project uses two completely different styling approaches:

**Pattern A — Inline styles (most pages):**
```jsx
<div style={{ display: 'flex', padding: '14px 20px', borderRadius: 12 }}>
```

**Pattern B — Tailwind classes (PaymentsPage.jsx):**
```jsx
<div className="grid grid-cols-3 gap-4 mb-5 stagger-item">
<p className="text-xs font-600 text-slate-500 uppercase tracking-wider">
```

`PaymentsPage.jsx` appears to have been built with a different pattern than the rest of the codebase. This creates:
- Inconsistent visual rendering
- Maintenance confusion
- `font-600` is not a standard Tailwind class (should be `font-semibold`)

**Recommendation:** Standardize on inline styles (current majority pattern) or convert everything to Tailwind.

---

### 5.3 🟠 HIGH — No Error Boundaries

No React Error Boundaries are implemented. If any single component throws an unhandled error (e.g., Supabase query fails), the entire app white-screens with no user feedback.

**Fix:** Add an ErrorBoundary wrapper in `App.jsx` or `AppLayout.jsx`.

---

### 5.4 🟡 MEDIUM — Supabase Errors Silently Ignored

In most pages, errors are caught but only logged to console:

```js
} catch (err) {
  console.error(err)
}
```

Users see no error message. Production apps should display user-facing error toasts.

---

### 5.5 🟡 MEDIUM — `useCallback` Dependency Array Issues

**File:** `src/pages/admin/LeadsPage.jsx`

```js
const loadLeads = useCallback(async () => {
  // uses: page, search, statusFilter, isAgent, profile?.id
}, [page, search, statusFilter, isAgent, profile?.id])
```

This is correct. However, `loadAgents` has an empty dependency array `[]` while referencing no external state — that's fine. But `loadLeads` is also triggered in `useEffect` with the same deps — this creates a double-definition pattern that could be simplified.

---

### 5.6 🟡 MEDIUM — GSAP Ticker Cleanup Bug

**File:** `src/hooks/useAnimations.js`

```js
gsap.ticker.add((time) => lenis.raf(time * 1000))

return () => {
  lenis.destroy()
  gsap.ticker.remove((time) => lenis.raf(time * 1000)) // ❌ This creates a NEW function reference
}
```

The cleanup creates a new arrow function that is NOT the same reference as the one added to the ticker. The ticker callback is never actually removed. This causes a memory leak on every navigation.

**Fix:**
```js
const rafFn = (time) => lenis.raf(time * 1000)
gsap.ticker.add(rafFn)

return () => {
  lenis.destroy()
  gsap.ticker.remove(rafFn)
}
```

---

### 5.7 🟡 MEDIUM — `_admin_legacy` Role in Routes

**File:** `src/routes.jsx`

```js
const ROLE_DASHBOARD = {
  super_admin: '/super-admin',
  _admin_legacy: '/dashboard',  // ← This role doesn't exist in the DB
  ...
}
```

This dead code suggests a role migration happened mid-development. The `_admin_legacy` role should be removed.

---

### 5.8 🟢 LOW — Duplicate ROLE_LABELS Defined in 3+ Files

`ROLE_LABELS` is defined separately in `Sidebar.jsx`, `Topbar.jsx`, and `Badges.jsx`. Should be extracted to `constants.js`.

---

### 5.9 🟢 LOW — Duplicate STATUS_BADGE / STATUS_STYLE Maps

`STATUS_BADGE`, `CALL_STATUS_STYLE`, `STATUS_STYLE` are redefined in multiple dashboard pages with different variable names but the same data. Should use the shared `Badges.jsx` exports.

---

## 6. Role-Based Access Control (RBAC)

### Current State

| Feature | Super Admin | Supervisor | BPO Agent | Auditor | Accounts |
|---|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Leads | ✅ | ✅ | Own Only (frontend) | ❌ | ❌ |
| Add/Edit Leads | ✅ | ✅ | ❌ (frontend) | ❌ | ❌ |
| Assign Leads | ✅ | ✅ | ❌ (frontend) | ❌ | ❌ |
| Call Logs | ✅ | ✅ | ✅ | ❌ | ❌ |
| Payments Edit | ✅ | ❌ | ❌ (frontend) | ❌ | ✅ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Filing Update | ✅ | ❌ | ❌ | ✅ | ❌ |

### Issues

1. **All role restrictions are frontend-only.** Supabase RLS not confirmed implemented.
2. **BPO Agent can navigate directly to `/users` or `/audit-logs` by URL** — no redirect happens because ProtectedRoute is not used.
3. **Supervisor role has access to `/leads` add/edit** which may not be intended per SOW.
4. **Accounts team can access `/clients` and `/payments`** — but there's no restriction on viewing sensitive lead data.

---

## 7. Authentication & Session Management

### Positives
- Account status check (banned/suspended/inactive) on login is well-implemented
- Forgot password flow is implemented
- Auth state listener (`onAuthStateChange`) is properly set up
- Sign-out clears profile state

### Issues

**7.1 🟠 — No Token Refresh Error Handling**
If a Supabase JWT expires mid-session, the app will silently fail Supabase queries. There's no global handler for `AuthSessionMissingError`.

**7.2 🟡 — Profile Not Refreshed After Update**
When a user updates their profile in `ProfilePage.jsx`, it updates the `users` table in Supabase but the `profile` state in `AuthContext` is not refreshed. The sidebar and topbar will still show the old name until page refresh.

**Fix:** After successful profile save, call `fetchProfile(profile.id)` from AuthContext or expose a `refreshProfile` function.

**7.3 🟡 — No Loading State for Auth on Initial Load**
If `loading === true`, `RoleRedirect` returns `null` (blank page). A loading spinner should be shown instead.

---

## 8. Database & Supabase Layer

### 8.1 🔴 — RLS Not Confirmed for Any Table

Per SOW: "Implement Row Level Security (RLS)" — there's no RLS SQL in `supabase-schema.sql` that we can verify. This is the most critical production blocker.

**Minimum RLS Required:**
```sql
-- leads: agents see only assigned leads
CREATE POLICY "agent_own_leads" ON leads
  FOR SELECT USING (
    auth.uid() = assigned_bpo
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'supervisor'))
  );

-- payments: accounts + admin only
CREATE POLICY "payments_access" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'accounts'))
  );

-- users table: only super_admin can see all rows
CREATE POLICY "users_own_row" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );
```

---

### 8.2 🟠 — Over-fetching in Dashboard Queries

**File:** `src/pages/admin/Dashboard.jsx`

```js
supabase.from('payments').select('final_amount,amount_paid,amount_due,payment_status,payment_date')
// ↑ Fetches ALL payments (potentially thousands) to compute totals in JS
```

For 1,500–2,000 clients with multiple payments, this could fetch 5,000–10,000 rows.

**Fix:** Use Supabase aggregate functions or PostgreSQL views:
```sql
-- Create a view or use RPC
SELECT SUM(amount_paid) as collected, SUM(amount_due) as pending FROM payments;
```

---

### 8.3 🟠 — No Pagination on SuperAdmin User Queries

**File:** `src/pages/superadmin/SuperAdminDashboard.jsx`

```js
supabase.from('users').select('*').order('created_at', { ascending: false })
// ↑ Fetches ALL users with no limit
```

As user count grows this will be slow.

---

### 8.4 🟡 — Audit Log Writes Are Fire-and-Forget

**File:** `src/lib/utils.js`

```js
export async function logAudit(...) {
  await supabase.from('audit_logs').insert({...})
  // No error handling — if this fails, the action still succeeds silently
}
```

Audit log failures are silent. For a compliance-oriented product, this should at least log to console or be wrapped in try/catch.

---

### 8.5 🟡 — `call_logs` Fetched with `.limit(500)` on Dashboard

**File:** `src/pages/admin/Dashboard.jsx`

This fetches up to 500 call log rows to compute breakdown stats in JS. At scale, use a database-side GROUP BY query instead.

---

### 8.6 🟡 — Lead Status Filter Uses Raw String in Query

**File:** `src/pages/admin/Dashboard.jsx`

```js
supabase.from('filings').select('*', { count: 'exact', head: true })
  .not('filing_status', 'in', '("Filed","Completed")')
```

The string format for `.not('field', 'in', ...)` with Supabase JS client should use array format: `.not('filing_status', 'in', '(Filed,Completed)')` — the double quotes inside may cause query issues in some Supabase versions.

---

## 9. Performance Issues

### 9.1 🟠 — Multiple Sequential Supabase Calls in Some Pages

`PaymentsPage.jsx` calls `loadPayments()` and `loadSummary()` sequentially on page load via two separate `useEffect` triggers. These could be combined into one `Promise.all` call.

### 9.2 🟠 — No `useMemo` on Expensive Computations

In `SuperAdminDashboard.jsx`:
```js
const totalUsers     = users.length              // re-computed every render
const activeUsers    = users.filter(...)         // array filter every render
const suspendedUsers = users.filter(...)         // array filter every render
const bannedUsers    = users.filter(...)         // array filter every render
const roleBreakdown  = Object.entries(users.reduce(...)) // reduce every render
```

All of these should be wrapped in `useMemo`.

### 9.3 🟡 — Re-Renders on Mouse Events Using Inline Handlers

Throughout the codebase, `onMouseEnter`/`onMouseLeave` handlers directly mutate `e.currentTarget.style`. While this avoids React re-renders, it bypasses React's reconciliation entirely, which is intentional but could conflict with GSAP animations.

### 9.4 🟡 — GSAP Animations Replay on Every State Change

In dashboards, `useStaggerAnimation(containerRef)` runs `gsap.fromTo()` once on mount. This is correct. However, if the component re-renders due to state changes, the ref remains but GSAP may conflict with React's DOM updates.

### 9.5 🟡 — Lenis Smooth Scroll Conflicts with `overflowY: auto` on Main

**FIXED** — The `overflow: hidden` on the outer container was just corrected. However, Lenis works by hijacking the root scroll. In a layout where scrolling happens inside `<main style="overflowY: auto">` (a child element), Lenis won't intercept those scroll events. Lenis is currently only effective on the document body level. The smooth scroll effect may not work inside the dashboard main content area.

---

## 10. UI/UX & Consistency Issues

### 10.1 🟠 — PaymentsPage Uses Different CSS Pattern

As noted in §5.2, `PaymentsPage.jsx` uses Tailwind class names (`grid-cols-3`, `gap-4`, `text-xs`, `font-600`) while every other page uses inline styles. `font-600` is not a valid Tailwind utility — it should be `font-semibold`. This page may render differently or incorrectly.

### 10.2 🟡 — Export Button in LeadsPage Has No Implementation

**File:** `src/pages/admin/LeadsPage.jsx`

```jsx
<button className="btn btn-outline btn-sm" onClick={() => {}}>
  <Download size={13} /> Export
</button>
```

The export button does nothing (`onClick={() => {}`). This should call the Excel export functionality similar to `PaymentsPage.jsx`.

### 10.3 🟡 — Agents Can Edit Any Lead (Not Just Their Own)

**File:** `src/pages/admin/LeadsPage.jsx`

The edit button is shown for agents too. While `isAgent` is used to hide the Add/Export buttons, the edit button in the table actions has no agent restriction, allowing agents to edit leads they don't own (frontend only).

### 10.4 🟡 — No Empty State for First-Time Super Admin

When the portal is first set up with no data, all dashboards show empty tables. There's no onboarding guide or "first steps" prompt for Super Admin.

### 10.5 🟡 — Date/Time Displayed Without Timezone Context

All dates use `en-IN` locale but no explicit timezone is set. If users are in different timezones, dates could display inconsistently. For a BPO tool in India, IST should be explicitly enforced.

### 10.6 🟢 LOW — Topbar Clock Only Updates Every 60 Seconds

**File:** `src/components/layout/Topbar.jsx`

The clock interval is set to `60000ms`. It shows date only (no time), so this is fine, but if time is ever added, this will lag.

### 10.7 🟢 LOW — Login Page URL Has Typo

**File:** `src/pages/LoginPage.jsx`

```jsx
<a href="http://www.gktaxsoultions.services">  // "soultions" ← typo
```

Should be `gktaxsolutions.services`.

### 10.8 🟢 LOW — Notification IDs Use Underscore Instead of UUID

```js
id: `${Date.now()}_${Math.random().toString(36).slice(2)}`
```

This is fine for local state, but not collision-safe at scale. Low risk.

---

## 11. Animation & Scroll Issues

### 11.1 🟠 — Lenis Not Targeting the Scrollable Container

Lenis is initialized without a target `wrapper` or `content` option, meaning it targets `window`. But the scrollable area is `<main style="overflowY: auto">` inside the layout. Lenis won't intercept scroll events in that element.

**Fix:**
```js
// Pass a ref to the main container to Lenis
const lenis = new Lenis({
  wrapper: mainRef.current,
  content: mainRef.current,
  duration: 1.2,
})
```

Or use Lenis in `root` mode and set `overflow: auto` on `body` instead of the inner main container.

### 11.2 🟡 — GSAP Ticker Memory Leak (Already Noted in §5.6)

### 11.3 🟡 — `usePageAnimation` Hook Defined but Unused

**File:** `src/hooks/useAnimations.js`

`usePageAnimation` is exported but never imported or used anywhere.

### 11.4 🟢 — `animate-spin` Tailwind Class Used in Some Places

The `animate-spin` class on `<RefreshCw>` works because Tailwind CSS is loaded. This is consistent with the design intent even if most styles are inline.

---

## 12. Individual Page Audit

### 12.1 LoginPage.jsx ✅ Grade: A
- Polished, well-animated
- Zod validation correct
- Forgot password flow working
- Account status check on sign-in
- URL typo (minor)
- Left panel hidden on mobile with custom media queries in `<style>` tag — consider using Tailwind responsive classes instead

### 12.2 AppLayout.jsx ✅ Grade: A-
- **FIXED** — overflow:hidden removed from outer container
- Lenis integration present
- Sidebar collapse state works

### 12.3 Sidebar.jsx ✅ Grade: A
- Role-based navigation config is clean and well-organized
- `NAV_CONFIG` object pattern is excellent
- Collapse animation is smooth
- No issues found

### 12.4 Topbar.jsx ✅ Grade: A
- Notification system well-built
- Outside click handler correct
- Missing: `/super-admin` route not in `PAGE_NAMES` map — will show "Portal" as breadcrumb

### 12.5 AuthContext.jsx ✅ Grade: A-
- Solid auth flow
- Account status enforcement at login
- Missing: `refreshProfile` function
- Missing: Token expiry error handling

### 12.6 Admin Dashboard ✅ Grade: B+
- Comprehensive KPI display
- Charts well-implemented
- Over-fetches payment data (noted in §8.2)
- Super Admin control panel embedded here AND in SuperAdminDashboard — duplication

### 12.7 SuperAdmin Dashboard ✅ Grade: A-
- Excellent overview of portal state
- All users table with role breakdown
- Today's attendance visible
- `useMemo` missing for derived stats (noted in §9.2)

### 12.8 Supervisor Dashboard ✅ Grade: B+
- Good team overview
- Live call status chart
- Agent performance panel

### 12.9 Agent Dashboard ✅ Grade: A-
- Personal KPIs
- Follow-ups due today
- Priority leads list
- Call Now → CallLogModal integration

### 12.10 Auditor Dashboard ✅ Grade: A
- Filing update modal with react-hook-form
- Pending vs filed breakdown
- Clean implementation

### 12.11 Accounts Dashboard ✅ Grade: A
- Payment update modal
- Revenue breakdown
- Auto-calculates payment status based on amount paid

### 12.12 LeadsPage.jsx ✅ Grade: B+
- Pagination correct
- Bulk assignment working
- Export button not implemented (noted in §10.2)
- Agent can edit leads they don't own (noted in §10.3)

### 12.13 UsersPage.jsx ✅ Grade: B+
- Comprehensive user management
- Activity log view
- Password reset options
- User creation via client-side signUp (security issue noted in §4.5)
- Temp password shown but not actually set (noted in §4.6)

### 12.14 PaymentsPage.jsx ⚠ Grade: C+
- Functional but uses completely different CSS pattern
- Mixed Tailwind + custom class names
- `btn-primary`, `btn-secondary` used as Tailwind classes but these are custom CSS — may not render correctly
- Should be refactored to match rest of codebase

### 12.15 CallLogModal.jsx ✅ Grade: A
- Excellent UX for call logging
- Conditional fields based on call status
- Lead status update on submit
- Follow-up date setting

### 12.16 ProfilePage.jsx ✅ Grade: A
- Password change re-authenticates first
- Form validation with Zod
- Profile not updated in context after save (noted in §7.2)

---

## 13. Missing Features vs SOW

### 13.1 Pages/Modules Not Yet Implemented

| Feature | SOW Required | Status | Priority |
|---|---|---|---|
| ClientsPage.jsx | Full CRUD | File exists — not audited | High |
| FilingsPage.jsx | Full CRUD | File exists — not audited | High |
| CallLogsPage.jsx | Read + filter | File exists — not audited | High |
| FollowUpsPage.jsx | Today's view + update | File exists — not audited | High |
| AttendancePage.jsx | Clock-in/out + reports | File exists — not audited | High |
| ReportsPage.jsx | All report types | File exists — not audited | High |
| ImportExportPage.jsx | Excel import of leads | File exists — not audited | High |
| AuditLogsPage.jsx | Full system log view | File exists — not audited | Medium |
| Excel Lead Import | Bulk upload 35K leads | ImportExportPage exists | High |
| Daily Email Summary | Send to support@ | Not implemented | Medium |
| Attendance Auto-Track | Login/logout time | Partial (data model exists) | High |
| Documents Module | File upload/download | Not visible in pages | Medium |
| Client Portal | Phase 2 | Not started | Low |
| WhatsApp Integration | Phase 2 | Not started | Low |

### 13.2 Reports Module

The SOW requires:
- Daily Reports
- Weekly Reports
- Monthly Reports
- Attendance Reports
- Lead Reports
- Auditor Reports
- Filing Reports
- Revenue Reports
- Outstanding Reports
- Conversion Reports

`ReportsPage.jsx` exists but was not fully audited. All 10 report types need to be verified.

### 13.3 Attendance Auto-Clock

The SOW specifies automatic attendance tracking on login/logout. The attendance table exists in the schema, but there is no code in `AuthContext.jsx` to insert/update attendance records on `signIn`/`signOut`.

**Fix needed in AuthContext.jsx:**
```js
async function signIn(email, password) {
  // ... existing code ...
  // After successful sign in:
  await supabase.from('attendance').insert({
    user_id: data.user.id,
    login_time: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
  })
}

async function signOut() {
  // Update attendance record with logout time
  const today = new Date().toISOString().slice(0, 10)
  const { data: att } = await supabase.from('attendance')
    .select('id, login_time')
    .eq('user_id', user.id)
    .eq('date', today)
    .is('logout_time', null)
    .single()
  
  if (att) {
    const loginTime = new Date(att.login_time)
    const logoutTime = new Date()
    const workingHours = ((logoutTime - loginTime) / 3600000).toFixed(2)
    await supabase.from('attendance').update({
      logout_time: logoutTime.toISOString(),
      working_hours: workingHours,
    }).eq('id', att.id)
  }
  
  await supabase.auth.signOut()
  setProfile(null)
}
```

---

## 14. Recommendations Priority List

### 🔴 CRITICAL — Fix Immediately Before Production

1. **Implement ProtectedRoute on all routes** — Currently any URL is accessible without login
2. **Implement Supabase RLS policies** — All data is currently accessible to any authenticated user regardless of role
3. **Verify `.env` was never git-committed** — Rotate keys if it was
4. **Fix GSAP ticker cleanup memory leak** in `useAnimations.js`

### 🟠 HIGH — Fix Before First User

5. **Replace client-side `signUp` for user creation** with a Supabase Edge Function using service role
6. **Add global Error Boundary** in App.jsx
7. **Standardize CSS pattern** — Refactor PaymentsPage to use inline styles like the rest
8. **Add user-facing error toasts** for Supabase failures
9. **Implement attendance auto-clock** in AuthContext

### 🟡 MEDIUM — Fix in Sprint 2

10. **Add `useMemo` for derived stats** in SuperAdminDashboard
11. **Refresh AuthContext profile** after profile page save
12. **Add token expiry handler** in AuthContext
13. **Replace over-fetch with aggregate queries** for payment totals
14. **Fix Lenis to target correct scroll container**
15. **Implement Lead Export** in LeadsPage
16. **Remove unused dependencies** (date-fns, file-saver, @tanstack/react-table)
17. **Upgrade xlsx** to latest version
18. **Add loading state** when auth is initializing (replace `null` with spinner in RoleRedirect)
19. **Fix URL typo** in LoginPage (`soultions` → `solutions`)
20. **Add `/super-admin` to Topbar PAGE_NAMES** map

### 🟢 LOW — Technical Debt

21. Remove `_admin_legacy` dead code from routes
22. Extract `ROLE_LABELS` to constants.js (currently in 3 files)
23. Extract status badge styles to shared constants
24. Remove unused `usePageAnimation` export from useAnimations.js

---

## 15. SOW Completion Status

### Core Modules

| Module | SOW Requirement | Status |
|---|---|---|
| Authentication | Login, logout, forgot password, role-based redirect | ✅ Complete |
| User Management | Create, edit, ban/suspend/activate | ✅ Complete |
| Leads Module | Full CRUD, pagination, search, filter, bulk assign | ✅ Core complete, export missing |
| Call Logs | Log calls, interest, temperature, follow-up | ✅ Complete |
| Follow-Ups | Today's view, update | ⚠ Page exists, not audited |
| Clients | CRUD, auditor assignment | ⚠ Page exists, not audited |
| ITR Filings | Status tracking, ACK upload | ⚠ Page exists, not audited |
| Payments | Full tracking, receipt management | ✅ Core complete |
| Attendance | Auto clock-in/out, reports | 🔴 Missing auto-clock logic |
| Reports | 10 report types | ⚠ Page exists, not audited |
| Import/Export | Excel import for 35K leads | ⚠ Page exists, not audited |
| Audit Logs | Full system trail | ⚠ Page exists, not audited |
| Dashboards — All 5 Roles | KPIs, charts, quick actions | ✅ Complete |
| Super Admin Hub | System overview, user management | ✅ Complete |
| Notifications | In-app notification center | ✅ Complete |
| Email Summary | Daily email to support@ | 🔴 Not implemented |
| RLS / Security | Row-level security policies | 🔴 Not verified |
| GSAP Animations | Page transitions, counters, stagger | ✅ Mostly complete |
| Lenis Scroll | Smooth scrolling | ⚠ Targeting issue |
| Excel Export | All modules | ⚠ Only Payments has it |

### Summary

- **✅ Complete:** 11 of 20 major areas
- **⚠ Partial / Unverified:** 6 of 20
- **🔴 Missing / Critical:** 3 of 20

**Estimated overall SOW completion: ~65%**

---

## Appendix A — File Count Summary

| Category | Files | Status |
|---|---|---|
| Layout Components | 3 | ✅ |
| UI Components | 5 | ✅ |
| Context Providers | 2 | ✅ |
| Hooks | 1 | ⚠ |
| Library Utils | 3 | ✅ |
| Admin Pages | 12 | ✅ Most complete |
| Role Dashboards | 5 | ✅ |
| Auth Pages | 2 | ✅ |

---

## Appendix B — Quick Security Checklist

- [ ] RLS enabled on `leads` table
- [ ] RLS enabled on `clients` table
- [ ] RLS enabled on `payments` table
- [ ] RLS enabled on `filings` table
- [ ] RLS enabled on `users` table
- [ ] RLS enabled on `call_logs` table
- [ ] RLS enabled on `attendance` table
- [ ] RLS enabled on `audit_logs` table
- [ ] RLS enabled on `documents` table
- [ ] ProtectedRoute applied to all private routes
- [ ] `.env` verified NOT in git history
- [ ] Supabase keys rotated after any potential exposure
- [ ] User creation migrated to Edge Function

---

*Report generated by Amazon Q Developer — June 2025*
*GK Tax Consultancy BPO Portal — Internal Audit Document*

# Vite Migration And Stats Privacy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the remaining CRA toolchain with Vite while preserving gameplay and UI, and harden player stats persistence with reset and expiry behavior.

**Architecture:** Keep the gameplay layer intact and isolate the migration to entry/build/config files plus a small stats-storage envelope upgrade. Use tests first to lock down the build contract, stats retention rules, and non-regression expectations before changing runtime code.

**Tech Stack:** React 18, TypeScript, Vite, Jest/Testing Library, React Three Fiber, Tailwind CSS, Vercel

---

### Task 1: Lock Down The New Hardening Contract

**Files:**
- Create: `src/__tests__/securityConfig.test.ts`
- Modify: `src/__tests__/storage.test.ts`

**Step 1: Write the failing test**

Add tests that require:

- enforced `Content-Security-Policy` instead of report-only
- build/test packages to live in `devDependencies`
- the legacy `src/components/RaceBoard.tsx` file to be gone
- stats reads to reject expired envelopes
- stats reset/removal to be supported by the storage helper

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/securityConfig.test.ts src/__tests__/storage.test.ts`
Expected: FAIL because the config and storage contract do not exist yet.

**Step 3: Write minimal implementation**

- Add `securityConfig.test.ts`.
- Extend `storage.test.ts` with envelope expiry and reset expectations only as needed to define the target behavior.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/securityConfig.test.ts src/__tests__/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/securityConfig.test.ts src/__tests__/storage.test.ts
git commit -m "test: lock down vite and stats hardening contract"
```

### Task 2: Harden Stats Persistence Without Changing The UI Flow

**Files:**
- Modify: `src/utils/storage.ts`
- Modify: `src/App.tsx`
- Modify: `src/__tests__/storage.test.ts`
- Modify: `src/__tests__/app-smoke.test.tsx`

**Step 1: Write the failing test**

Add tests for:

- versioned stats envelope parsing
- expiry after 90 days of inactivity
- reset clearing persisted stats and refreshing the displayed stats section

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/storage.test.ts src/__tests__/app-smoke.test.tsx`
Expected: FAIL because envelope versioning/reset/expiry are not implemented.

**Step 3: Write minimal implementation**

- Update `src/utils/storage.ts` to support reading/writing/removing a versioned envelope.
- Update `src/App.tsx` to:
  - read the envelope on boot
  - discard expired data
  - write updated envelopes on stats change
  - expose a visible `Reset stats` action in the existing stats/home surface

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/storage.test.ts src/__tests__/app-smoke.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/App.tsx src/__tests__/storage.test.ts src/__tests__/app-smoke.test.tsx
git commit -m "fix: harden stats persistence and privacy"
```

### Task 3: Migrate The Build Toolchain To Vite

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `src/index.tsx`
- Delete: `public/index.html`

**Step 1: Write the failing test**

Extend `src/__tests__/securityConfig.test.ts` so it requires:

- `package.json` build/dev scripts to use Vite
- `vite.config.ts` to emit to `build/`
- CRA-only HTML template usage to be removed

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/securityConfig.test.ts`
Expected: FAIL because the CRA/Vite contract has not been changed yet.

**Step 3: Write minimal implementation**

- Add `vite.config.ts` configured for React and `build/` output.
- Move the HTML shell to root `index.html`.
- Update `package.json` scripts and dependency placement.
- Adjust `src/index.tsx` only as needed for Vite entry conventions.
- Remove the old CRA `public/index.html`.
- Refresh `package-lock.json`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/securityConfig.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vite.config.ts index.html package.json package-lock.json tsconfig.json src/index.tsx src/__tests__/securityConfig.test.ts
git rm public/index.html
git commit -m "build: migrate from cra to vite"
```

### Task 4: Preserve Deployment And Hardening Guarantees Under Vite

**Files:**
- Modify: `vercel.json`
- Modify: `scripts/build.js`
- Modify: `scripts/ensure-mediapipe-source-map.js`
- Modify: `src/__tests__/ensureMediaPipeSourceMap.test.ts`
- Modify: `src/__tests__/securityConfig.test.ts`

**Step 1: Write the failing test**

Add or extend tests so they require:

- production source maps to stay disabled
- Vercel headers to remain enforced
- the build wrapper to invoke Vite-compatible production behavior

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/ensureMediaPipeSourceMap.test.ts src/__tests__/securityConfig.test.ts`
Expected: FAIL because the current hardening helpers are still CRA-oriented.

**Step 3: Write minimal implementation**

- Update the build wrapper for Vite.
- Keep source-map suppression in production builds.
- Preserve or refine the current security headers in `vercel.json`.
- Adjust the MediaPipe compatibility helper only if the Vite build path needs it.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/ensureMediaPipeSourceMap.test.ts src/__tests__/securityConfig.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add vercel.json scripts/build.js scripts/ensure-mediapipe-source-map.js src/__tests__/ensureMediaPipeSourceMap.test.ts src/__tests__/securityConfig.test.ts
git commit -m "build: preserve deployment hardening under vite"
```

### Task 5: Remove Remaining CRA-Era Dead Weight And Re-Verify The App

**Files:**
- Delete: `src/components/RaceBoard.tsx`
- Modify: `src/__tests__/app-layout.test.tsx`
- Modify: `src/__tests__/app-smoke.test.tsx`

**Step 1: Write the failing test**

Add or keep tests that prove:

- app smoke flow still renders the start controls
- layout-critical surfaces still render correctly
- legacy dead files are no longer expected

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx src/__tests__/app-smoke.test.tsx src/__tests__/securityConfig.test.ts`
Expected: FAIL if the dead component is still present or if layout expectations drift during migration.

**Step 3: Write minimal implementation**

- Remove `src/components/RaceBoard.tsx`.
- Update any tests or references that still assume the old CRA/dead-code setup.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx src/__tests__/app-smoke.test.tsx src/__tests__/securityConfig.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/app-layout.test.tsx src/__tests__/app-smoke.test.tsx src/__tests__/securityConfig.test.ts
git rm src/components/RaceBoard.tsx
git commit -m "chore: remove legacy cra dead code"
```

### Task 6: Final Verification And Audit Refresh

**Files:**
- Modify: `package-lock.json`

**Step 1: Run focused test verification**

Run: `npm test -- --watch=false --runInBand src/__tests__/securityConfig.test.ts src/__tests__/storage.test.ts src/__tests__/app-layout.test.tsx src/__tests__/app-smoke.test.tsx src/__tests__/ensureMediaPipeSourceMap.test.ts`
Expected: PASS

**Step 2: Run repo verification**

Run: `npm run lint`
Expected: PASS

Run: `npm run typecheck`
Expected: PASS

Run: `npm run build`
Expected: PASS

**Step 3: Verify build output**

Run: `find build -type f \\( -name '*.map' -o -name '*.LICENSE.txt' \\) | sort`
Expected: only license text, no `.map` files

**Step 4: Refresh audits**

Run: `npm audit --omit=dev`
Expected: `found 0 vulnerabilities`

Run: `npm audit`
Expected: confirm whether any dev-toolchain risk remains after the migration

**Step 5: Commit**

```bash
git add package-lock.json
git commit -m "chore: verify vite migration and stats privacy hardening"
```

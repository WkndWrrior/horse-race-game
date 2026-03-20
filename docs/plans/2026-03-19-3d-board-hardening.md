# 3D Board Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the horse race game so the 3D board is forced on supported devices, unsupported devices get a clear blocked state, mobile keeps the board and the user's cards visible, and the app gains meaningful correctness and verification gates.

**Architecture:** Introduce a guarded 3D board host, centralize viewport and trade-session state handling, and add tests around the audited failure modes before changing runtime behavior. Keep the existing gameplay logic and overall screen structure unless required for correctness or the mobile board/card visibility requirement.

**Tech Stack:** React 18, TypeScript, Create React App, Jest/Testing Library, React Three Fiber, Drei

---

### Task 1: Add Verification Scripts And Test Harness

**Files:**
- Modify: `package.json`
- Create: `src/__tests__/app-smoke.test.tsx`

**Step 1: Write the failing test**

Create a smoke test that renders `App` and asserts the home screen shows the start controls.

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-smoke.test.tsx`
Expected: FAIL because the test file does not exist yet or render assumptions are not set up.

**Step 3: Write minimal implementation**

- Add `lint` and `typecheck` scripts to `package.json`.
- Add the smoke test with the minimal render assertion.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-smoke.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json src/__tests__/app-smoke.test.tsx
git commit -m "test: add project verification scripts"
```

### Task 2: Add Safe Storage Utilities

**Files:**
- Create: `src/utils/storage.ts`
- Create: `src/__tests__/storage.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Create tests for:

- safe read returns fallback when `localStorage.getItem` throws
- safe write swallows `setItem` failures and reports failure status
- invalid JSON falls back cleanly

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/storage.test.ts`
Expected: FAIL because the utility does not exist yet.

**Step 3: Write minimal implementation**

- Add a small storage utility with guarded read/write helpers.
- Replace direct `localStorage` access in `App.tsx` with the helper.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/storage.ts src/__tests__/storage.test.ts src/App.tsx
git commit -m "fix: guard stats storage access"
```

### Task 3: Add Reactive Viewport State

**Files:**
- Create: `src/hooks/useViewportMode.ts`
- Create: `src/__tests__/useViewportMode.test.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add tests that verify viewport mode updates when `window.innerWidth` changes and a `resize` event is dispatched.

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/useViewportMode.test.tsx`
Expected: FAIL because the hook does not exist yet.

**Step 3: Write minimal implementation**

- Add a hook that returns `isMobile`.
- Replace direct render/effect `window.innerWidth` branching in `App.tsx`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/useViewportMode.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useViewportMode.ts src/__tests__/useViewportMode.test.tsx src/App.tsx
git commit -m "fix: centralize viewport mode state"
```

### Task 4: Harden Scroll Lock Lifecycle

**Files:**
- Create: `src/utils/scrollLock.ts`
- Create: `src/__tests__/scrollLock.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add tests proving the scroll-lock helper restores prior body/html overflow values on release and on cleanup.

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/scrollLock.test.ts`
Expected: FAIL because the helper does not exist yet.

**Step 3: Write minimal implementation**

- Extract scroll lock into a helper with explicit acquire/release semantics.
- Update `App.tsx` to use effect cleanup consistently.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/scrollLock.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/scrollLock.ts src/__tests__/scrollLock.test.ts src/App.tsx
git commit -m "fix: clean up scroll lock reliably"
```

### Task 5: Add Guarded 3D Board Host

**Files:**
- Create: `src/components/BoardRuntimeBoundary.tsx`
- Create: `src/components/BoardSurface.tsx`
- Create: `src/utils/webglSupport.ts`
- Create: `src/__tests__/BoardSurface.test.tsx`
- Modify: `src/components/RaceBoard3D.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add tests proving:

- unsupported WebGL shows the "3D board unsupported" state
- supported WebGL renders the board host path
- runtime render failure enters a visible failed/unsupported state instead of crashing the test tree

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/BoardSurface.test.tsx`
Expected: FAIL because the host and capability logic do not exist yet.

**Step 3: Write minimal implementation**

- Add a WebGL support probe utility.
- Add an error boundary and board host component.
- Keep `RaceBoard3D` focused on scene rendering.
- Replace direct `RaceBoard3D` usage in `App.tsx` with the guarded host.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/BoardSurface.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/BoardRuntimeBoundary.tsx src/components/BoardSurface.tsx src/utils/webglSupport.ts src/__tests__/BoardSurface.test.tsx src/components/RaceBoard3D.tsx src/App.tsx
git commit -m "fix: harden 3d board runtime path"
```

### Task 6: Make Trade Session State Authoritative

**Files:**
- Create: `src/utils/tradeSession.ts`
- Create: `src/__tests__/tradeSession.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add tests covering:

- listing cancellation returns exactly one card
- market close returns only still-listed cards
- buy then close does not resurrect a sold listing
- AI/user mutations read the same current trade state

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/tradeSession.test.ts`
Expected: FAIL because trade session helpers do not exist yet.

**Step 3: Write minimal implementation**

- Extract pure trade-session operations into testable helpers.
- Update `App.tsx` so all trade mutations and timer reads use the same authoritative snapshot path.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/tradeSession.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/utils/tradeSession.ts src/__tests__/tradeSession.test.ts src/App.tsx
git commit -m "fix: unify trade session state"
```

### Task 7: Add Total-Elimination Terminal Handling

**Files:**
- Create: `src/__tests__/gameTermination.test.ts`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

Add a test that simulates all players becoming eliminated before a winner is declared and asserts the app transitions into a terminal summary state instead of leaving turn progression stalled.

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/gameTermination.test.ts`
Expected: FAIL because the app currently has no all-eliminated terminal path.

**Step 3: Write minimal implementation**

- Add a helper that detects zero active players.
- End the game cleanly with final standings and summary behavior.
- Ensure timers stop when terminal elimination is reached.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/gameTermination.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/gameTermination.test.ts src/App.tsx
git commit -m "fix: end game when all players are eliminated"
```

### Task 8: Rework Mobile Board And Card Visibility

**Files:**
- Create: `src/__tests__/app-layout.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css`

**Step 1: Write the failing test**

Add layout-oriented DOM tests asserting that:

- the player's card dock is rendered in game mode
- mobile mode keeps the board container mounted
- trade mode still shows the user's cards

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the current layout does not encode these guarantees clearly enough for test assertions.

**Step 3: Write minimal implementation**

- Add stable test ids/labels for the board region and player card dock.
- Restructure the mobile layout so the board stays visible and the user's cards remain persistently visible.
- Compress or isolate lower-priority panels without changing core game logic.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/app-layout.test.tsx src/App.tsx src/App.css src/index.css
git commit -m "feat: preserve board and user cards on mobile"
```

### Task 9: Harden Bootstrap And Observability Edges

**Files:**
- Create: `src/__tests__/bootstrap.test.ts`
- Modify: `src/index.tsx`
- Modify: `src/reportWebVitals.ts`

**Step 1: Write the failing test**

Add tests for:

- missing root element produces an explicit error
- `reportWebVitals` tolerates dynamic import failure without throwing

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/bootstrap.test.ts`
Expected: FAIL because the current implementation does not guard these paths.

**Step 3: Write minimal implementation**

- Add explicit root existence validation in `index.tsx`.
- Add guarded import handling in `reportWebVitals.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --runInBand src/__tests__/bootstrap.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/bootstrap.test.ts src/index.tsx src/reportWebVitals.ts
git commit -m "fix: harden bootstrap and metrics hooks"
```

### Task 10: Final Verification

**Files:**
- Modify as needed from prior tasks only

**Step 1: Run focused tests**

Run:

```bash
npm test -- --watch=false --runInBand src/__tests__/app-smoke.test.tsx src/__tests__/storage.test.ts src/__tests__/useViewportMode.test.tsx src/__tests__/scrollLock.test.ts src/__tests__/BoardSurface.test.tsx src/__tests__/tradeSession.test.ts src/__tests__/gameTermination.test.ts src/__tests__/app-layout.test.tsx src/__tests__/bootstrap.test.ts
```

Expected: PASS

**Step 2: Run project verification**

Run:

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: all PASS

**Step 3: Request code review**

Use `superpowers:requesting-code-review` before merge.

**Step 4: Commit**

```bash
git add package.json src docs/plans
git commit -m "fix: harden 3d board runtime and game reliability"
```

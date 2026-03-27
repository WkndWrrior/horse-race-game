# Mobile Board Growth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase the mobile game board evenly so it uses more of the available space without shrinking the player-card dock.

**Architecture:** Keep the mobile board wrapper content-sized instead of flex-growing, but enlarge its height contract and, if necessary, loosen the mobile-only 3D fit so the board expands into the available width and height. Desktop layout remains unchanged.

**Tech Stack:** React, TypeScript, Tailwind utility classes, app-level CSS, React Three Fiber / drei, Jest

---

### Task 1: Lock the mobile board-growth contract

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add expectations for:
- a larger mobile `.game-board-region` clamp
- preserved small mobile layout gap
- unchanged mobile non-flex-growing board wrapper

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the mobile board-height contract is still too small.

**Step 3: Commit the failing contract locally by keeping the test only**

Do not change implementation yet.

### Task 2: Increase the mobile board slot

**Files:**
- Modify: `src/App.css`

**Step 1: Write minimal implementation**

Increase the mobile `.game-board-region` clamp to use more of the available mobile height while preserving a small gap below the board.

**Step 2: Run the targeted test**

Run: `npm test -- --watch=false --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

### Task 3: Tighten mobile 3D fill if horizontal slack remains

**Files:**
- Modify: `src/components/RaceBoard3D.tsx`
- Modify: `src/__tests__/RaceBoard3D.test.ts`

**Step 1: Write the failing test**

Add a mobile-oriented source contract for the adjusted scene fit, such as:
- smaller mobile-only bounds margin
- removal of the extra mobile horizontal shrink if present

**Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --runInBand src/__tests__/RaceBoard3D.test.ts`
Expected: FAIL because the current mobile scene fit is still conservative.

**Step 3: Write minimal implementation**

Apply the smallest mobile-only scene-fit adjustment needed so the board grows evenly into the enlarged mobile slot.

**Step 4: Run the targeted tests**

Run: `npm test -- --watch=false --runInBand src/__tests__/RaceBoard3D.test.ts src/__tests__/app-layout.test.tsx`
Expected: PASS

### Task 4: Verify the full regression surface

**Files:**
- Test: `src/__tests__/BoardSurface.test.tsx`
- Test: `src/__tests__/RaceBoard3D.test.ts`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Run the board/layout slice**

Run: `npm test -- --watch=false --runInBand src/__tests__/BoardSurface.test.tsx src/__tests__/RaceBoard3D.test.ts src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 2: Run the full suite**

Run: `npm test -- --watch=false --runInBand`
Expected: `15/15` suites passing or the current updated total if new tests were added.

**Step 3: Run lint and build**

Run: `npm run lint`
Expected: PASS with only the known `baseline-browser-mapping` warning.

Run: `npm run build`
Expected: PASS with only the known large-chunk warning.

### Task 5: Commit

**Files:**
- Modify: `src/App.css`
- Modify: `src/App.tsx`
- Modify: `src/components/RaceBoard3D.tsx`
- Modify: `src/__tests__/app-layout.test.tsx`
- Modify: `src/__tests__/RaceBoard3D.test.ts`

**Step 1: Commit**

```bash
git add src/App.css src/App.tsx src/components/RaceBoard3D.tsx src/__tests__/app-layout.test.tsx src/__tests__/RaceBoard3D.test.ts docs/plans/2026-03-26-mobile-board-growth-design.md docs/plans/2026-03-26-mobile-board-growth.md
git commit -m "fix: enlarge the mobile board layout"
```

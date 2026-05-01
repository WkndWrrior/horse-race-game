# Mobile Board Preview Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the `/how-to-play` mobile board preview by moving the callout pins onto the correct targets and shrinking the mobile display so it fits the screen better.

**Architecture:** Keep the existing desktop tutorial board intact while refining the mobile-first Tailwind classes in `HowToPlayPage`. The update should only change presentation: callout coordinates, panel spacing, and mobile board sizing.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest

---

### Task 1: Update the regression first

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Reference: `src/components/HowToPlayPage.tsx`

**Step 1: Write the failing test**

Update the source-based tutorial layout assertions so they require:
- new mobile callout classes for the scratch, dice, and winner pins
- tighter mobile board/panel sizing classes

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the tighter tutorial board layout without the old top-row peg override"`

Expected: FAIL because the current mobile positions and sizing classes do not match the new expectations.

### Task 2: Patch the mobile tutorial board

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Move the mobile callouts**

Adjust only the mobile `className` / `pinClassName` coordinates for:
- scratch callout
- dice callout
- winner callout

Keep the `sm:` desktop coordinates unchanged unless a class needs to be split cleanly.

**Step 2: Shrink the mobile preview**

Tighten the mobile-only sizing for:
- outer tutorial section padding
- top card/panel spacing
- board wrapper padding
- mobile board track/rail sizing where needed

### Task 3: Verify

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Run the targeted regression**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`

Expected: PASS

**Step 2: Run shared verification**

Run:
- `npm run typecheck`
- `npm run build`

Expected:
- typecheck passes
- build succeeds

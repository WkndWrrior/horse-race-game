# Scratch Rail Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Widen and rebalance the scratched-horses rail on the `/how-to-play` tutorial board so all four scratch holes show, the lane badges align cleanly, and the labels fit.

**Architecture:** Keep all changes inside `src/components/HowToPlayPage.tsx` and lock the visual layout with a source-level regression in `src/__tests__/app-layout.test.tsx`. This is a pure static-layout adjustment with no gameplay changes.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, Testing Library

---

### Task 1: Lock the scratch-rail regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Add expectations that assert:
- the top-left callout uses the new higher position
- the tutorial board uses a wider desktop scratch rail
- the scratch-row source no longer contains the hidden-hole logic
- the dollar labels use a four-column grid layout

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the widened scratch rail with four visible peg holes per row"`
Expected: FAIL because the tutorial source still contains the old narrow rail and hidden-hole logic.

### Task 2: Rebalance the scratched-horses rail

**Files:**
- Modify: `src/components/HowToPlayPage.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Update the tutorial board to:
- widen the desktop scratch rail
- show four visible peg holes in every scratch row
- align the lane badges more cleanly with the track divider
- space the `Scratched` header and dollar labels cleanly
- move the left callout upward so it stops covering the header

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "uses the widened scratch rail with four visible peg holes per row"`
Expected: PASS

### Task 3: Verify the whole change

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/seoUtils.test.ts`

**Step 1: Run targeted regression coverage**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS

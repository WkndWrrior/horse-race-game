# Homepage How-To-Play Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the homepage `How To Play` route link only inside the expanded `Rules` panel.

**Architecture:** Keep the change inside `src/App.tsx` and lock it with a focused regression in `src/__tests__/app-layout.test.tsx`. This is a homepage visibility adjustment only and does not change routing or tutorial-page behavior.

**Tech Stack:** React, TypeScript, Jest, Testing Library

---

### Task 1: Lock the regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

Replace the current homepage link assertion with one that checks:
- no `How To Play` link is visible on the homepage before opening `Rules`
- clicking `Rules` reveals the `Open How To Play Page` link with `href="/how-to-play"`

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows the how-to-play link only inside the expanded rules panel"`
Expected: FAIL because the current homepage still renders the standalone hero link immediately.

### Task 2: Remove the standalone hero link

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Write minimal implementation**

Delete the always-visible hero `How To Play` link below the start buttons and leave the existing `Open How To Play Page` link inside the expanded `Rules` panel unchanged.

**Step 2: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows the how-to-play link only inside the expanded rules panel"`
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

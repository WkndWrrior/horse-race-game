# Homepage Anchor Column Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the homepage teaser cards into anchor links, keep them visible at the bottom of the first screen more reliably, and align the expanded `Player Stats` and `Rules` sections directly below them on larger screens.

**Architecture:** Split the home screen into a full-height first-screen wrapper with a slimmer teaser link row, then render the expanded sections in a responsive content grid below. Use real anchor `href`s plus smooth `scrollIntoView` behavior so clicking a teaser link scrolls inside the homepage container to the matching section.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Jest, React Testing Library

---

### Task 1: Update the homepage regression

**Files:**
- Modify: `src/__tests__/app-layout.test.tsx`
- Reference: `src/App.tsx`

**Step 1: Write the failing test**

Update the homepage layout test to require:
- a `Rules` link with `href="#rules-section"`
- a `Player Stats` link with `href="#player-stats-section"`
- one expanded `Player Stats` heading
- one expanded `Rules` heading
- the `Board Guide` link and visible rules copy

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`

Expected: FAIL because the current teaser cards are not links and the page still renders duplicate headings.

### Task 2: Patch the homepage layout

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/app-layout.test.tsx`

**Step 1: Add a smooth-scroll helper**

Create a small helper inside `App` that finds a home section by id and calls `scrollIntoView({ behavior: "smooth", block: "start" })`.

**Step 2: Convert teaser cards to slimmer links**

Replace the top teaser cards with anchor links that:
- point to `#player-stats-section` and `#rules-section`
- call the smooth-scroll helper on click
- use tighter padding and slightly smaller text so they fit better on shorter screens

**Step 3: Restructure the expanded sections**

Render the detailed sections in a responsive layout:
- mobile: stacked, `Rules` first then `Player Stats`
- desktop/tablet: two columns with `Player Stats` on the left and `Rules` on the right

**Step 4: Add section ids**

Attach:
- `id="player-stats-section"` to the expanded stats section
- `id="rules-section"` to the expanded rules section

### Task 3: Verify

**Files:**
- Test: `src/__tests__/app-layout.test.tsx`
- Test: `src/__tests__/seoUtils.test.ts`

**Step 1: Run the targeted layout regression**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx -t "shows board guide and expanded homepage sections by default"`

Expected: PASS

**Step 2: Run the full verification set**

Run:
- `npm test -- --runInBand src/__tests__/app-layout.test.tsx src/__tests__/seoUtils.test.ts`
- `npm run typecheck`
- `npm run build`

Expected:
- tests pass
- typecheck passes
- build succeeds

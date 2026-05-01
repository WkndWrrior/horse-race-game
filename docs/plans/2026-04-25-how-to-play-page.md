# How To Play Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a lightweight, crawlable `/how-to-play` page that explains the game in plain HTML and improves internal linking and metadata without changing gameplay.

**Architecture:** Use pathname-based rendering inside the existing SPA instead of adding a routing dependency. Add a static how-to-play page component, route-aware metadata updates, and generated sitemap coverage for both `/` and `/how-to-play`.

**Tech Stack:** React 18, TypeScript, Vite, Jest, Testing Library, build-time sitemap generation in `seo-utils.js`

---

### Task 1: Lock sitemap and route expectations with tests

**Files:**
- Modify: `src/__tests__/seoUtils.test.ts`
- Modify: `src/__tests__/app-layout.test.tsx`

**Step 1: Write the failing test**

```tsx
expect(fs.readFileSync(...)).toContain("/how-to-play");
window.history.pushState({}, "", "/how-to-play");
render(<App />);
expect(screen.getByRole("heading", { name: /how to play/i })).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/seoUtils.test.ts src/__tests__/app-layout.test.tsx`
Expected: FAIL because the route and sitemap do not yet include `/how-to-play`.

**Step 3: Write minimal implementation**

```ts
const DEFAULT_ROUTES = ["/", "/how-to-play"];
```

```tsx
if (pathname === "/how-to-play") {
  return <HowToPlayPage />;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/seoUtils.test.ts src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/__tests__/seoUtils.test.ts src/__tests__/app-layout.test.tsx seo-utils.js
git commit -m "test: cover how to play route"
```

### Task 2: Add the static how-to-play page and homepage links

**Files:**
- Create: `src/components/HowToPlayPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Write the failing test**

```tsx
expect(screen.getByRole("link", { name: /how to play/i })).toHaveAttribute(
  "href",
  "/how-to-play"
);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because the homepage does not yet expose a stable internal link.

**Step 3: Write minimal implementation**

```tsx
<a href="/how-to-play">How To Play</a>
```

```tsx
<HowToPlayPage />
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/components/HowToPlayPage.tsx src/__tests__/app-layout.test.tsx
git commit -m "feat: add how to play page"
```

### Task 3: Add route-aware metadata

**Files:**
- Modify: `src/App.tsx`
- Modify: `index.html`

**Step 1: Write the failing test**

```tsx
expect(document.title).toMatch(/how to play/i);
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: FAIL because title and canonical metadata are homepage-only.

**Step 3: Write minimal implementation**

```tsx
useEffect(() => {
  document.title = pageMeta.title;
}, [pathname]);
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx index.html src/__tests__/app-layout.test.tsx
git commit -m "feat: add route-aware metadata"
```

### Task 4: Verify the final build

**Files:**
- Modify: `package.json` if needed for verification only

**Step 1: Run focused tests**

Run: `npm test -- --runInBand src/__tests__/seoUtils.test.ts src/__tests__/app-layout.test.tsx`
Expected: PASS

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS and generated `build/sitemap.xml` should include `/how-to-play`.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-25-how-to-play-page-design.md docs/plans/2026-04-25-how-to-play-page.md
git commit -m "docs: plan how to play page"
```

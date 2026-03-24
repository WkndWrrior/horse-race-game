# Vite Migration And Stats Privacy Design

**Date:** 2026-03-20

## Goal

Remove the remaining CRA-era toolchain security debt without changing gameplay or the user interface, and tighten the privacy posture of local player statistics while keeping them persistent across browser restarts on the same device.

## Current Problems

- The runtime dependency graph is hardened, but the build and test scripts still depend on the old `react-scripts` toolchain.
- Full `npm audit` remains noisy because the repo still uses outdated CRA/Jest/webpack-era development tooling.
- Player statistics persist indefinitely in browser storage with no reset path or retention policy.
- The current stats persistence format is unversioned, which makes future migration and invalidation clumsy.

## Constraints

- Preserve all gameplay rules and timing.
- Preserve the current interface and visual behavior as closely as possible.
- Keep deployment output under `build/`.
- Keep stats surviving browser restarts on the same device.
- Keep stats local-only; do not introduce accounts or server-side persistence.

## Approaches Considered

### 1. Recommended: Migrate To Vite, Keep Local Stats With Reset And Expiry

- Replace `react-scripts` with `Vite`.
- Keep React, TypeScript, Tailwind, Jest, and the current app structure.
- Keep stats in browser storage, but wrap them in a versioned envelope with `updatedAt`.
- Add a visible reset action and expiry-based invalidation.

Why this is recommended:

- It removes the largest remaining hardening gap with the smallest runtime change.
- It avoids rewriting gameplay state or UI.
- It improves privacy without introducing a backend or more complex client storage.

### 2. Keep CRA, Only Add Stats Reset And Expiry

- Smaller immediate change.
- Does not materially reduce the remaining development-toolchain security debt.

### 3. Larger Platform Rewrite

- Stronger long-term modernization, but unnecessary for the current game and too likely to create regressions.

## Proposed Architecture

### Build And Dev Toolchain

Migrate the project from CRA to Vite while preserving deployment shape:

- add a root `index.html`
- add `vite.config.ts`
- keep the production output directory as `build/`
- keep static asset handling compatible with the existing deployment
- keep the current Vercel header model and postbuild SEO generation

The migration should be platform-only. `App.tsx`, the board components, and gameplay helpers should only change where the new entry/build setup requires it.

### Stats Storage Model

Keep local persistence in `localStorage`, but move to a versioned envelope:

```ts
{
  version: 1,
  updatedAt: string,
  stats: {
    half: { wins: number, bestBalance: number },
    full: { wins: number, bestBalance: number }
  }
}
```

Read rules:

- malformed payloads are ignored
- unknown versions are ignored
- expired payloads are ignored

Write rules:

- every successful stats update refreshes `updatedAt`
- reset removes the stored payload entirely

### Privacy Policy For Stats

Stats remain local to the device and survive browser restarts. They will expire after 90 days of inactivity. This keeps the convenience of persistence while avoiding indefinite retention on shared machines.

## Component And Data Flow

### App Layer

`App.tsx` continues to own gameplay and top-level stats display. The stats initialization path changes from raw stats JSON to reading a structured stats envelope through a dedicated storage helper.

### Storage Helper Layer

The storage helper becomes responsible for:

- reading and validating the stats envelope
- checking expiry
- exposing a reset/remove operation
- keeping malformed or stale data from affecting boot

### UI Surface

The reset control should live in the existing stats/home panel rather than introducing a new settings page. This preserves the interface while making the privacy control discoverable.

## Error Handling

- If storage is unavailable, the app continues with in-memory stats only.
- If stored stats are malformed or expired, the app silently falls back to empty stats.
- If reset fails because storage is blocked, the app should still clear the in-memory display for the current session.
- If the Vite migration introduces asset path issues, tests and build verification should catch them before release.

## Testing Strategy

Add or update tests for:

- stats envelope parsing
- stats expiry behavior
- stats reset behavior
- Vite/build configuration expectations
- build output staying in `build/`
- production source maps staying disabled
- existing app smoke/layout behavior remaining intact

Verification should include:

- focused Jest tests
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- direct inspection that `build/` does not emit `.map` files
- `npm audit --omit=dev`

## Out Of Scope

- Adding user accounts or cross-device sync
- Moving stats to IndexedDB or a backend
- Refactoring gameplay state machines
- Redesigning the interface

## Success Criteria

- The app runs under Vite with no visible gameplay or UI regression.
- Production builds still emit into `build/`.
- Production source maps remain disabled.
- `react-scripts` is no longer used for build or dev.
- Player stats survive restart, can be reset explicitly, and expire after 90 days of inactivity.
- Runtime dependency audit remains clean.

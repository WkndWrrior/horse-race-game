# 3D Board Hardening Design

**Date:** 2026-03-19

## Goal

Harden the game to an institutional-grade baseline without changing the core gameplay loop. The app must force the 3D board path, clearly report unsupported browsers/devices, keep the 3D board visible on mobile, and keep the human player's cards visible at all times.

## Current Problems

- The app assumes `localStorage` is always available and can throw during boot or persistence.
- The app assumes WebGL is always available and can fail while mounting the primary game surface.
- Trade state is split between React state and refs, which creates timer race windows during buy/cancel/close flows.
- The mobile layout is driven by snapshot viewport checks instead of reactive viewport state.
- Scroll locking can leak on unmount.
- The game can deadlock if all players are eliminated before a winner is declared.
- The repository has no effective automated regression gate.

## Constraints

- Force the 3D board everywhere when supported.
- If 3D cannot initialize, show a clear "3D board unsupported" state instead of falling back to the 2D board.
- Keep the board visible on both large and mobile views.
- Keep the human player's cards visible at all times on mobile and desktop.
- Preserve the existing gameplay rules and visual language as much as possible.

## Proposed Architecture

### 1. Guarded 3D Board Host

Introduce a dedicated board host component that owns board runtime state:

- `loading`
- `ready`
- `unsupported`
- `error`

The host will:

- perform a browser-side WebGL capability check before mounting the R3F canvas
- catch canvas/runtime failures with an error boundary
- render a first-class unsupported panel when WebGL is not available
- keep the board viewport size stable so layout does not jump between states

The actual scene component remains 3D-only. The 2D board stays in the repo only as a dormant asset, not as a runtime fallback.

### 2. Reactive Viewport Model

Replace direct render-time `window.innerWidth` checks with a viewport state hook. The app will derive mobile/desktop behavior from a single reactive source instead of ad hoc reads scattered across effects.

This allows:

- consistent trade tab defaults
- consistent scroll lock behavior
- stable mobile layout after orientation or resize changes
- simpler board sizing rules

### 3. Single Trade State Path

Trade mutations will move behind one synchronized update path so timers and user actions operate on the same authoritative snapshot.

Target properties:

- buy, sell, cancel, AI purchase, and market close all update the same trade session state
- returned-card logic uses current state, not delayed effect synchronization
- timers only read from the live authoritative snapshot

This can be implemented either as a reducer or as a state object with mirrored ref updates performed inside the same mutation helper. The simpler approach is preferred unless reducer structure clearly improves correctness.

### 4. Explicit Terminal State For Total Elimination

If all players are eliminated before the race completes, the game must terminate cleanly. The app should stop scheduling turns, produce final standings, and show an explicit end state instead of deadlocking on a non-runnable turn.

### 5. Safe Browser Integration

Harden browser-coupled code paths:

- safe `localStorage` read/write wrappers
- root bootstrap guard for missing `#root`
- scroll lock cleanup on unmount
- optional telemetry-safe `reportWebVitals` import guard

## Layout Design

### Desktop

- Keep the existing board-centered composition.
- Preserve side player panels where space allows.
- Make the board region a stable center column with bounded width and height.
- Keep the human player's cards in the primary HUD so they remain visible without requiring a scroll into sidebars.

### Mobile

- Reserve a protected board viewport area near the top of the game shell.
- Keep the 3D board continuously visible without requiring the player to scroll away from it.
- Keep the human player's cards in a persistent compact dock adjacent to the board region.
- Secondary information such as opponent cards and some trade detail moves into denser, scrollable containers.
- Trade mode remains usable without covering or displacing the board entirely.

The intent is not to show all information equally at once on mobile. The board and the user's cards are the priority surfaces.

## Error Handling

### Unsupported 3D

If the device/browser cannot support the 3D board:

- render a non-dismissable board-state panel in the board region
- explain that the 3D board is unsupported on the current device/browser
- avoid cascading runtime errors from trying to mount the scene anyway

### Runtime Board Failure

If the 3D board throws during mount or render:

- catch the error in a dedicated boundary
- transition the board region to an explicit failed state
- show a clear message rather than a blank area

### Storage Failure

If stats persistence fails:

- continue gameplay using in-memory stats
- skip persistence for that session
- do not crash the app

## Testing Strategy

Add regression coverage before changing behavior:

- stats storage read failure does not crash boot
- stats persistence write failure does not crash gameplay
- unsupported WebGL path shows the unsupported board state
- trade buy/cancel/close flows do not duplicate cards or revert current listings
- all-eliminated state resolves into a terminal game summary instead of a deadlock
- viewport hook drives responsive state transitions deterministically

Add repository gates:

- `npm run lint`
- `npm run typecheck`
- focused test command support in CI-style runs

## Out Of Scope

- Rewriting the full gameplay state machine
- Replacing Create React App in this pass
- Redesigning the full art direction of the board
- Introducing a 2D fallback mode

## Success Criteria

- The board renders 3D on supported devices and shows a clear unsupported state on unsupported ones.
- On mobile, the board remains visible and the user's cards remain visible throughout gameplay.
- Storage failures, trade timing windows, and unmount cleanup no longer create easy breakpoints.
- The app can terminate cleanly when all players are eliminated.
- The repo has actual tests plus `lint` and `typecheck` verification commands.

# Scratch Dollar Alignment Design

## Goal
Align the `$20 $15 $10 $5` labels with the four scratch-hole columns on the static `/how-to-play` tutorial board.

## Chosen Approach
Use one shared four-column layout for both the scratch-hole cluster and the dollar-label row, while preserving a separate column for the numbered lane badges. This is more stable than visually tuning the label spacing independently because both the holes and the labels will share the same column centers.

## Key Changes
- Introduce a shared four-column layout class for the scratch-hole cluster.
- Reserve the badge column in the dollar-label row so the amounts align only under the peg-hole columns.
- Keep four visible scratch holes per row and preserve the existing lane-count and track alignment behavior.
- Nudge the badge area only as much as the shared layout naturally requires.

## Validation
Add a source-level regression that asserts the shared scratch-column class and the new dollar-label row shell, then run the targeted layout tests, typecheck, and production build.

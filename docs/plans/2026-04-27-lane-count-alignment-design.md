# Lane Count And Alignment Design

## Goal
Correct the static tutorial board so each racing lane shows the proper number of peg holes and the track rows sit lower to align with the numbered scratch column on both mobile and desktop.

## Chosen Approach
Keep the current screenshot-style tutorial board and fix the problem at the data and layout levels. The peg count should be derived from the lane number itself, and the track column should get a small top spacer so its first row aligns with the `2` badge row instead of starting flush with the top of the wood panel.

## Key Changes
- Replace the current inverted peg-count formula with the real board pattern:
  - `2 -> 2`
  - `3 -> 3`
  - `4 -> 4`
  - `5 -> 5`
  - `6 -> 6`
  - `7 -> 7`
  - `8 -> 6`
  - `9 -> 5`
  - `10 -> 4`
  - `11 -> 3`
  - `12 -> 2`
- Add a consistent top spacer above the track rows so the first lane aligns with the first numbered badge row.
- Apply the same alignment behavior on mobile and desktop.

## Validation
Extend the source-level tutorial regression to assert the corrected peg-count formula and the new track-top spacer. Then run the targeted layout tests, typecheck, and production build.

# Scratched Label Fit Design

## Goal
Move the `Scratched` label slightly left on the static `/how-to-play` tutorial board so it remains fully readable on mobile and desktop.

## Chosen Approach
Keep the scratch rail structure intact and adjust only the label container padding and label letter spacing. This is the lowest-risk fix because it does not affect the peg rows, lane badges, dollar labels, or track alignment that were just corrected.

## Key Changes
- Reduce the scratch rail's horizontal padding slightly on mobile and desktop.
- Tighten the `Scratched` label tracking a bit so the word fits more naturally in the available width.
- Leave the rest of the scratch rail layout unchanged.

## Validation
Add a small source-level regression to assert the updated scratch-rail padding and label class string, then run the targeted layout tests, typecheck, and production build.

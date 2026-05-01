# Scratch Rail Alignment Design

## Goal
Clean up the scratched-horses rail on the `/how-to-play` tutorial board so each horse row shows four visible peg holes, the lane badges line up cleanly with the track lanes, and the header and dollar labels fit without crowding.

## Chosen Approach
Keep the current static tutorial board structure and widen only the scratched-horses rail on desktop. Use the extra width to show all four peg holes in every row, give the lane badges space to sit centered against the track divider, and format the header and dollar amounts as deliberate layout elements instead of relying on compressed inline spacing.

## Key Changes
- Increase the desktop width of the scratched-horses rail.
- Remove the hidden scratch-hole pattern so every row shows four peg holes.
- Add more separation between the peg holes, the lane badge, and the divider so the badge stays fully visible and aligned with the lane.
- Reformat the `Scratched` label and the `$20 $15 $10 $5` amounts into cleaner fixed spacing.
- Move the top-left callout upward so it no longer covers the `Scratched` label.

## Validation
Extend the source-level tutorial layout regression to assert the widened scratch rail, the removal of the hidden-hole logic, the fixed dollar-label grid, and the updated top-left callout position. Then run the targeted layout tests, typecheck, and production build.

# Scratch Dollar Readability Design

## Goal
Keep the scratch-dollar amounts on one line while making them easier to read on the static `/how-to-play` tutorial board.

## Chosen Approach
Keep the shared four-column alignment between the scratch holes and the dollar labels, but widen the scratch rail slightly and give the shared columns more horizontal spacing. Reduce the dollar-label font just enough so the values remain legible without colliding.

## Key Changes
- Widen the scratch rail on mobile and desktop.
- Increase the shared scratch-column gap so the peg holes and dollar labels have more separation.
- Reduce the dollar-label font slightly while keeping the amounts on one line.
- Leave the lane counts, badge alignment, and track layout unchanged.

## Validation
Add a source-level regression that asserts the wider scratch rail, the larger shared-column gap, and the updated dollar-label text size, then run the targeted layout tests, typecheck, and production build.

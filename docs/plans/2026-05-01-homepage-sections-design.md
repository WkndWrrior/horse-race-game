# Homepage Always-Expanded Sections Design

## Goal
Turn the homepage `Player Stats` and `Rules` dropdown cards into always-expanded on-page sections so users can scroll down into real content and the homepage has stronger visible text for SEO.

## Chosen Approach
Keep the hero/start-game area at the top of the homepage and replace the two interactive dropdown cards with vertically stacked content sections below it. The `Board Guide` link remains associated with `Rules`, but becomes a persistent top-right action in the rules section header instead of appearing only after expansion.

## Key Changes
- Remove the homepage `openHomePanel` state and dropdown behavior.
- Make the homepage normally scrollable whenever the game has not started.
- Replace the two toggle cards with always-expanded stacked sections:
  - `Player Stats`
  - `Rules`
- Keep `Board Guide` in the `Rules` section header row, aligned right.
- Preserve the existing stats content, rules copy, and `/how-to-play` route.

## Validation
Update the homepage regression to verify the `Player Stats` and `Rules` content are visible on initial load and that `Board Guide` is immediately present in the rules section. Then run the targeted layout tests, typecheck, and production build.

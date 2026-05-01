# How-To-Play Board Fit Design

## Goal
Tighten the static tutorial board on `/how-to-play` so the peg holes fit more naturally across the top lane and the instructional callouts point at the intended peg targets.

## Chosen Approach
Keep the existing HTML/CSS screenshot-style board and tune its proportions instead of redesigning the tutorial scene. The board should shrink slightly across the scratch rail, peg holes, track height, and finish-line spacing so the peg rhythm matches the real game more closely.

## Key Changes
- Remove the special top-lane peg override and let all lanes use the same spacing logic.
- Reduce the desktop peg-hole size and board dimensions slightly so the densest rows do not feel crowded.
- Realign the left and right callout pins so they land on the intended tutorial peg holes, especially the winning peg target near the finish side.

## Validation
Add a source-level regression test that proves the old top-row override is gone and locks in the tighter sizing and updated right-callout anchor. Then run the targeted layout test, typecheck, and build.

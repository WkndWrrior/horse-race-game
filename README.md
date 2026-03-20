# Horse Racing Board Game (Online)

An online adaptation of a classic horse racing board game. Roll, scratch, trade, and race your way to the finish line in a fast-paced tabletop-inspired experience.

## Features

- Multi-race game modes (half day and full day)
- Scratch phase penalties and trading window
- Race phase with peg-by-peg movement
- Final standings and payout summary
- Polished UI, 3D race board, and sound effects

## How to Play (Short)

1. Start a half day (4 races) or full day (8 races).
2. Scratch phase: roll to scratch four horses and apply penalties.
3. Trading phase: buy and sell cards during the timed market.
4. Race phase: roll to advance horses; scratched horses cost a penalty.
5. When a horse wins, the pot pays out to matching cards.

## Game Rules

Full rules are available in `public/Horse Race board game rules (for online game).pdf`.

## Sound Effects

- Dice roll SFX (plays only on the human player turn)
- Victory confetti pop + shimmer when a race winner is shown
- Daily leaderboard win sting for first place overall

## Screenshots / GIFs

Add screenshots or clips in a folder such as `docs/screenshots/`.
Example placeholder: `docs/screenshots/home.png`

## Local Development

### Requirements

- Node.js 20+ recommended

### Install

```bash
npm install
```

### Run

```bash
npm start
```

### Build

```bash
npm run build
```

## Environment Variables

This app uses Create React App style variables:

- `REACT_APP_SITE_URL` - production site URL used to generate build-time `robots.txt` and `sitemap.xml`

See `.env.example` for a template.

## Deployment Notes

- `npm run build` adds a MediaPipe source-map compatibility file before bundling, then regenerates `build/robots.txt` and `build/sitemap.xml` after bundling.
- Set `REACT_APP_SITE_URL` in your deployment environment for correct sitemap URLs.

## Folder Structure

```
public/
  index.html
  robots.txt
  sitemap.xml
  ...
src/
  App.tsx
  App.css
  components/
  ...
```

## Contribution Guidelines

1. Fork the repo and create a feature branch.
2. Keep changes focused and well-described.
3. Run `npm test` if you add tests.
4. Open a PR with a short summary and screenshots if UI changes.

## Tech Stack

- React 18 (Create React App)
- TypeScript
- Tailwind CSS
- Three.js via `@react-three/fiber`

## License

MIT License. See `LICENSE`.

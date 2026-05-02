import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import fs from "fs";
import path from "path";
import App from "../App";

jest.mock("../components/BoardSurface", () => ({
  __esModule: true,
  default: () => <div data-testid="board-surface" />,
}));

const makeRandomSequence = (values: number[]) => {
  let index = 0;
  return () => {
    if (index < values.length) {
      const next = values[index];
      index += 1;
      return next;
    }
    return 0;
  };
};

const advanceBy = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const advanceUntil = (predicate: () => boolean, stepMs = 200, maxSteps = 100) => {
  for (let step = 0; step < maxSteps; step += 1) {
    if (predicate()) {
      return true;
    }
    advanceBy(stepMs);
  }
  return predicate();
};

describe("App layout", () => {
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    randomSpy.mockRestore();
    window.innerWidth = 1024;
    window.history.replaceState({}, "", "/");
  });

  it("renders a dedicated how-to-play page at its own url", () => {
    window.history.replaceState({}, "", "/how-to-play");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /how to play horse race game/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to game home/i })).toHaveAttribute(
      "href",
      "/"
    );
    expect(document.title).toBe("How To Play Horse Race Game | Tutorial");
    expect(
      screen.queryByText(/Learn the goal of the game, what happens each race/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Scratch 4 horses and avoid their penalty lines/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Roll the dice and move the matching horse/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cheer for the horses that match your cards/i)
    ).toBeInTheDocument();
  });

  it("shows board guide and expanded homepage sections by default", () => {
    render(<App />);
    const appSource = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");
    const playerStatsTeaserLink = screen.getByRole("link", { name: /^Player Stats$/i });
    const rulesTeaserLink = screen.getByRole("link", { name: /^Rules$/i });

    expect(playerStatsTeaserLink).toHaveAttribute("href", "#player-stats-section");
    expect(rulesTeaserLink).toHaveAttribute("href", "#rules-section");
    expect(playerStatsTeaserLink).toHaveClass("rounded-[18px]");
    expect(rulesTeaserLink).toHaveClass("rounded-[18px]");
    expect(screen.getAllByRole("heading", { name: /^Player Stats$/i, level: 3 })).toHaveLength(
      1
    );
    expect(screen.getAllByRole("heading", { name: /^Rules$/i, level: 3 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /board guide/i })).toHaveAttribute(
      "href",
      "/how-to-play"
    );
    expect(screen.getByText(/^Half Day$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Full Day$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Wins: 0/i)).toHaveLength(2);
    expect(screen.getByText(/1\) Setup: 6 players/i)).toBeInTheDocument();
    expect(appSource).not.toContain("openHomePanel");
  });

  it("uses the tighter tutorial board layout without the old top-row peg override", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).not.toContain("badge.lane === 2");
    expect(tutorialSource).toContain(
      'const pegDotClassName =\n  "h-2.5 w-2.5 rounded-full bg-[#140c09] shadow-[0_1px_0_rgba(255,255,255,0.08)] sm:h-[1.22rem] sm:w-[1.22rem]"'
    );
    expect(tutorialSource).toContain(
      'className="right-[1%] top-[72%] sm:right-[2.5%] sm:top-[55%]" pinClassName="left-[72%] top-full"'
    );
    expect(tutorialSource).toContain(
      'className="grid grid-cols-[96px_minmax(0,1fr)] gap-0 sm:grid-cols-[210px_minmax(0,1fr)]"'
    );
    expect(tutorialSource).toContain(
      'className="relative h-9 border-t border-b border-[#593413]/55 sm:h-[72px]"'
    );
  });

  it("uses the widened scratch rail with four visible peg holes per row", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      'className="left-[4%] top-[48%] sm:left-[4%] sm:top-[21%]" pinClassName="left-7 top-full"'
    );
    expect(tutorialSource).toContain(
      'className="right-[4%] top-[39%] sm:right-[8%] sm:top-[6%]" pinClassName="left-[34%] top-full"'
    );
    expect(tutorialSource).toContain(
      'className="grid grid-cols-[96px_minmax(0,1fr)] gap-0 sm:grid-cols-[210px_minmax(0,1fr)]"'
    );
    expect(tutorialSource).not.toContain("const hidden =");
    expect(tutorialSource).not.toContain('hidden ? "opacity-0" : ""');
    expect(tutorialSource).toContain(
      'className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:mt-5 sm:gap-3"'
    );
  });

  it("uses the corrected lane peg counts and track alignment offset", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      "const pegCount = badge.lane <= 7 ? badge.lane : 14 - badge.lane;"
    );
    expect(tutorialSource).toContain('className="relative pt-4 sm:pt-11"');
  });

  it("uses the updated scratched label fit classes", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      'className="rounded-l-[24px] bg-[linear-gradient(90deg,#8f5314_0%,#9e621b_18%,#82440e_28%,#a1661f_41%,#7c410d_53%,#9d6320_69%,#824710_82%,#9b5f1c_100%)] px-2 py-3 sm:px-4 sm:py-4"'
    );
    expect(tutorialSource).toContain(
      'className="text-[9px] font-black uppercase tracking-[0.12em] text-[#f7f1d7] sm:text-[1.5rem] sm:tracking-[0.09em] sm:leading-none"'
    );
  });

  it("uses a shared scratch column layout for holes and dollar amounts", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      'const scratchColumnGridClassName = "grid grid-cols-4 justify-items-center gap-2 sm:gap-3";'
    );
    expect(tutorialSource).toContain(
      'className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:mt-5 sm:gap-3"'
    );
    expect(tutorialSource).not.toContain(
      'className="mt-4 grid grid-cols-4 gap-1 text-center text-[11px] font-black text-[#f7e6c4] sm:mt-5 sm:gap-2 sm:text-[1.1rem]"'
    );
  });

  it("uses wider scratch columns and smaller dollar labels for readability", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      'className="grid grid-cols-[96px_minmax(0,1fr)] gap-0 sm:grid-cols-[210px_minmax(0,1fr)]"'
    );
    expect(tutorialSource).toContain(
      'const scratchColumnGridClassName = "grid grid-cols-4 justify-items-center gap-2 sm:gap-3";'
    );
    expect(tutorialSource).toContain(
      'className={`${scratchColumnGridClassName} pr-1 text-center text-[10px] font-black text-[#f7e6c4] sm:pr-2 sm:text-[1rem]`}'
    );
  });

  it("uses mobile-specific callout anchors and tighter mobile preview spacing", () => {
    const tutorialSource = fs.readFileSync(
      path.resolve(__dirname, "../components/HowToPlayPage.tsx"),
      "utf8"
    );

    expect(tutorialSource).toContain(
      'className="relative overflow-hidden rounded-[40px] bg-[#ead9b8] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-6"'
    );
    expect(tutorialSource).toContain(
      'className="grid gap-2.5 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] sm:gap-4"'
    );
    expect(tutorialSource).toContain(
      'className="mt-4 rounded-[30px] bg-[#e6d7b7] p-2.5 sm:mt-6 sm:rounded-[40px] sm:p-6"'
    );
    expect(tutorialSource).toContain(
      'className="rounded-[24px] bg-[linear-gradient(90deg,#8d4f10_0%,#9a5b14_8%,#7d430d_14%,#99611d_22%,#80450f_29%,#8e5515_38%,#7a410e_46%,#93571a_54%,#7e4711_62%,#925717_70%,#7d450f_78%,#9a601b_86%,#7f450f_93%,#8a5015_100%)] p-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_18px_32px_rgba(114,68,13,0.18)] sm:rounded-[34px] sm:p-6"'
    );
  });

  it("renders the race board and player card dock in game mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    expect(screen.getByRole("region", { name: /race board/i })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /player card dock/i })
    ).toBeInTheDocument();
  });

  it("uses the race-board wrapper as a rounded clip without a visible pad", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    const boardRegion = screen.getByRole("region", { name: /race board/i });

    expect(boardRegion).toHaveClass("rounded-[28px]", "overflow-hidden");
    expect(boardRegion).not.toHaveClass("border", "bg-[#c18c4b]/40");
  });

  it("uses flat dice rendering while a roll is in progress", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    screen.getAllByLabelText(/die showing/i).forEach((die) => {
      expect(die).toHaveAttribute("data-render-mode", "flat");
    });

    advanceBy(800);

    screen.getAllByLabelText(/die showing/i).forEach((die) => {
      expect(die).toHaveAttribute("data-render-mode", "cube");
    });
  });

  it("keeps the dice panel opaque while disabled", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    const dicePanel = screen.getByRole("button", { name: /roll dice/i });

    expect(dicePanel).toHaveClass("dice-panel-disabled");
    expect(dicePanel).not.toHaveClass("opacity-60");
  });

  it("uses a modal trade overlay in mobile trade mode", () => {
    window.innerWidth = 390;
    window.innerHeight = 560;
    window.dispatchEvent(new Event("resize"));

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    randomSpy.mockImplementation(
      makeRandomSequence([
        0, 0, 0, 0, 0, 0,
        0, 0.2, 0, 0, 0, 0,
        0, 0.34, 0, 0, 0, 0,
        0, 0.51, 0, 0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    advanceBy(800);
    advanceBy(1500);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(1500);

    expect(
      screen.getByRole("region", { name: /race board/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /player card dock/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /trading controls/i })
    ).not.toBeInTheDocument();

    const tradeDialog = screen.getByRole("dialog", { name: /trading window/i });

    expect(tradeDialog).toBeInTheDocument();
    expect(tradeDialog).toHaveAttribute("aria-modal", "true");
    expect(within(tradeDialog).getByRole("button", { name: /start race/i })).toBeInTheDocument();
  });

  it("keeps the mobile board stack 15px lower while preserving the larger board", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../App.css"), "utf8");
    const appSource = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");

    expect(css).toContain(".game-board-region {\n    min-height: clamp(142px, 25vh, 220px);");
    expect(css).toContain(".mobile-board-stack {\n    gap: clamp(0.625rem, 2.1vh, 0.75rem);");
    expect(css).toContain(".mobile-board-slot {\n    margin-top: calc(clamp(0.875rem, 3vh, 1rem) + 15px);");
    expect(appSource).not.toContain("const gap = isMobile ? 4 : 0;");
    expect(appSource).toContain('className="game-layout mobile-board-stack w-full h-full min-h-0 px-0 sm:px-3 lg:px-4 flex flex-col lg:grid lg:grid-cols-[180px_minmax(0,1fr)_180px] gap-1 md:gap-3 items-stretch lg:items-start"');
    expect(appSource).toContain('className="mobile-board-slot order-1 flex min-h-0 lg:order-2 lg:flex-1"');
    expect(appSource).toContain(
      'className="game-board-region flex w-full items-stretch overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] lg:flex-1"'
    );
  });

  it("keeps the desktop trade overlay dialog path", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    randomSpy.mockImplementation(
      makeRandomSequence([
        0, 0, 0, 0, 0, 0,
        0, 0.2, 0, 0, 0, 0,
        0, 0.34, 0, 0, 0, 0,
        0, 0.51, 0, 0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    advanceBy(800);
    advanceBy(1500);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(1500);

    expect(screen.getByRole("dialog", { name: /trading window/i })).toBeInTheDocument();
  });

  it("keeps the desktop HUD in its own isolated layer", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    expect(screen.getByRole("region", { name: /game hud/i })).toHaveClass(
      "game-hud-layer"
    );
  });

  it("keeps race-finish confetti below the HUD", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));

    randomSpy.mockImplementation(
      makeRandomSequence([
        0, 0, 0, 0, 0, 0,
        0, 0.2, 0, 0, 0, 0,
        0, 0.34, 0, 0, 0, 0,
        0, 0.51, 0, 0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
        0, 0.8334, 0, 0, 0, 0,
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    advanceBy(800);
    advanceBy(1500);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(1500);

    fireEvent.click(screen.getByRole("button", { name: /start race/i }));

    expect(
      advanceUntil(() => screen.queryByText(/click to roll the dice/i) !== null)
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    expect(
      advanceUntil(() => screen.queryByTestId("confetti-container") !== null)
    ).toBe(true);

    const confetti = screen.getByTestId("confetti-container");

    expect(confetti).toBeInTheDocument();
    expect(confetti).toHaveClass("confetti-container--below-hud");
  });
});

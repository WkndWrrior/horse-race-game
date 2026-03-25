import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("keeps the board and player card dock mounted in mobile trade mode", () => {
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
      screen.getByRole("region", { name: /trading controls/i })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /trading controls/i })).getByRole(
        "dialog",
        { name: /trading window/i }
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /trading controls/i })).getByRole(
        "button",
        { name: /start race/i }
      )
    ).toBeInTheDocument();
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

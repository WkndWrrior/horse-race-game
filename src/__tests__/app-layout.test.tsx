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
});

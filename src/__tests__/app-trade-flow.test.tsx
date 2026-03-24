import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../App";

jest.mock("../components/BoardSurface", () => ({
  __esModule: true,
  default: () => <div data-testid="board-surface" />,
}));

const getUserCardsPanel = () =>
  screen.getByRole("region", { name: /player card dock/i });

const makeRandomSequence = (values: number[]) => {
  let index = 0;
  return () => {
    if (index < values.length) {
      const next = values[index];
      index += 1;
      return next;
    }
    throw new Error("Unexpected Math.random call during trade-window setup.");
  };
};

const advanceBy = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

describe("App trade flow", () => {
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    randomSpy.mockRestore();
  });

  it("keeps a cancelled user listing out of later AI and market-close mutations", () => {
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

    // App uses one user roll, three AI rolls, and a 1.5s trade-open delay to reach
    // the market. Advancing each delay separately keeps the test aligned to that flow.
    advanceBy(800);
    advanceBy(1500);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(800);
    advanceBy(1500);

    expect(
      screen.getByRole("heading", { name: /trading window/i, level: 3 })
    ).toBeInTheDocument();

    // Once the market is open, every later random call belongs to AI listing/purchase
    // behavior inside the trading window.
    randomSpy.mockReturnValue(0);

    const firstListButton = screen.getAllByRole("button", {
      name: /list .* for \$30/i,
    })[0];
    const selectedCard = firstListButton
      .getAttribute("aria-label")
      ?.replace(/^List /, "")
      .replace(/ for \$30$/, "");

    expect(selectedCard).toBeTruthy();
    expect(within(getUserCardsPanel()!).getAllByText(selectedCard!)).toHaveLength(1);

    fireEvent.click(firstListButton);

    expect(within(getUserCardsPanel()!).queryByText(selectedCard!)).not.toBeInTheDocument();

    const buyButtonsBefore = screen.queryAllByRole("button", {
      name: /buy .* for \$30/i,
    }).length;
    expect(buyButtonsBefore).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`^Cancel ${selectedCard}$`) })
    );

    expect(within(getUserCardsPanel()!).getAllByText(selectedCard!)).toHaveLength(1);

    advanceBy(15000);

    expect(
      screen.queryAllByRole("button", { name: /buy .* for \$30/i }).length
    ).toBeLessThan(buyButtonsBefore);

    advanceBy(20000);

    expect(
      screen.queryByRole("heading", { name: /trading window/i, level: 3 })
    ).not.toBeInTheDocument();
    expect(within(getUserCardsPanel()!).getAllByText(selectedCard!)).toHaveLength(1);
  });
});

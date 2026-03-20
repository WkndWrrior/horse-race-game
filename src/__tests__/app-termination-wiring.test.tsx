import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "../App";
import useTotalEliminationGuard from "../hooks/useTotalEliminationGuard";

jest.mock("../components/BoardSurface", () => ({
  __esModule: true,
  default: () => <div data-testid="board-surface" />,
}));

jest.mock("../hooks/useTotalEliminationGuard", () => ({
  __esModule: true,
  default: jest.fn(),
}));

type GuardOptions = {
  clearPendingGameTimers: () => void;
};

const mockedUseTotalEliminationGuard =
  useTotalEliminationGuard as jest.MockedFunction<typeof useTotalEliminationGuard>;

const hasExactText =
  (value: string) => (_content: string, element: Element | null) =>
    element?.textContent === value;

describe("App total-elimination wiring", () => {
  let latestOptions: GuardOptions | null;
  let randomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    latestOptions = null;
    jest.useFakeTimers();
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
    mockedUseTotalEliminationGuard.mockImplementation((options) => {
      latestOptions = options as GuardOptions;
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    randomSpy.mockRestore();
    mockedUseTotalEliminationGuard.mockReset();
  });

  it("cancels armed AI turn timers through the real App callback", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /half day \(4 races\)/i }));
    fireEvent.click(screen.getByRole("button", { name: /roll dice/i }));

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.getAllByText(hasExactText("#2 — $5 line")).length).toBeGreaterThan(0);
    expect(latestOptions).not.toBeNull();

    act(() => {
      latestOptions?.clearPendingGameTimers();
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.queryAllByText(hasExactText("#3 — $10 line"))).toHaveLength(0);
    expect(screen.queryByText(/trading window/i)).not.toBeInTheDocument();
  });
});

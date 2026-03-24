import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

jest.mock("../components/RaceBoard3D", () => ({
  __esModule: true,
  default: () => <div data-testid="race-board-3d" />,
}));

describe("App smoke test", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the home screen start controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /start game/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /half day \(4 races\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /full day \(8 races\)/i })
    ).toBeInTheDocument();
  });

  it("resets persisted player stats from the home stats panel", async () => {
    window.localStorage.setItem(
      "horse-race-player-stats",
      JSON.stringify({
        version: 1,
        updatedAt: "2026-03-20T00:00:00.000Z",
        stats: {
          half: { wins: 5, bestBalance: 123.45 },
          full: { wins: 2, bestBalance: 456.78 },
        },
      })
    );

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /player stats/i }));

    expect(screen.getByText("Wins: 5")).toBeInTheDocument();
    expect(screen.getByText("Highest Finish: $123.45")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reset stats/i }));

    expect(screen.getAllByText("Wins: 0")).toHaveLength(2);
    expect(screen.getAllByText("Highest Finish: $0.00")).toHaveLength(2);
    expect(window.localStorage.getItem("horse-race-player-stats")).toBeNull();
  });
});

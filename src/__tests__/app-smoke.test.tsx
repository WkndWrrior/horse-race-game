import React from "react";
import { render, screen } from "@testing-library/react";
import App from "../App";

jest.mock("../components/RaceBoard3D", () => ({
  __esModule: true,
  default: () => <div data-testid="race-board-3d" />,
}));

describe("App smoke test", () => {
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
});

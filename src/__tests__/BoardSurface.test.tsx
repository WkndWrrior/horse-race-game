import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import BoardSurface from "../components/BoardSurface";

jest.mock("../utils/webglSupport", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../components/RaceBoard3D", () => ({
  __esModule: true,
  default: () => {
    if ((globalThis as { __boardSurfaceShouldThrow?: boolean }).__boardSurfaceShouldThrow) {
      throw new Error("boom");
    }

    return <div data-testid="race-board-3d" />;
  },
}));

const mockIsWebGLSupported = jest.requireMock("../utils/webglSupport")
  .default as jest.Mock;

describe("BoardSurface", () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete (globalThis as { __boardSurfaceShouldThrow?: boolean })
      .__boardSurfaceShouldThrow;
  });

  it("shows the unsupported state when WebGL is unavailable", () => {
    mockIsWebGLSupported.mockReturnValue(false);

    render(<BoardSurface />);

    expect(screen.getByRole("status")).toHaveClass("min-h-0");
    expect(
      screen.getByRole("heading", { name: /3d board unsupported/i })
    ).toBeInTheDocument();
  });

  it("renders the 3D board when WebGL is supported", () => {
    mockIsWebGLSupported.mockReturnValue(true);

    render(<BoardSurface />);

    expect(screen.getByTestId("race-board-3d")).toBeInTheDocument();
  });

  it("keeps a minimum board height when the 3D board loads successfully", () => {
    mockIsWebGLSupported.mockReturnValue(true);

    render(<BoardSurface />);

    expect(screen.getByTestId("race-board-3d").parentElement).toHaveClass(
      "sm:min-h-[420px]"
    );
  });

  it("does not add fallback message padding around the live 3D board", () => {
    mockIsWebGLSupported.mockReturnValue(true);

    render(<BoardSurface />);

    expect(screen.getByTestId("race-board-3d").parentElement).not.toHaveClass(
      "px-6",
      "py-8",
      "text-center"
    );
  });

  it("uses a responsive live board shell instead of a fixed desktop minimum height", () => {
    mockIsWebGLSupported.mockReturnValue(true);

    render(<BoardSurface />);

    expect(screen.getByTestId("race-board-3d").parentElement).toHaveClass(
      "board-surface-live-shell"
    );
    expect(screen.getByTestId("race-board-3d").parentElement).not.toHaveClass(
      "lg:min-h-[560px]"
    );
  });

  it("shows the unsupported state when the board runtime throws", () => {
    mockIsWebGLSupported.mockReturnValue(true);
    (globalThis as { __boardSurfaceShouldThrow?: boolean }).__boardSurfaceShouldThrow = true;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<BoardSurface />);

      expect(screen.getByRole("alert")).toHaveClass("min-h-0");
      expect(
        screen.getByRole("heading", { name: /3d board failed to load/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("retries after a transient runtime failure", () => {
    mockIsWebGLSupported.mockReturnValue(true);
    (globalThis as { __boardSurfaceShouldThrow?: boolean }).__boardSurfaceShouldThrow = true;
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<BoardSurface />);

      expect(
        screen.getByRole("heading", { name: /3d board failed to load/i })
      ).toBeInTheDocument();

      (globalThis as { __boardSurfaceShouldThrow?: boolean }).__boardSurfaceShouldThrow = false;
      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      expect(screen.getByTestId("race-board-3d")).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

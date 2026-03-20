import React from "react";
import { act, render, screen } from "@testing-library/react";
import useViewportMode from "../hooks/useViewportMode";

const ViewportProbe: React.FC = () => {
  const { isMobile } = useViewportMode();
  return <div data-testid="viewport-mode">{isMobile ? "mobile" : "desktop"}</div>;
};

describe("useViewportMode", () => {
  it("updates when the viewport switches to mobile", () => {
    const originalWidth = window.innerWidth;
    try {
      window.innerWidth = 1200;
      render(<ViewportProbe />);

      expect(screen.getByTestId("viewport-mode")).toHaveTextContent("desktop");

      act(() => {
        window.innerWidth = 600;
        window.dispatchEvent(new Event("resize"));
      });

      expect(screen.getByTestId("viewport-mode")).toHaveTextContent("mobile");
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});

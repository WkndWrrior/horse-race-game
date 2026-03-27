import fs from "fs";
import path from "path";

describe("RaceBoard3D layout contract", () => {
  it("fills the available board shell without an inner width cap", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/RaceBoard3D.tsx"),
      "utf8"
    );

    expect(source).not.toContain('maxWidth: "min(100%, 1600px)"');
  });

  it("uses a tighter mobile bounds margin so the board fills more of the canvas", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/RaceBoard3D.tsx"),
      "utf8"
    );

    expect(source).toContain("const MOBILE_BOARD_BOUNDS_MARGIN = 0.96;");
    expect(source).toContain("const DESKTOP_BOARD_BOUNDS_MARGIN = 1.01;");
    expect(source).toContain("margin={isMobileViewport ? MOBILE_BOARD_BOUNDS_MARGIN : DESKTOP_BOARD_BOUNDS_MARGIN}");
  });

  it("removes the extra horizontal scene shrink on mobile only", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/RaceBoard3D.tsx"),
      "utf8"
    );

    expect(source).toContain("const MOBILE_BOARD_X_SCALE = 1;");
    expect(source).toContain("const DESKTOP_BOARD_X_SCALE = 0.95;");
    expect(source).toContain("scale={[showLaneNumbers ? MOBILE_BOARD_X_SCALE : DESKTOP_BOARD_X_SCALE, 1, 1]}");
  });
});

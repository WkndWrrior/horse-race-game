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

  it("uses a tighter bounds margin so the board fills more of the canvas", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/RaceBoard3D.tsx"),
      "utf8"
    );

    expect(source).toContain("const BOARD_BOUNDS_MARGIN = 1.01;");
    expect(source).toContain("margin={BOARD_BOUNDS_MARGIN}");
  });
});

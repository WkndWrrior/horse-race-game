import fs from "fs";
import path from "path";

describe("RaceBoard3D layout contract", () => {
  it("keeps extra bounds margin so the full board fits inside the canvas", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/RaceBoard3D.tsx"),
      "utf8"
    );

    expect(source).toContain("const BOARD_BOUNDS_MARGIN = 1.06;");
    expect(source).toContain("margin={BOARD_BOUNDS_MARGIN}");
  });
});

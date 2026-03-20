import fs from "fs";
import os from "os";
import path from "path";
import { ensureMediaPipeSourceMap } from "../../scripts/ensure-mediapipe-source-map";

describe("ensureMediaPipeSourceMap", () => {
  it("copies the shipped source map to the CRA-expected filename when missing", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mediapipe-map-"));
    const packageDir = path.join(tempDir, "@mediapipe", "tasks-vision");
    fs.mkdirSync(packageDir, { recursive: true });

    const shippedMap = path.join(packageDir, "vision_bundle.mjs.map");
    const expectedMap = path.join(packageDir, "vision_bundle_mjs.js.map");
    fs.writeFileSync(shippedMap, '{"version":3,"sources":[],"mappings":""}');

    try {
      const result = ensureMediaPipeSourceMap({ packageDir });

      expect(result.status).toBe("copied");
      expect(fs.readFileSync(expectedMap, "utf8")).toBe(
        fs.readFileSync(shippedMap, "utf8")
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does nothing when the expected source map file already exists", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mediapipe-map-"));
    const packageDir = path.join(tempDir, "@mediapipe", "tasks-vision");
    fs.mkdirSync(packageDir, { recursive: true });

    const shippedMap = path.join(packageDir, "vision_bundle.mjs.map");
    const expectedMap = path.join(packageDir, "vision_bundle_mjs.js.map");
    fs.writeFileSync(shippedMap, "shipped");
    fs.writeFileSync(expectedMap, "existing");

    try {
      const result = ensureMediaPipeSourceMap({ packageDir });

      expect(result.status).toBe("unchanged");
      expect(fs.readFileSync(expectedMap, "utf8")).toBe("existing");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

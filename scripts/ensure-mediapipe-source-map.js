const fs = require("fs");
const path = require("path");

const defaultPackageDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@mediapipe",
  "tasks-vision"
);

const ensureMediaPipeSourceMap = ({ packageDir = defaultPackageDir } = {}) => {
  const sourceMapPath = path.join(packageDir, "vision_bundle.mjs.map");
  const compatSourceMapPath = path.join(packageDir, "vision_bundle_mjs.js.map");

  if (!fs.existsSync(sourceMapPath)) {
    return { status: "missing", compatSourceMapPath, sourceMapPath };
  }

  if (fs.existsSync(compatSourceMapPath)) {
    return { status: "unchanged", compatSourceMapPath, sourceMapPath };
  }

  fs.copyFileSync(sourceMapPath, compatSourceMapPath);
  return { status: "copied", compatSourceMapPath, sourceMapPath };
};

if (require.main === module) {
  const result = ensureMediaPipeSourceMap();

  if (result.status === "copied") {
    console.log("[build] Added MediaPipe source-map compatibility file.");
  }
}

module.exports = { ensureMediaPipeSourceMap };

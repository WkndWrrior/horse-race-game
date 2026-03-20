const path = require("path");
const { DEFAULT_SITE_URL, writeSeoArtifacts } = require("./seo-utils");

const outputDir = path.resolve(__dirname, process.argv[2] || "public");
const siteUrl =
  process.env.REACT_APP_SITE_URL ||
  process.env.SITE_URL ||
  process.env.PUBLIC_URL ||
  DEFAULT_SITE_URL;
const today = new Date().toISOString().split("T")[0];

writeSeoArtifacts({
  outputDir,
  siteUrl,
  lastModified: today,
});

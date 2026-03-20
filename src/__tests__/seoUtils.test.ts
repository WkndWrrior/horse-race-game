import fs from "fs";
import os from "os";
import path from "path";
import {
  DEFAULT_SITE_URL,
  buildSeoArtifacts,
  writeSeoArtifacts,
} from "../../seo-utils";

describe("seo-utils", () => {
  it("builds sitemap and robots content from the requested site URL", () => {
    const artifacts = buildSeoArtifacts({
      siteUrl: "https://example.test",
      lastModified: "2026-03-20",
      routes: ["/", "/rules"],
    });

    expect(artifacts.sitemap).toContain("<loc>https://example.test/</loc>");
    expect(artifacts.sitemap).toContain("<loc>https://example.test/rules</loc>");
    expect(artifacts.sitemap).toContain("<lastmod>2026-03-20</lastmod>");
    expect(artifacts.robots).toContain("Sitemap: https://example.test/sitemap.xml");
  });

  it("writes seo artifacts to the requested output directory", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "seo-utils-"));

    try {
      writeSeoArtifacts({
        outputDir: tempDir,
        siteUrl: DEFAULT_SITE_URL,
        lastModified: "2026-03-20",
      });

      expect(fs.readFileSync(path.join(tempDir, "sitemap.xml"), "utf8")).toContain(
        DEFAULT_SITE_URL
      );
      expect(fs.readFileSync(path.join(tempDir, "robots.txt"), "utf8")).toContain(
        `${DEFAULT_SITE_URL}/sitemap.xml`
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

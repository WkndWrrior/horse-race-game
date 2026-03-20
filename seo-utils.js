const fs = require("fs");
const path = require("path");

const DEFAULT_SITE_URL = "https://horseracegame.vercel.app";
const DEFAULT_ROUTES = ["/"];

const normalizeSiteUrl = (rawSiteUrl = DEFAULT_SITE_URL) =>
  rawSiteUrl.replace(/\/+$/, "");

const buildSitemapEntry = (route, siteUrl, lastModified) => {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  const lastModifiedLine = lastModified
    ? `\n    <lastmod>${lastModified}</lastmod>`
    : "";

  return `  <url>
    <loc>${siteUrl}${normalizedRoute}</loc>${lastModifiedLine}
    <changefreq>${normalizedRoute === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${normalizedRoute === "/" ? "1.0" : "0.6"}</priority>
  </url>`;
};

const buildSeoArtifacts = ({
  siteUrl = DEFAULT_SITE_URL,
  lastModified,
  routes = DEFAULT_ROUTES,
} = {}) => {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const sitemapEntries = routes
    .map((route) => buildSitemapEntry(route, normalizedSiteUrl, lastModified))
    .join("\n");

  return {
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`,
    robots: `User-agent: *
Allow: /
Sitemap: ${normalizedSiteUrl}/sitemap.xml
`,
  };
};

const writeSeoArtifacts = ({
  outputDir,
  siteUrl = DEFAULT_SITE_URL,
  lastModified,
  routes = DEFAULT_ROUTES,
}) => {
  const resolvedOutputDir = path.resolve(outputDir);
  const artifacts = buildSeoArtifacts({ siteUrl, lastModified, routes });

  fs.mkdirSync(resolvedOutputDir, { recursive: true });
  fs.writeFileSync(path.join(resolvedOutputDir, "sitemap.xml"), artifacts.sitemap);
  fs.writeFileSync(path.join(resolvedOutputDir, "robots.txt"), artifacts.robots);

  return artifacts;
};

module.exports = {
  DEFAULT_ROUTES,
  DEFAULT_SITE_URL,
  buildSeoArtifacts,
  normalizeSiteUrl,
  writeSeoArtifacts,
};

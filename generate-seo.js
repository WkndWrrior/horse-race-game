const fs = require("fs");
const path = require("path");

const rawSiteUrl =
  process.env.REACT_APP_SITE_URL ||
  process.env.SITE_URL ||
  process.env.PUBLIC_URL ||
  "http://localhost:3000";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");
const today = new Date().toISOString().split("T")[0];

const routes = ["/"];

const sitemapEntries = routes
  .map(
    (route) => `  <url>
    <loc>${siteUrl}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${route === "/" ? "1.0" : "0.6"}</priority>
  </url>`
  )
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml
`;

const publicDir = path.join(__dirname, "public");
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

if (rawSiteUrl.includes("localhost")) {
  console.warn(
    "[seo] Using localhost for sitemap/robots. Set REACT_APP_SITE_URL for production."
  );
}

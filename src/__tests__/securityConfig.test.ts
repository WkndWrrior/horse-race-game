import { existsSync, readFileSync } from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8")) as T;

describe("security config", () => {
  it("enforces CSP headers in Vercel config", () => {
    const vercelConfig = readJson<{
      headers: Array<{
        headers: Array<{ key: string; value: string }>;
      }>;
    }>("vercel.json");
    const rootHeaders = vercelConfig.headers[0]?.headers ?? [];
    const keys = rootHeaders.map((header) => header.key);
    const cspHeader = rootHeaders.find(
      (header) => header.key === "Content-Security-Policy"
    );

    expect(keys).toContain("Content-Security-Policy");
    expect(keys).not.toContain("Content-Security-Policy-Report-Only");
    expect(cspHeader?.value).toContain("default-src 'self'");
    expect(cspHeader?.value).toContain("object-src 'none'");
    expect(cspHeader?.value).toContain("frame-ancestors 'none'");
  });

  it("keeps build-only tooling out of runtime dependencies", () => {
    const packageJson = readJson<{
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    }>("package.json");

    expect(packageJson.dependencies).not.toHaveProperty("react-scripts");
    expect(packageJson.dependencies).not.toHaveProperty("typescript");
    expect(packageJson.dependencies).not.toHaveProperty("@testing-library/react");
    expect(packageJson.dependencies).not.toHaveProperty("@types/react");
    expect(packageJson.devDependencies).not.toHaveProperty("react-scripts");
    expect(packageJson.devDependencies).toHaveProperty("typescript");
    expect(packageJson.devDependencies).toHaveProperty("@testing-library/react");
    expect(packageJson.devDependencies).toHaveProperty("@types/react");
    expect(packageJson.scripts.build).toBe("node scripts/build.js");
  });

  it("uses Vite for local development while keeping direct Jest tests", () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    }>("package.json");

    expect(packageJson.scripts.start).toBe("vite");
    expect(packageJson.scripts.test).toMatch(/^jest\b/);
    expect(packageJson.devDependencies).toHaveProperty("vite");
    expect(packageJson.devDependencies).toHaveProperty("@vitejs/plugin-react");
    expect(packageJson.devDependencies).toHaveProperty("jest");
    expect(packageJson.devDependencies).toHaveProperty("@swc/jest");
    expect(packageJson.devDependencies).toHaveProperty("jest-environment-jsdom");
    expect(packageJson.devDependencies).not.toHaveProperty("ts-jest");
  });

  it("uses a direct eslint flat config instead of react-app lint presets", () => {
    const packageJson = readJson<{
      devDependencies: Record<string, string>;
      eslintConfig?: unknown;
    }>("package.json");

    expect(existsSync(path.join(repoRoot, "eslint.config.js"))).toBe(true);
    expect(packageJson.devDependencies).not.toHaveProperty("eslint-config-react-app");
    expect(packageJson.eslintConfig).toBeUndefined();
  });

  it("defines a Vite build that still emits into build/", () => {
    const viteConfigPath = path.join(repoRoot, "vite.config.ts");
    expect(existsSync(viteConfigPath)).toBe(true);

    const viteConfig = readFileSync(viteConfigPath, "utf8");
    expect(viteConfig).toContain("outDir: \"build\"");
    expect(viteConfig).toContain("sourcemap: false");
  });

  it("uses the Vite build wrapper instead of the CRA build entrypoint", () => {
    const buildScript = readFileSync(path.join(repoRoot, "scripts/build.js"), "utf8");

    expect(buildScript).toContain('import("vite")');
    expect(buildScript).toContain("await build({ mode: \"production\" })");
    expect(buildScript).not.toContain("react-scripts/scripts/build");
  });

  it("moves the html shell to the repo root instead of CRA public/index.html", () => {
    expect(existsSync(path.join(repoRoot, "index.html"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "public/index.html"))).toBe(false);
  });

  it("does not keep the legacy external-resource board implementation", () => {
    expect(
      existsSync(path.join(repoRoot, "src/components/RaceBoard.tsx"))
    ).toBe(false);
  });
});

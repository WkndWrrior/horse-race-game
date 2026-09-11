export {};

import fs from "fs";
import path from "path";

describe("bootstrap and metrics hooks", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("throws an explicit error when the root element is missing", () => {
    const createRootMock = jest.fn();

    jest.doMock("react-dom/client", () => ({
      __esModule: true,
      default: { createRoot: createRootMock },
      createRoot: createRootMock,
    }));
    jest.doMock("../reportWebVitals", () => ({
      __esModule: true,
      default: jest.fn(),
    }));
    jest.doMock("@vercel/speed-insights/react", () => ({
      SpeedInsights: () => null,
    }));

    expect(() => {
      jest.isolateModules(() => {
        require("../index");
      });
    }).toThrow("Missing app root element: #root");
    expect(createRootMock).not.toHaveBeenCalled();
  });

  it("tolerates a web-vitals import failure", async () => {
    jest.dontMock("../reportWebVitals");
    jest.doMock("web-vitals", () => {
      throw new Error("load failed");
    });

    const { default: reportWebVitals } = await import("../reportWebVitals");
    const onPerfEntry = jest.fn();

    await expect(reportWebVitals(onPerfEntry)).resolves.toBeUndefined();
    expect(onPerfEntry).not.toHaveBeenCalled();
  });

  it("renders the Vercel React Speed Insights component at the app root", () => {
    const bootstrapSource = fs.readFileSync(path.resolve(__dirname, "../index.tsx"), "utf8");

    expect(bootstrapSource).toContain(
      'import { SpeedInsights } from "@vercel/speed-insights/react";'
    );
    expect(bootstrapSource).toContain("<SpeedInsights />");
  });
});

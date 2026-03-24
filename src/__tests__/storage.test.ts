import {
  safeReadJson,
  safeReadStatsEnvelope,
  safeRemoveJson,
  safeWriteStatsEnvelope,
  safeWriteJson,
} from "../utils/storage";

describe("storage helpers", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it("returns the fallback when localStorage.getItem throws", () => {
    const fallback = { half: { wins: 1, bestBalance: 2 } };
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(safeReadJson("horse-race-player-stats", fallback)).toEqual(fallback);
  });

  it("returns the fallback when stored JSON is invalid", () => {
    const fallback = { half: { wins: 3, bestBalance: 4 } };
    window.localStorage.setItem("horse-race-player-stats", "{not-json");

    expect(safeReadJson("horse-race-player-stats", fallback)).toEqual(fallback);
  });

  it("returns false when localStorage.setItem throws", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    expect(safeWriteJson("horse-race-player-stats", { hello: "world" })).toBe(false);
  });

  it("rejects expired stats envelopes", () => {
    const fallback = {
      half: { wins: 3, bestBalance: 4 },
      full: { wins: 5, bestBalance: 6 },
    };
    window.localStorage.setItem(
      "horse-race-player-stats",
      JSON.stringify({
        version: 1,
        updatedAt: "2025-01-01T00:00:00.000Z",
        stats: {
          half: { wins: 9, bestBalance: 10 },
          full: { wins: 11, bestBalance: 12 },
        },
      })
    );
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2025-05-01T00:00:00.000Z"));

    expect(safeReadStatsEnvelope("horse-race-player-stats", fallback)).toEqual(fallback);
  });

  it("reads the current versioned stats envelope", () => {
    const fallback = {
      half: { wins: 0, bestBalance: 0 },
      full: { wins: 0, bestBalance: 0 },
    };
    const stats = {
      half: { wins: 7, bestBalance: 120 },
      full: { wins: 3, bestBalance: 240 },
    };
    window.localStorage.setItem(
      "horse-race-player-stats",
      JSON.stringify({
        version: 1,
        updatedAt: "2026-03-01T00:00:00.000Z",
        stats,
      })
    );
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-03-20T00:00:00.000Z"));

    expect(safeReadStatsEnvelope("horse-race-player-stats", fallback)).toEqual(stats);
  });

  it("writes stats inside the current versioned envelope", () => {
    const stats = {
      half: { wins: 2, bestBalance: 50 },
      full: { wins: 4, bestBalance: 75 },
    };
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-03-20T12:34:56.000Z"));

    expect(safeWriteStatsEnvelope("horse-race-player-stats", stats)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("horse-race-player-stats") || "null")).toEqual({
      version: 1,
      updatedAt: "2026-03-20T12:34:56.000Z",
      stats,
    });
  });

  it("removes stored stats when reset is requested", () => {
    window.localStorage.setItem(
      "horse-race-player-stats",
      JSON.stringify({
        version: 1,
        updatedAt: "2025-03-20T00:00:00.000Z",
        stats: {
          half: { wins: 1, bestBalance: 2 },
          full: { wins: 3, bestBalance: 4 },
        },
      })
    );

    expect(safeRemoveJson("horse-race-player-stats")).toBe(true);
    expect(window.localStorage.getItem("horse-race-player-stats")).toBeNull();
  });
});

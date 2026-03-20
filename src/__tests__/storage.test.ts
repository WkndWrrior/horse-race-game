import { safeReadJson, safeWriteJson } from "../utils/storage";

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
});

import { acquireScrollLock } from "../utils/scrollLock";

describe("scroll lock helper", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  });

  it("restores prior overflow values when released", () => {
    document.body.style.overflow = "scroll";
    document.documentElement.style.overflow = "auto";

    const release = acquireScrollLock();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    release();

    expect(document.body.style.overflow).toBe("scroll");
    expect(document.documentElement.style.overflow).toBe("auto");
  });

  it("restores prior overflow values when cleanup runs twice", () => {
    document.body.style.overflow = "visible";
    document.documentElement.style.overflow = "clip";

    const release = acquireScrollLock();

    release();
    release();

    expect(document.body.style.overflow).toBe("visible");
    expect(document.documentElement.style.overflow).toBe("clip");
  });

  it("keeps scrolling locked until all active locks are released", () => {
    document.body.style.overflow = "scroll";
    document.documentElement.style.overflow = "auto";

    const releaseOne = acquireScrollLock();
    const releaseTwo = acquireScrollLock();

    releaseOne();

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    releaseTwo();

    expect(document.body.style.overflow).toBe("scroll");
    expect(document.documentElement.style.overflow).toBe("auto");
  });
});

const LOCKED_OVERFLOW = "hidden";

let activeLocks = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

export const acquireScrollLock = () => {
  if (typeof document === "undefined") {
    return () => {};
  }

  const { body, documentElement } = document;
  const isFirstLock = activeLocks === 0;

  if (isFirstLock) {
    previousBodyOverflow = body.style.overflow;
    previousHtmlOverflow = documentElement.style.overflow;
    body.style.overflow = LOCKED_OVERFLOW;
    documentElement.style.overflow = LOCKED_OVERFLOW;
  }

  activeLocks += 1;

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    activeLocks = Math.max(0, activeLocks - 1);

    if (activeLocks === 0) {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      previousBodyOverflow = "";
      previousHtmlOverflow = "";
    }
  };
};

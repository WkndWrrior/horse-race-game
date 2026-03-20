const WEBGL_CONTEXT_NAMES = ["webgl2", "webgl", "experimental-webgl"] as const;

const isWebGLSupported = () => {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return WEBGL_CONTEXT_NAMES.some((contextName) => {
      try {
        return Boolean(canvas.getContext(contextName));
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

export default isWebGLSupported;

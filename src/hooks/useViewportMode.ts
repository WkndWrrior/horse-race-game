import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

const readIsMobile = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

const useViewportMode = () => {
  const [isMobile, setIsMobile] = useState(readIsMobile);

  useEffect(() => {
    const updateViewportMode = () => {
      setIsMobile(readIsMobile());
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  return { isMobile };
};

export default useViewportMode;

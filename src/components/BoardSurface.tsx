import React, { useState } from "react";
import { Horse } from "../types";
import BoardRuntimeBoundary from "./BoardRuntimeBoundary";
import RaceBoard3D from "./RaceBoard3D";
import isWebGLSupported from "../utils/webglSupport";

interface BoardSurfaceProps {
  horses?: Horse[];
}

const BoardUnavailableState: React.FC = () => (
  <div
    className="flex h-full min-h-0 sm:min-h-[420px] lg:min-h-[560px] w-full items-center justify-center rounded-[28px] border border-amber-200/20 bg-[radial-gradient(circle_at_top,rgba(73,35,10,0.95),rgba(18,8,3,0.98))] px-6 py-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
    role="status"
    aria-live="polite"
  >
    <div className="max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-amber-200/70">
        Board unavailable
      </p>
      <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.16em] text-[#f8ead0]">
        3D board unsupported
      </h2>
      <p className="mt-4 text-sm leading-6 text-[#f6e3bf]/80">
        This browser or device cannot initialize the 3D board. The game requires
        WebGL support to render the race surface.
      </p>
    </div>
  </div>
);

const BoardRuntimeFailureState: React.FC<{ onRetry: () => void }> = ({
  onRetry,
}) => (
  <div
    className="flex h-full min-h-0 sm:min-h-[420px] lg:min-h-[560px] w-full items-center justify-center rounded-[28px] border border-rose-200/20 bg-[radial-gradient(circle_at_top,rgba(74,17,27,0.95),rgba(22,7,10,0.98))] px-6 py-8 text-center shadow-[0_32px_80px_rgba(0,0,0,0.4)]"
    role="alert"
    aria-live="assertive"
  >
    <div className="max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.5em] text-rose-200/70">
        Board runtime error
      </p>
      <h2 className="mt-4 text-3xl font-black uppercase tracking-[0.16em] text-[#ffe4e8]">
        3D board failed to load
      </h2>
      <p className="mt-4 text-sm leading-6 text-[#ffe4e8]/80">
        The 3D board hit a runtime error while loading. You can retry without
        reloading the page.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-full bg-rose-300 px-5 py-2.5 text-sm font-black uppercase tracking-[0.22em] text-rose-950 transition hover:bg-rose-200"
      >
        Retry
      </button>
    </div>
  </div>
);

const BoardSurface: React.FC<BoardSurfaceProps> = ({ horses }) => {
  const [isSupported] = useState(() => isWebGLSupported());
  const [runtimeResetKey, setRuntimeResetKey] = useState(0);

  if (!isSupported) {
    return <BoardUnavailableState />;
  }

  return (
    <BoardRuntimeBoundary
      resetKey={runtimeResetKey}
      fallback={
        <BoardRuntimeFailureState
          onRetry={() => {
            setRuntimeResetKey((key) => key + 1);
          }}
        />
      }
    >
      <RaceBoard3D horses={horses} />
    </BoardRuntimeBoundary>
  );
};

export default BoardSurface;

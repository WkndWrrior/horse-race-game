import React, { useMemo } from "react";
import { Horse } from "./types";

interface RaceBoardProps {
  horses?: Horse[];
}

const horsePalette = [
  { body: ["#fcd34d", "#f97316"], mane: "#431407" },
  { body: ["#86efac", "#16a34a"], mane: "#064e3b" },
  { body: ["#fde68a", "#ca8a04"], mane: "#78350f" },
  { body: ["#bfdbfe", "#2563eb"], mane: "#1e3a8a" },
  { body: ["#c4b5fd", "#7c3aed"], mane: "#4c1d95" },
  { body: ["#fbcfe8", "#ec4899"], mane: "#831843" },
  { body: ["#fed7aa", "#f97316"], mane: "#7c2d12" },
  { body: ["#fef9c3", "#facc15"], mane: "#92400e" },
  { body: ["#bbf7d0", "#22c55e"], mane: "#14532d" },
  { body: ["#bae6fd", "#38bdf8"], mane: "#0f172a" },
  { body: ["#ddd6fe", "#a855f7"], mane: "#6b21a8" },
];

const laneNumbers = Array.from({ length: 11 }, (_, i) => i + 2);
const maxPegCount = 7;
const pegRange = { start: 20, end: 92 };
const pegBasePositions = Array.from({ length: maxPegCount }, (_, idx) => {
  const fraction = idx / Math.max(1, maxPegCount - 1);
  return pegRange.start + fraction * (pegRange.end - pegRange.start);
});

const pegDistribution: Record<number, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 6,
  9: 5,
  10: 4,
  11: 3,
  12: 2,
};

const scratchPenaltyByStep: Record<number, number> = {
  1: 5,
  2: 10,
  3: 15,
  4: 20,
};

const START_POSITION = 14;
const FINISH_POSITION = 96;

type HorseWithPalette = Horse & {
  palette: (typeof horsePalette)[number];
};

const RaceBoard: React.FC<RaceBoardProps> = ({ horses }) => {
  const horsesByLane = useMemo<HorseWithPalette[]>(() => {
    return laneNumbers.map((lane, idx) => {
      const horse = horses?.find((h) => h.number === lane) ?? {
        number: lane,
        position: 0,
      };
      const palette = horsePalette[idx % horsePalette.length];
      return {
        ...horse,
        palette,
      } as HorseWithPalette;
    });
  }, [horses]);

  const getPegPositions = (count: number) => {
    const available = pegBasePositions.length;
    if (count >= available) {
      return pegBasePositions;
    }

    const startIndex = Math.floor((available - count) / 2);
    return pegBasePositions.slice(startIndex, startIndex + count);
  };

  const getHorseLeft = (
    horse: HorseWithPalette,
    pegPositionsForLane: number[]
  ) => {
    if (horse.scratched) {
      return 6;
    }

    const progress = horse.position ?? 0;

    if (progress <= 0) {
      return START_POSITION;
    }

    if (progress >= pegPositionsForLane.length) {
      return FINISH_POSITION;
    }

    const pegIndex = Math.min(
      pegPositionsForLane.length - 1,
      Math.max(progress - 1, 0)
    );

    return pegPositionsForLane[pegIndex];
  };

  return (
    <div className="w-full flex justify-center py-10 px-6 bg-[radial-gradient(circle_at_top,rgba(84,48,19,0.6),rgba(18,10,4,0.95))]">
      <div className="relative w-[95%] max-w-[1500px]">
        <div
          className="relative w-full rounded-[28px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.55)] border-[12px] border-[#3e2411]"
          style={{
            background:
              "linear-gradient(145deg, rgba(113,72,38,0.96), rgba(74,43,21,0.96)), url('https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=2000&q=60')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.22),rgba(0,0,0,0.6))]" />

          <div className="relative flex w-full h-full min-h-[560px]">
            {/* Scratch Zone */}
            <div className="relative w-[22%] min-w-[200px] bg-gradient-to-br from-[#591016] via-[#711a20] to-[#3a080c] border-r-[10px] border-[#341508] flex">
              <div className="absolute inset-0 opacity-35" style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 52px)",
              }} />
              <div className="absolute inset-0 opacity-25" style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 4px, transparent 4px 28px)",
              }} />
              <div className="relative flex-1 flex flex-col px-6 py-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="uppercase text-[13px] tracking-[0.55em] text-white/80 font-semibold">
                    Scratch
                  </span>
                  <div className="flex gap-2 text-[11px] text-white/55 uppercase tracking-[0.45em]">
                    <span>$5</span>
                    <span>$10</span>
                    <span>$15</span>
                    <span>$20</span>
                  </div>
                </div>
                <div
                  className="flex-1 grid gap-x-4"
                  style={{
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gridTemplateRows: "repeat(11, minmax(0, 1fr))",
                  }}
                >
                  {laneNumbers.map((lane) =>
                    Array.from({ length: 4 }).map((_, colIdx) => (
                      <div
                        key={`scratch-${lane}-${colIdx}`}
                        className="relative flex items-center justify-center"
                      >
                        <div
                          className="w-[18px] h-[18px] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.65)]"
                          style={{
                            background:
                              "radial-gradient(circle at 30% 30%, #fbe0b5, #6c3611 68%, #2b1303)",
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-6 grid grid-cols-4 text-center text-[11px] text-white/65 tracking-[0.35em] uppercase">
                  <span>Line 1</span>
                  <span>Line 2</span>
                  <span>Line 3</span>
                  <span>Line 4</span>
                </div>
              </div>
            </div>

            {/* Lane Labels */}
            <div className="relative w-[7%] min-w-[70px] bg-gradient-to-b from-[#f6deb6] via-[#ffe8c5] to-[#deb27b] border-r-[10px] border-[#341508]">
              <div className="absolute inset-0 opacity-45" style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 48px)",
              }} />
              <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 flex flex-col justify-between text-[#2f220f] font-black text-xl tracking-wider">
                {laneNumbers.map((lane) => (
                  <div key={`lane-label-${lane}`} className="select-none">
                    {lane}
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 right-0 w-[6px] bg-gradient-to-b from-white/60 via-black/20 to-white/35" />
            </div>

            {/* Main Track */}
            <div
              className="relative flex-1"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(205,152,95,0.92), rgba(170,113,62,0.92)), url('https://www.transparenttextures.com/patterns/wood-pattern.png')",
                backgroundBlendMode: "multiply",
              }}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,247,225,0.24),rgba(0,0,0,0.5))]" />
              <div className="absolute inset-0 flex flex-col">
                {laneNumbers.map((lane, idx) => (
                  <div
                    key={`lane-stripe-${lane}`}
                    className="flex-1 relative"
                    style={{
                      boxShadow:
                        idx === 0
                          ? "inset 0 12px 18px rgba(0,0,0,0.3)"
                          : idx === laneNumbers.length - 1
                          ? "inset 0 -12px 18px rgba(0,0,0,0.3)"
                          : "",
                      background:
                        idx % 2 === 0
                          ? "linear-gradient(180deg, rgba(213,164,110,0.72), rgba(183,129,78,0.72))"
                          : "linear-gradient(180deg, rgba(201,147,95,0.72), rgba(170,111,62,0.72))",
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-black/15" />
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-black/18" />
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 px-[6%] py-8 flex flex-col justify-between">
                {laneNumbers.map((lane, idx) => {
                  const laneHorse = horsesByLane[idx];
                  const pegCount = pegDistribution[lane];
                  const pegPositions = getPegPositions(pegCount);
                  const palette = laneHorse.palette;
                  const horseLeft = getHorseLeft(laneHorse, pegPositions);
                  const isWinner =
                    !laneHorse.scratched &&
                    (laneHorse.position ?? 0) >= pegCount;

                  return (
                    <div
                      key={`lane-${lane}`}
                      className="relative flex-1 flex items-center"
                    >
                      <div className="absolute inset-x-[3%] top-1/2 -translate-y-1/2 h-[52%] rounded-full border border-[#7a4a21]/60 bg-[radial-gradient(circle_at_50%_35%,rgba(255,229,188,0.55),rgba(136,78,26,0.85))] shadow-[inset_0_8px_18px_rgba(0,0,0,0.38)]" />

                      {/* Peg Holes */}
                      {pegPositions.map((pos, pegIdx) => (
                        <div
                          key={`lane-${lane}-peg-${pegIdx}`}
                          className="absolute"
                          style={{
                            left: `${pos}%`,
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div
                            className="w-[22px] h-[22px] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.6)]"
                            style={{
                              background:
                                "radial-gradient(circle at 30% 30%, #f9dcb4, #704119 65%, #2d1303)",
                            }}
                          />
                        </div>
                      ))}

                      {/* Horse Pawn */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 flex items-center transition-all duration-500 ease-out ${
                          laneHorse.scratched ? "opacity-60 grayscale" : ""
                        } ${
                          isWinner
                            ? "drop-shadow-[0_0_16px_rgba(250,204,21,0.75)]"
                            : ""
                        }`}
                        style={{ left: `${horseLeft}%` }}
                      >
                        <div className="relative w-16 h-10">
                          <div
                            className="absolute left-[12%] top-1/2 -translate-y-1/2 w-14 h-9 rounded-[999px] border-2 border-black/15 flex items-center justify-center"
                            style={{
                              background: `linear-gradient(135deg, ${palette.body[0]}, ${palette.body[1]})`,
                              boxShadow:
                                "0 8px 14px rgba(0,0,0,0.35), inset 0 2px 5px rgba(255,255,255,0.45)",
                            }}
                          >
                            <span className="text-lg font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                              {laneHorse.number}
                            </span>
                          </div>
                          <div
                            className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] rounded-full border border-black/20"
                            style={{
                              background: palette.body[1],
                              boxShadow: "0 4px 8px rgba(0,0,0,0.45)",
                            }}
                          />
                          <div
                            className="absolute left-[-2px] top-[18%] w-[14px] h-[14px] rounded-full"
                            style={{
                              background: palette.mane,
                              boxShadow: "0 2px 4px rgba(0,0,0,0.45)",
                            }}
                          />
                          <div
                            className="absolute -right-[14px] top-[45%] w-4 h-1 rounded-full"
                            style={{
                              background: palette.mane,
                              transform: "rotate(16deg)",
                            }}
                          />
                        </div>
                      </div>

                      {laneHorse.scratched && (
                        <div className="absolute left-[3%] top-1/2 -translate-y-1/2">
                          <div className="px-3 py-1 bg-black/60 text-white text-[11px] font-semibold uppercase tracking-wide rounded-full shadow">
                            Scratch
                            {laneHorse.scratchStep
                              ? ` $${scratchPenaltyByStep[laneHorse.scratchStep]}`
                              : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-y-8 left-[9%] w-[8px] bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.35)]" />
              <div className="absolute inset-y-8 left-[9%] w-[8px] bg-gradient-to-b from-white/80 via-white/40 to-white/65" />
            </div>

            {/* Finish Line */}
            <div className="relative w-[12%] min-w-[130px] bg-gradient-to-b from-[#111111] via-[#050505] to-[#181818] border-l-[10px] border-[#341508] flex flex-col items-center justify-center">
              <div className="absolute inset-y-12 left-6 right-6 rounded-xl overflow-hidden shadow-[inset_0_0_18px_rgba(0,0,0,0.65)]">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #f6f8fb 0 25%, #0c111d 25% 50%, #f6f8fb 50% 75%, #0c111d 75% 100%)",
                    backgroundSize: "18px 18px",
                  }}
                />
              </div>
              <div className="relative text-white font-black tracking-[0.45em] uppercase rotate-90 text-lg">
                Finish
              </div>
              <div className="absolute inset-y-8 right-7 w-[8px] bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.45)]" />
            </div>
          </div>
        </div>
        <div className="absolute inset-4 pointer-events-none border-4 border-white/8 rounded-[20px]" />
      </div>
    </div>
  );
};

export default RaceBoard;
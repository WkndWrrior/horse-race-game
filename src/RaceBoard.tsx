import React from "react";

export interface Horse {
  number: number;
  position?: number;
  scratched?: boolean;
  color?: string;
  gradient?: string;
}

interface RaceBoardProps {
  horses: Horse[];
}

const RaceBoard: React.FC<RaceBoardProps> = ({ horses }) => {
  const laneNumbers = Array.from({ length: 11 }, (_, i) => i + 2);
  const holesPerLane: Record<number, number> = {
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

  return (
    <div className="relative flex justify-center items-center w-full h-[83vh] bg-emerald-950">
      <div
        className="relative w-[95%] h-full rounded-3xl shadow-2xl border-[10px] border-amber-900 overflow-hidden flex"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1582719478171-2a9cbeec2f94?auto=format&fit=crop&w=2000&q=60')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow:
            "inset 0 3px 10px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.55)",
        }}
      >
        {/* Scratch Section */}
        <div className="w-[18%] h-full bg-gradient-to-b from-red-900 to-red-800 border-r-[6px] border-amber-900 shadow-inner flex flex-col">
          <div className="px-3 py-2 text-white font-extrabold tracking-wider text-center">
            SCRATCH
          </div>
          <div className="flex-1 grid grid-cols-4 gap-[2px]" style={{ gridTemplateRows: "repeat(11, 1fr)" }}>
            {laneNumbers.map((lane) =>
              Array.from({ length: 4 }).map((_, colIdx) => (
                <div
                  key={`scratch-${lane}-${colIdx}`}
                  className="flex items-center justify-center border border-amber-900 bg-amber-950/50 rounded-full"
                >
                  <div className="w-4 h-4 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-inner" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lane Number Column */}
        <div className="w-[6%] h-full bg-neutral-100/95 border-r-[6px] border-amber-900 shadow-inner relative">
          <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 flex flex-col justify-between text-gray-800 font-bold text-lg">
            {laneNumbers.map((n) => (
              <div key={`label-${n}`} className="text-center select-none">
                {n}
              </div>
            ))}
          </div>
        </div>

        {/* Main Track */}
        <div className="flex-1 h-full bg-amber-700/75 relative">
          <div className="absolute inset-0 flex flex-col justify-evenly">
            {laneNumbers.map((lane, i) => {
              const horse = horses[i];
              const count = holesPerLane[lane];
              return (
                <div
                  key={`lane-${lane}`}
                  className="relative flex items-center h-[8%] border-t border-b border-amber-900/90"
                  style={{
                    backgroundColor: i % 2 === 0 ? "#b97a56" : "#a86b46",
                    boxShadow:
                      "inset 0 3px 6px rgba(0,0,0,0.35), inset 0 -2px 4px rgba(255,255,255,0.12)",
                  }}
                >
                  {/* Peg Holes */}
                  <div className="absolute inset-y-0 left-[8%] right-[2%] flex items-center justify-between">
                    {Array.from({ length: count }).map((_, idx) => (
                      <div
                        key={`lane-${lane}-hole-${idx}`}
                        className="w-5 h-5 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-inner"
                      />
                    ))}
                  </div>

                  {/* Horse Emoji with Number — positioned just before first peg */}
                  <div
                    className="absolute left-[4%] flex items-center text-2xl"
                    style={{ transform: "translateY(-2px)" }}
                  >
                    <span className="text-[2rem] mr-1">🐎</span>
                    <span className="text-yellow-300 font-bold text-lg">
                      {lane}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Finish Line */}
        <div className="w-[7%] h-full bg-gradient-to-b from-gray-900 to-black border-l-[6px] border-amber-900 shadow-inner flex flex-col items-center justify-evenly">
          <div className="text-white font-extrabold tracking-widest text-sm rotate-90">
            FINISH
          </div>
          {laneNumbers.map((lane) => (
            <div
              key={`finish-${lane}`}
              className="w-5 h-5 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-inner"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RaceBoard;

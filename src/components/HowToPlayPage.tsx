import React from "react";

type ScratchChip = {
  horse: number;
  penalty: string;
  className: string;
};

type LaneBadge = {
  lane: number;
  className: string;
};

const scratchChips: ScratchChip[] = [
  { horse: 4, penalty: "$5 line", className: "bg-[#d84a3c]" },
  { horse: 10, penalty: "$10 line", className: "bg-[#d84a3c]" },
  { horse: 8, penalty: "$15 line", className: "bg-[#d84a3c]" },
  { horse: 5, penalty: "$20 line", className: "bg-[#d84a3c]" },
];

const laneBadges: LaneBadge[] = [
  { lane: 2, className: "bg-[#f1ddd1] text-[#d96f2f]" },
  { lane: 3, className: "bg-[#19b66a] text-[#0d5a35]" },
  { lane: 4, className: "bg-[#4475db] text-[#132d73]" },
  { lane: 5, className: "bg-[#7752d8] text-[#24105a]" },
  { lane: 6, className: "bg-[#db6cb5] text-[#731850]" },
  { lane: 7, className: "bg-[#e8b35a] text-[#734300]" },
  { lane: 8, className: "bg-[#51c5eb] text-[#0c4d6b]" },
  { lane: 9, className: "bg-[#e76692] text-[#6f1737]" },
  { lane: 10, className: "bg-[#2bc5cc] text-[#0f5e62]" },
  { lane: 11, className: "bg-[#e8c75d] text-[#735f10]" },
  { lane: 12, className: "bg-[#76c6ef] text-[#184f73]" },
];

const pegDotClassName =
  "h-2.5 w-2.5 rounded-full bg-[#140c09] shadow-[0_1px_0_rgba(255,255,255,0.08)] sm:h-[1.22rem] sm:w-[1.22rem]";
const scratchColumnGridClassName = "grid grid-cols-4 justify-items-center gap-2 sm:gap-3";

const DiceFace: React.FC<{ value: 2 | 3 }> = ({ value }) => {
  const pipMap: Record<2 | 3, Array<string>> = {
    2: ["left-[24%] top-[26%]", "left-[72%] top-[72%]"],
    3: ["left-[24%] top-[24%]", "left-[50%] top-[50%]", "left-[76%] top-[76%]"],
  };

  return (
    <div className="relative h-24 w-24 rounded-[26px] border border-[#d7dbe6] bg-[#f8f8fb] shadow-[inset_0_10px_24px_rgba(255,255,255,0.75),0_10px_24px_rgba(0,0,0,0.12)] sm:h-28 sm:w-28">
      {pipMap[value].map((position) => (
        <span
          key={`${value}-${position}`}
          className={`absolute ${position} h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1c2640] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.28)]`}
        />
      ))}
    </div>
  );
};

const Callout: React.FC<{
  className: string;
  pinClassName: string;
  children: React.ReactNode;
}> = ({ className, pinClassName, children }) => (
  <div className={`absolute z-20 max-w-[13rem] sm:max-w-[16rem] ${className}`}>
    <div className="rounded-2xl border border-[#1e6e49]/15 bg-[#1f6f4a] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#f6e5c8] shadow-[0_14px_28px_rgba(31,111,74,0.28)] sm:px-4 sm:py-3 sm:text-xs">
      {children}
    </div>
    <span className={`absolute block h-10 w-0.5 bg-[#1f6f4a]/75 sm:h-14 ${pinClassName}`} />
    <span
      className={`absolute block h-2.5 w-2.5 rounded-full bg-[#1f6f4a] ring-4 ring-[#f3e4c4] sm:h-3 sm:w-3 ${pinClassName}`}
      style={{ transform: "translate(-50%, calc(100% + 0.125rem))" }}
    />
  </div>
);

const HowToPlayPage: React.FC = () => (
  <main className="min-h-[100dvh] bg-[#f3e4c4] px-4 py-8 text-[#2d1b0f] sm:px-6 lg:px-8">
    <div className="mx-auto flex w-full max-w-[120rem] flex-col gap-8">
      <a
        href="/"
        className="inline-flex w-fit items-center rounded-full bg-[#1f6f4a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#f2e2c9] shadow-md"
      >
        Back To Game Home
      </a>

      <section className="rounded-[28px] border border-[#8b5a2b]/30 bg-[#c59653]/90 px-6 py-8 shadow-2xl sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6b3b17]">
          Quick Tutorial
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-wide sm:text-5xl">
          How To Play Horse Race Game
        </h1>
      </section>

      <section
        aria-label="How to play tutorial board"
        className="relative overflow-hidden rounded-[40px] bg-[#ead9b8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-6"
      >
        <Callout className="left-[2%] top-[18%] sm:left-[4%] sm:top-[21%]" pinClassName="left-10 top-full">
          Scratch 4 horses and avoid their penalty lines
        </Callout>
        <Callout className="right-[6%] top-[3%] sm:right-[8%] sm:top-[6%]" pinClassName="left-10 top-full">
          Roll the dice and move the matching horse
        </Callout>
        <Callout className="right-[1%] top-[56%] sm:right-[2.5%] sm:top-[55%]" pinClassName="left-[72%] top-full">
          Cheer for the horses that match your cards
        </Callout>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-[#86a77d] bg-[#4e7b4f] px-6 py-4 text-[#f7f1d7] shadow-[0_14px_30px_rgba(51,98,57,0.25)]">
                <p className="text-sm font-black uppercase tracking-[0.14em]">Current Player</p>
                <p className="mt-4 text-2xl font-black sm:text-3xl">You</p>
              </div>
              <div className="rounded-[26px] border border-[#86a77d] bg-[#4e7b4f] px-6 py-4 text-[#f7f1d7] shadow-[0_14px_30px_rgba(51,98,57,0.25)]">
                <p className="text-sm font-black uppercase tracking-[0.14em]">Pot</p>
                <p className="mt-4 text-2xl font-black sm:text-3xl">$225.00</p>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#86a77d] bg-[#7d986e] px-6 py-4 text-[#f7f1d7] shadow-[0_14px_30px_rgba(64,94,58,0.2)]">
              <p className="text-sm font-black uppercase tracking-[0.14em]">Scratched Horses</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {scratchChips.map((chip) => (
                  <div
                    key={`${chip.horse}-${chip.penalty}`}
                    className={`rounded-full px-4 py-2 text-sm font-black text-white shadow ${chip.className}`}
                  >
                    #{chip.horse} — {chip.penalty}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-[30px] border border-[#86a77d] bg-[#4e7b4f] px-6 py-4 text-[#f7f1d7] shadow-[0_18px_34px_rgba(51,98,57,0.24)]">
            <p className="text-sm uppercase tracking-[0.4em] text-[#d9e3ca]">Roll Total</p>
            <p className="mt-4 text-2xl font-black sm:text-3xl">5</p>
            <div className="mt-8 flex justify-center gap-6">
              <DiceFace value={3} />
              <DiceFace value={2} />
            </div>
            <p className="mt-8 text-lg text-[#d6ddcb]">Click to roll the dice</p>
          </aside>
        </div>

        <div className="mt-6 rounded-[40px] bg-[#e6d7b7] p-4 sm:p-6">
          <div className="rounded-[34px] bg-[linear-gradient(90deg,#8d4f10_0%,#9a5b14_8%,#7d430d_14%,#99611d_22%,#80450f_29%,#8e5515_38%,#7a410e_46%,#93571a_54%,#7e4711_62%,#925717_70%,#7d450f_78%,#9a601b_86%,#7f450f_93%,#8a5015_100%)] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_18px_32px_rgba(114,68,13,0.18)] sm:p-6">
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-0 sm:grid-cols-[210px_minmax(0,1fr)]">
              <div className="rounded-l-[24px] bg-[linear-gradient(90deg,#8f5314_0%,#9e621b_18%,#82440e_28%,#a1661f_41%,#7c410d_53%,#9d6320_69%,#824710_82%,#9b5f1c_100%)] px-2 py-3 sm:px-4 sm:py-4">
                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#f7f1d7] sm:text-[1.5rem] sm:tracking-[0.09em] sm:leading-none">
                  Scratched
                </p>
                <div className="mt-3 sm:mt-4">
                  {laneBadges.map((badge) => (
                    <div
                      key={badge.lane}
                      className="grid h-10 grid-cols-[1fr_auto] items-center gap-2 sm:h-[72px] sm:gap-3"
                    >
                      <div className={`${scratchColumnGridClassName} w-full min-w-0 pr-1 sm:pr-2`}>
                        {[0, 1, 2, 3].map((pegIndex) => (
                          <span
                            key={`${badge.lane}-${pegIndex}`}
                            className={pegDotClassName}
                          />
                        ))}
                      </div>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-4 border-white/20 text-sm font-black shadow-[0_0_0_3px_rgba(0,0,0,0.1)] sm:h-[2.85rem] sm:w-[2.85rem] sm:text-[1.2rem] ${badge.className}`}
                      >
                        {badge.lane}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:mt-5 sm:gap-3">
                      <div
                        className={`${scratchColumnGridClassName} pr-1 text-center text-[10px] font-black text-[#f7e6c4] sm:pr-2 sm:text-[1rem]`}
                      >
                    <span>$20</span>
                    <span>$15</span>
                    <span>$10</span>
                    <span>$5</span>
                  </div>
                  <span aria-hidden="true" className="h-8 w-8 sm:h-[2.85rem] sm:w-[2.85rem]" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-r-[24px] bg-[#ae6d2b]">
                <div className="absolute inset-y-0 right-5 w-3.5 bg-[repeating-linear-gradient(180deg,#ffffff_0_12px,#0f1118_12px_24px)] sm:right-6 sm:w-4 sm:bg-[repeating-linear-gradient(180deg,#ffffff_0_14px,#0f1118_14px_28px)]" />
                <div className="absolute inset-y-[8%] right-0 flex items-center pr-1 sm:pr-2">
                  <span className="h-6 w-6 rounded-full border-4 border-[#5a4700] bg-[#ae9600] shadow-[0_0_0_6px_rgba(0,0,0,0.12)] sm:h-9 sm:w-9 sm:border-[5px]" />
                </div>
                <div className="relative pt-4 sm:pt-11">
                  {laneBadges.map((badge) => {
                    const pegCount = badge.lane <= 7 ? badge.lane : 14 - badge.lane;

                        return (
                          <div
                            key={`track-${badge.lane}`}
                            className="relative h-10 border-t border-b border-[#593413]/55 sm:h-[72px]"
                          >
                            <div
                              className="absolute inset-y-0 left-0 w-1 bg-[#2d1407] sm:w-[5px]"
                            />
                            <div
                              className="absolute inset-y-0 left-[6px] right-9 flex items-center justify-around pr-2 sm:left-[8px] sm:right-12 sm:pr-2"
                            >
                              {Array.from({ length: pegCount }).map((_, pegIndex) => (
                                <span
                                  key={`${badge.lane}-track-${pegIndex}`}
                                  className={pegDotClassName}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
);

export default HowToPlayPage;

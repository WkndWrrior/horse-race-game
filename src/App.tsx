import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import BoardSurface from "./components/BoardSurface";
import { Horse } from "./types";
import useViewportMode from "./hooks/useViewportMode";
import useTotalEliminationGuard from "./hooks/useTotalEliminationGuard";
import {
  safeReadJson,
  safeReadStatsEnvelope,
  safeRemoveJson,
  safeWriteStatsEnvelope,
} from "./utils/storage";
import { acquireScrollLock } from "./utils/scrollLock";
import {
  applyAiPurchases,
  appendTradeListing,
  buyTradeListing,
  cancelTradeListing,
  closeTradeSession,
  createAiListings,
  createTradeSession,
  type TradeSessionState,
} from "./utils/tradeSession";

interface Card {
  value: number;
  label: string;
  suit: string;
}

interface Player {
  id: number;
  name: string;
  balance: number;
  cards: Card[];
  eliminated?: boolean;
}

type DiceRotation = { x: number; y: number };
type RaceSummary = {
  winner: number;
  pot: number;
  carryover: boolean;
  payouts: Array<{ playerId: number; name: string; amount: number; cards: number }>;
};
type PlayerStats = {
  half: {
    wins: number;
    bestBalance: number;
  };
  full: {
    wins: number;
    bestBalance: number;
  };
};
type TradeListing = {
  id: string;
  card: Card;
  sellerId: number;
};
type TradeSession = TradeSessionState<Player, Card>;
type FinalStanding = {
  playerId: number;
  name: string;
  balance: number;
  rank: number;
};
type GamePhase = "scratch" | "trade" | "race" | "finished" | null;

const laneNumbers = Array.from({ length: 11 }, (_, i) => i + 2);
const suits = ["♠", "♥", "♦", "♣"] as const;
const horseLabels = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Jack",
  "Queen",
];

const horseLabelByNumber = laneNumbers.reduce<Record<number, string>>(
  (acc, lane, idx) => {
    acc[lane] = horseLabels[idx];
    return acc;
  },
  {}
);

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

const DICE_ROTATIONS: Record<number, [number, number]> = {
  1: [0, 0],
  2: [-90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [90, 0],
  6: [180, 0],
};

const DICE_PIPS: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [25, 75],
    [75, 25],
    [75, 75],
  ],
  5: [
    [25, 25],
    [25, 75],
    [50, 50],
    [75, 25],
    [75, 75],
  ],
  6: [
    [25, 20],
    [25, 50],
    [25, 80],
    [75, 20],
    [75, 50],
    [75, 80],
  ],
};

const BAILOUT_REASONS = [
  "Your drunk uncle handed you cash to chase your losses.",
  "A mysterious benefactor slipped you a bonus on the house.",
  "You found a crisp bill under the table during the shuffle.",
  "The bartender paid you back that loan from last night.",
  "A lucky charm vendor insisted you take a little extra.",
  "You won a quick side bet behind the paddock.",
];
const LISTING_PRICE = 30;
const MAX_TRADES_PER_PLAYER = 2;
const STATS_STORAGE_KEY = "horse-race-player-stats";
const EMPTY_STATS: PlayerStats = {
  half: { wins: 0, bestBalance: 0 },
  full: { wins: 0, bestBalance: 0 },
};
const PLAYER_NAMES = [
  "You",
  "Lucky Lou",
  "Neigh Sayer",
  "Slim Jim",
  "Diane Diamond",
  "Longshot Liz",
];
const coerceStat = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const parseStoredPlayerStats = (stored: unknown): PlayerStats => {
  if (!stored || typeof stored !== "object") {
    return EMPTY_STATS;
  }

  const parsed = stored as Partial<PlayerStats> & {
    wins?: number;
    bestBalance?: number;
  };
  if (parsed?.half && parsed?.full) {
    return {
      half: {
        wins: coerceStat(parsed.half.wins),
        bestBalance: coerceStat(parsed.half.bestBalance),
      },
      full: {
        wins: coerceStat(parsed.full.wins),
        bestBalance: coerceStat(parsed.full.bestBalance),
      },
    };
  }

  if (Number.isFinite(parsed.wins) || Number.isFinite(parsed.bestBalance)) {
    const wins = coerceStat(parsed.wins);
    const bestBalance = coerceStat(parsed.bestBalance);
    return {
      half: { wins, bestBalance },
      full: { wins, bestBalance },
    };
  }

  return EMPTY_STATS;
};

const DicePips: React.FC<{ value: number }> = ({ value }) => (
  <>
    {DICE_PIPS[value].map(([x, y], idx) => (
      <span
        key={`${value}-${idx}`}
        className="dice-pip"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    ))}
  </>
);

const DiceFace: React.FC<{ value: number; faceClass: string }> = ({ value, faceClass }) => (
  <div className={`dice-face ${faceClass}`}>
    <DicePips value={value} />
  </div>
);

const FlatDiceFace: React.FC<{ value: number }> = ({ value }) => (
  <div className="dice-flat-face">
    <DicePips value={value} />
  </div>
);

const DiceCube: React.FC<{
  value: number;
  rotation: DiceRotation;
  rolling: boolean;
  size?: number;
}> = ({ value, rotation, rolling, size = 84 }) => (
  <div
    className="dice"
    style={{ "--dice-size": `${size}px` } as React.CSSProperties}
    aria-label={`Die showing ${value}`}
    data-value={value}
    data-render-mode={rolling ? "flat" : "cube"}
  >
    {rolling ? (
      <FlatDiceFace value={value} />
    ) : (
      <div
        className="dice-cube"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
      >
        <DiceFace value={value} faceClass="dice-face-front" />
        <DiceFace value={value} faceClass="dice-face-back" />
        <DiceFace value={value} faceClass="dice-face-right" />
        <DiceFace value={value} faceClass="dice-face-left" />
        <DiceFace value={value} faceClass="dice-face-top" />
        <DiceFace value={value} faceClass="dice-face-bottom" />
      </div>
    )}
  </div>
);

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  laneNumbers.forEach((lane) => {
    suits.forEach((suit) => {
      deck.push({
        value: lane,
        label: horseLabelByNumber[lane],
        suit,
      });
    });
  });
  return deck;
};

const shuffleDeck = (deck: Card[]) => {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const dealHands = (deck: Card[], playerCount: number): Card[][] => {
  const hands = Array.from({ length: playerCount }, () => [] as Card[]);
  deck.forEach((card, idx) => {
    hands[idx % playerCount].push(card);
  });
  return hands;
};

const formatCard = (card: Card) => `${card.label}${card.suit}`;
const sortCardsByValue = (cards: Card[]) =>
  [...cards].sort((a, b) => a.value - b.value);

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"half" | "full" | null>(null);
  const [currentRace, setCurrentRace] = useState(1);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [phase, setPhase] = useState<GamePhase>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceRoll, setDiceRoll] = useState<{
    die1: number;
    die2: number;
    total: number;
  } | null>(null);
  const [raceSummary, setRaceSummary] = useState<RaceSummary | null>(null);
  const [finalStandings, setFinalStandings] = useState<FinalStanding[]>([]);
  const [showFinalSummary, setShowFinalSummary] = useState(false);
  const [bailoutUsedByPlayer, setBailoutUsedByPlayer] = useState<
    Record<number, boolean>
  >({});
  const [bailoutPopup, setBailoutPopup] = useState<{
    playerName: string;
    amount: number;
    reason: string;
  } | null>(null);
  const [tradeListings, setTradeListings] = useState<TradeListing[]>([]);
  const [tradeSecondsLeft, setTradeSecondsLeft] = useState(0);
  const [tradeBuyCounts, setTradeBuyCounts] = useState<Record<number, number>>({});
  const [tradeSellCounts, setTradeSellCounts] = useState<Record<number, number>>({});
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeTab, setTradeTab] = useState<"buy" | "sell">("buy");
  const [openHomePanel, setOpenHomePanel] = useState<"stats" | "rules" | null>(
    null
  );
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const storedEnvelope = safeReadStatsEnvelope<unknown>(STATS_STORAGE_KEY, null);
    if (storedEnvelope !== null) {
      return parseStoredPlayerStats(storedEnvelope);
    }

    const legacyStats = safeReadJson<unknown>(STATS_STORAGE_KEY, null);
    return parseStoredPlayerStats(legacyStats);
  });
  const [dieRotations, setDieRotations] = useState<[DiceRotation, DiceRotation]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const [isRolling, setIsRolling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const { isMobile } = useViewportMode();
  const rollTimeoutRef = useRef<number | null>(null);
  const summaryTimeoutRef = useRef<number | null>(null);
  const summaryDelayRef = useRef<number | null>(null);
  const confettiTimeoutRef = useRef<number | null>(null);
  const aiRollTimeoutRef = useRef<number | null>(null);
  const tradeTimeoutRef = useRef<number | null>(null);
  const tradeIntervalRef = useRef<number | null>(null);
  const tradeEndsAtRef = useRef<number | null>(null);
  const tradeAiTimeoutRef = useRef<number | null>(null);
  const tradeDelayRef = useRef<number | null>(null);
  const tradeAiDelayRef = useRef<number | null>(null);
  const finalStatsRecordedRef = useRef(false);
  const skipNextStatsPersistRef = useRef(false);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const lastRollByUserRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const tradeStateRef = useRef<TradeSession>(
    createTradeSession<Player, Card>([], [], {}, {})
  );
  const handleRollRef = useRef<() => void>(() => {});
  const handleNextRaceRef = useRef<() => void>(() => {});
  const listingCounterRef = useRef(0);
  const [pot, setPot] = useState(0);
  const [scratchHistory, setScratchHistory] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  const getAudioContext = () => {
    if (typeof window === "undefined") return null;
    const Ctx =
      (window as typeof window & { AudioContext?: typeof AudioContext })
        .AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  };

  const playPegPop = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const dur = 0.08;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * t;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(1200, now);
    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(120, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + dur);
  };

  const playDiceRoll = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const randInt = (min: number, max: number) =>
      Math.floor(rand(min, max + 1));
    const pitchVariation = rand(0.94, 1.06);
    const gainVariation = rand(0.9, 1.1);

    const impactDur = 0.12;
    const impactBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * impactDur),
      ctx.sampleRate
    );
    const impactData = impactBuffer.getChannelData(0);
    for (let i = 0; i < impactData.length; i++) {
      const t = i / impactData.length;
      impactData[i] = (Math.random() * 2 - 1) * (1 - t);
    }

    const impactCount = randInt(2, 4);
    const impactOffsets: number[] = [];
    let offset = 0;
    for (let i = 0; i < impactCount; i += 1) {
      if (i > 0) {
        offset += rand(0.08, 0.2);
      }
      impactOffsets.push(offset);
    }

    impactOffsets.forEach((impactOffset, idx) => {
      const isFinal = idx === impactOffsets.length - 1;
      const start = now + impactOffset;
      const baseGain = isFinal ? 0.24 : 0.19 - idx * 0.012;
      const baseFreq = isFinal ? 900 : 1500 - idx * 140;
      const baseLowpass = isFinal ? 1800 : 2600 - idx * 150;
      const impactGain = Math.max(0.12, baseGain * gainVariation * rand(0.95, 1.05));
      const impactFreq = baseFreq * rand(0.94, 1.05);
      const impactLowpass = baseLowpass * rand(0.92, 1.04);
      const src = ctx.createBufferSource();
      src.buffer = impactBuffer;
      src.playbackRate.setValueAtTime(
        pitchVariation * rand(0.98, 1.03),
        start
      );
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(impactFreq, start);
      bandpass.Q.setValueAtTime(0.8, start);
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(impactLowpass, start);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(impactGain, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + impactDur);
      src.connect(bandpass);
      bandpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);
      src.start(start);
      src.stop(start + impactDur);
    });

    const rattleDur = rand(0.7, 1.05);
    const rattleBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * rattleDur),
      ctx.sampleRate
    );
    const rattleData = rattleBuffer.getChannelData(0);
    for (let i = 0; i < rattleData.length; i++) {
      const t = i / rattleData.length;
      rattleData[i] = (Math.random() * 2 - 1) * (1 - t);
    }
    const rattleSrc = ctx.createBufferSource();
    rattleSrc.buffer = rattleBuffer;
    rattleSrc.playbackRate.setValueAtTime(
      pitchVariation * rand(0.98, 1.03),
      now
    );
    const rattleBand = ctx.createBiquadFilter();
    rattleBand.type = "bandpass";
    rattleBand.frequency.setValueAtTime(1100 * rand(0.96, 1.04), now);
    rattleBand.Q.setValueAtTime(0.6, now);
    const rattleGain = ctx.createGain();
    rattleGain.gain.setValueAtTime(0.0001, now);
    rattleGain.gain.exponentialRampToValueAtTime(
      0.055 * gainVariation,
      now + 0.03
    );
    rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + rattleDur);
    rattleSrc.connect(rattleBand);
    rattleBand.connect(rattleGain);
    rattleGain.connect(ctx.destination);
    rattleSrc.start(now + 0.02);
    rattleSrc.stop(now + rattleDur);
  };

  const playVictoryConfetti = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;

    const popDur = 0.16;
    const popBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * popDur),
      ctx.sampleRate
    );
    const popData = popBuffer.getChannelData(0);
    for (let i = 0; i < popData.length; i++) {
      const t = 1 - i / popData.length;
      popData[i] = (Math.random() * 2 - 1) * t;
    }
    const popSrc = ctx.createBufferSource();
    popSrc.buffer = popBuffer;
    const popBand = ctx.createBiquadFilter();
    popBand.type = "bandpass";
    popBand.frequency.setValueAtTime(1800, now);
    popBand.Q.setValueAtTime(0.9, now);
    const popHigh = ctx.createBiquadFilter();
    popHigh.type = "highpass";
    popHigh.frequency.setValueAtTime(600, now);
    const popGain = ctx.createGain();
    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + popDur);
    popSrc.connect(popBand);
    popBand.connect(popHigh);
    popHigh.connect(popGain);
    popGain.connect(ctx.destination);
    popSrc.start(now);
    popSrc.stop(now + popDur);

    const hornDur = 1.28;
    const hornOsc = ctx.createOscillator();
    hornOsc.type = "square";
    hornOsc.frequency.setValueAtTime(620, now + 0.01);
    hornOsc.frequency.exponentialRampToValueAtTime(460, now + hornDur);
    const hornFilter = ctx.createBiquadFilter();
    hornFilter.type = "bandpass";
    hornFilter.frequency.setValueAtTime(880, now);
    hornFilter.Q.setValueAtTime(0.9, now);
    const hornGain = ctx.createGain();
    hornGain.gain.setValueAtTime(0.0001, now);
    hornGain.gain.exponentialRampToValueAtTime(0.06, now + 0.05);
    hornGain.gain.exponentialRampToValueAtTime(0.0001, now + hornDur);
    const hornVibrato = ctx.createOscillator();
    hornVibrato.type = "sine";
    hornVibrato.frequency.setValueAtTime(7.5, now);
    const hornVibratoGain = ctx.createGain();
    hornVibratoGain.gain.setValueAtTime(10, now);
    hornVibrato.connect(hornVibratoGain);
    hornVibratoGain.connect(hornOsc.frequency);
    hornOsc.connect(hornFilter);
    hornFilter.connect(hornGain);
    hornGain.connect(ctx.destination);
    hornOsc.start(now + 0.02);
    hornOsc.stop(now + hornDur);
    hornVibrato.start(now + 0.02);
    hornVibrato.stop(now + hornDur);

    const shimmerDur = 2.1;
    const shimmerBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * shimmerDur),
      ctx.sampleRate
    );
    const shimmerData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < shimmerData.length; i++) {
      const t = 1 - i / shimmerData.length;
      shimmerData[i] = (Math.random() * 2 - 1) * t;
    }
    const shimmerSrc = ctx.createBufferSource();
    shimmerSrc.buffer = shimmerBuffer;
    const shimmerHigh = ctx.createBiquadFilter();
    shimmerHigh.type = "highpass";
    shimmerHigh.frequency.setValueAtTime(900, now);
    const shimmerLow = ctx.createBiquadFilter();
    shimmerLow.type = "lowpass";
    shimmerLow.frequency.setValueAtTime(4200, now);
    const shimmerBand = ctx.createBiquadFilter();
    shimmerBand.type = "bandpass";
    shimmerBand.frequency.setValueAtTime(2400, now);
    shimmerBand.Q.setValueAtTime(0.45, now);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.05, now + 0.2);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + shimmerDur);
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.type = "sine";
    shimmerLfo.frequency.setValueAtTime(6, now);
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.setValueAtTime(0.008, now);
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);

    shimmerSrc.connect(shimmerHigh);
    shimmerHigh.connect(shimmerBand);
    shimmerBand.connect(shimmerLow);
    shimmerLow.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerSrc.start(now + 0.05);
    shimmerSrc.stop(now + shimmerDur);
    shimmerLfo.start(now);
    shimmerLfo.stop(now + shimmerDur);
  };

  const playDailyWinSting = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const notes = [587.33, 698.46, 880];
    const noteSpacing = 0.14;
    const noteDur = 0.2;

    notes.forEach((freq, idx) => {
      const start = now + idx * noteSpacing;
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      const harmonic = ctx.createOscillator();
      harmonic.type = "sine";
      harmonic.frequency.setValueAtTime(freq * 2, start);
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(3600, start);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.075, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + noteDur);
      osc.connect(lowpass);
      harmonic.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + noteDur);
      harmonic.start(start);
      harmonic.stop(start + noteDur);
    });

    const shimmerDur = 2.1;
    const shimmerBuffer = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * shimmerDur),
      ctx.sampleRate
    );
    const shimmerData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < shimmerData.length; i++) {
      const t = 1 - i / shimmerData.length;
      shimmerData[i] = (Math.random() * 2 - 1) * t;
    }
    const shimmerSrc = ctx.createBufferSource();
    shimmerSrc.buffer = shimmerBuffer;
    const shimmerHigh = ctx.createBiquadFilter();
    shimmerHigh.type = "highpass";
    shimmerHigh.frequency.setValueAtTime(1400, now);
    const shimmerLow = ctx.createBiquadFilter();
    shimmerLow.type = "lowpass";
    shimmerLow.frequency.setValueAtTime(5200, now);
    const shimmerBand = ctx.createBiquadFilter();
    shimmerBand.type = "bandpass";
    shimmerBand.frequency.setValueAtTime(2600, now);
    shimmerBand.Q.setValueAtTime(0.5, now);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.03, now + 0.2);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + shimmerDur);
    const shimmerLfo = ctx.createOscillator();
    shimmerLfo.type = "sine";
    shimmerLfo.frequency.setValueAtTime(5.5, now);
    const shimmerLfoGain = ctx.createGain();
    shimmerLfoGain.gain.setValueAtTime(0.006, now);
    shimmerLfo.connect(shimmerLfoGain);
    shimmerLfoGain.connect(shimmerGain.gain);
    shimmerSrc.connect(shimmerHigh);
    shimmerHigh.connect(shimmerBand);
    shimmerBand.connect(shimmerLow);
    shimmerLow.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerSrc.start(now + 0.08);
    shimmerSrc.stop(now + shimmerDur);
    shimmerLfo.start(now + 0.08);
    shimmerLfo.stop(now + shimmerDur);
  };

  const totalRaces = useMemo(() => {
    if (!gameMode) return 0;
    return gameMode === "half" ? 4 : 8;
  }, [gameMode]);

  const addLog = (_entry: string) => {};

  const initialiseHorses = () =>
    laneNumbers.map((lane) => ({
      number: lane,
      position: 0,
      scratched: false,
      scratchStep: undefined,
    }));

  const buildFinalStandings = useCallback((playersSnapshot: Player[]) => {
    const eliminatedById = new Map(
      playersSnapshot.map((player) => [player.id, !!player.eliminated])
    );
    return [...playersSnapshot]
      .sort((a, b) => {
        const aEliminated = !!a.eliminated;
        const bEliminated = !!b.eliminated;
        if (aEliminated !== bEliminated) {
          return aEliminated ? 1 : -1;
        }
        return b.balance - a.balance;
      })
      .reduce<FinalStanding[]>((acc, player, idx) => {
        const balanceCents = Math.round(player.balance * 100);
        const previous = acc[acc.length - 1];
        const isTie =
          previous &&
          Math.round(previous.balance * 100) === balanceCents &&
          (eliminatedById.get(previous.playerId) ?? false) ===
            (player.eliminated ?? false);
        const rank = isTie ? previous.rank : idx + 1;
        acc.push({
          playerId: player.id,
          name: player.name,
          balance: player.balance,
          rank,
        });
        return acc;
      }, []);
  }, []);

  const displayPlayerName = (playerId: number, fallback: string) =>
    playerId === 1 ? "You" : fallback;

  const recordFinalStats = useCallback((playersSnapshot: Player[]) => {
    if (finalStatsRecordedRef.current) return;
    if (!gameMode) return;
    const standings = buildFinalStandings(playersSnapshot);
    const userEntry = standings.find((entry) => entry.playerId === 1);
    const userPlayer = playersSnapshot.find((player) => player.id === 1);
    if (!userEntry || !userPlayer) return;
    finalStatsRecordedRef.current = true;
    const userWon = !userPlayer.eliminated && userEntry.rank === 1;
    setPlayerStats((prev) => ({
      ...prev,
      [gameMode]: {
        wins: prev[gameMode].wins + (userWon ? 1 : 0),
        bestBalance: Math.max(prev[gameMode].bestBalance, userPlayer.balance),
      },
    }));
  }, [buildFinalStandings, gameMode]);

  const applyBailoutIfNeeded = (playersSnapshot: Player[]) => {
    if (!gameMode) return playersSnapshot;
    const amount = gameMode === "full" ? 200 : 100;
    const usedIds: number[] = [];
    let userBailed = false;
    let userName = "";
    let userReason = "";

    const updatedPlayers = playersSnapshot.map((player) => {
      if (player.eliminated) {
        return { ...player, balance: 0, cards: [] };
      }

      let balance = player.balance;
      let eliminated = !!player.eliminated;

      if (balance <= 0 && !bailoutUsedByPlayer[player.id]) {
        balance += amount;
        usedIds.push(player.id);
        if (player.id === 1) {
          userBailed = true;
          userName = player.name;
          userReason =
            BAILOUT_REASONS[Math.floor(Math.random() * BAILOUT_REASONS.length)];
        }
      }

      if (balance <= 0) {
        eliminated = true;
        balance = 0;
      }

      return {
        ...player,
        balance,
        cards: eliminated ? [] : player.cards,
        eliminated,
      };
    });

    if (usedIds.length > 0) {
      setBailoutUsedByPlayer((prev) => {
        const next = { ...prev };
        usedIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
    }

    if (userBailed) {
      setBailoutPopup({
        playerName: userName,
        amount,
        reason: userReason,
      });
    }

    return updatedPlayers;
  };

  const createListingId = () => {
    listingCounterRef.current += 1;
    return `listing-${listingCounterRef.current}`;
  };
  const commitTradeSession = (session: TradeSession) => {
    tradeStateRef.current = session;
    setPlayers(session.players);
    setTradeListings(session.listings);
    setTradeBuyCounts(session.buyCounts);
    setTradeSellCounts(session.sellCounts);
  };
  const resetTradeSession = (playersSnapshot: Player[]) => {
    commitTradeSession(createTradeSession(playersSnapshot, [], {}, {}));
    setTradeSecondsLeft(0);
    setShowTradeModal(false);
  };
  const clearPendingGameTimers = useCallback(() => {
    if (rollTimeoutRef.current) {
      window.clearTimeout(rollTimeoutRef.current);
      rollTimeoutRef.current = null;
    }
    if (summaryTimeoutRef.current) {
      window.clearTimeout(summaryTimeoutRef.current);
      summaryTimeoutRef.current = null;
    }
    if (summaryDelayRef.current) {
      window.clearTimeout(summaryDelayRef.current);
      summaryDelayRef.current = null;
    }
    if (confettiTimeoutRef.current) {
      window.clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = null;
    }
    if (aiRollTimeoutRef.current) {
      window.clearTimeout(aiRollTimeoutRef.current);
      aiRollTimeoutRef.current = null;
    }
    if (tradeTimeoutRef.current) {
      window.clearTimeout(tradeTimeoutRef.current);
      tradeTimeoutRef.current = null;
    }
    if (tradeIntervalRef.current) {
      window.clearInterval(tradeIntervalRef.current);
      tradeIntervalRef.current = null;
    }
    if (tradeAiTimeoutRef.current) {
      window.clearTimeout(tradeAiTimeoutRef.current);
      tradeAiTimeoutRef.current = null;
    }
    if (tradeDelayRef.current) {
      window.clearTimeout(tradeDelayRef.current);
      tradeDelayRef.current = null;
    }
    if (tradeAiDelayRef.current) {
      window.clearTimeout(tradeAiDelayRef.current);
      tradeAiDelayRef.current = null;
    }
    tradeEndsAtRef.current = null;
    setTradeSecondsLeft(0);
    setShowTradeModal(false);
    setIsRolling(false);
    setShowConfetti(false);
  }, []);

  const openTradeMarket = (playersSnapshot: Player[]) => {
    if (tradeIntervalRef.current) {
      window.clearInterval(tradeIntervalRef.current);
      tradeIntervalRef.current = null;
    }
    if (tradeTimeoutRef.current) {
      window.clearTimeout(tradeTimeoutRef.current);
      tradeTimeoutRef.current = null;
    }
    if (tradeDelayRef.current) {
      window.clearTimeout(tradeDelayRef.current);
      tradeDelayRef.current = null;
    }
    if (tradeAiDelayRef.current) {
      window.clearTimeout(tradeAiDelayRef.current);
      tradeAiDelayRef.current = null;
    }
    const tradeDurationMs = 35000;
    tradeEndsAtRef.current = Date.now() + tradeDurationMs;
    setTradeSecondsLeft(Math.ceil(tradeDurationMs / 1000));
    const { session: initialSession } = createAiListings(
      createTradeSession(playersSnapshot, [], {}, {}),
      {
        createListingId,
      }
    );
    setShowTradeModal(true);
    commitTradeSession(initialSession);
    setPhase("trade");
    addLog("Scratch phase complete. Trading window is open.");
    tradeIntervalRef.current = window.setInterval(() => {
      if (!tradeEndsAtRef.current) return;
      const nextSeconds = Math.max(
        0,
        Math.ceil((tradeEndsAtRef.current - Date.now()) / 1000)
      );
      setTradeSecondsLeft(nextSeconds);
    }, 250);
    if (tradeAiTimeoutRef.current) {
      window.clearTimeout(tradeAiTimeoutRef.current);
      tradeAiTimeoutRef.current = null;
    }
    const scheduleAiPurchase = () => {
      if (!tradeEndsAtRef.current) return;
      const delayMs = 1000 + Math.random() * 3500;
      tradeAiTimeoutRef.current = window.setTimeout(() => {
        tradeAiTimeoutRef.current = null;
        if (!tradeEndsAtRef.current) return;
        const snapshot = tradeStateRef.current;
        const aiPass = applyAiPurchases(snapshot, {
          listingPrice: LISTING_PRICE,
          maxTradesPerPlayer: MAX_TRADES_PER_PLAYER,
          maxTransactions: 1,
        });
        if (aiPass.changed) {
          const finalPlayers = applyBailoutIfNeeded(aiPass.session.players);
          const eliminatedIds = new Set(
            finalPlayers.filter((player) => player.eliminated).map((player) => player.id)
          );
          const finalListings =
            eliminatedIds.size === 0
              ? aiPass.session.listings
              : aiPass.session.listings.filter(
                  (listing) => !eliminatedIds.has(listing.sellerId)
                );
          commitTradeSession({
            ...aiPass.session,
            players: finalPlayers,
            listings: finalListings,
          });
        }
        scheduleAiPurchase();
      }, delayMs);
    };
    tradeAiDelayRef.current = window.setTimeout(() => {
      tradeAiDelayRef.current = null;
      scheduleAiPurchase();
    }, 13500);
    tradeTimeoutRef.current = window.setTimeout(() => {
      tradeTimeoutRef.current = null;
      closeTradeMarket();
    }, 35000);
  };

  const scheduleTradeMarket = (playersSnapshot: Player[]) => {
    if (tradeDelayRef.current) {
      window.clearTimeout(tradeDelayRef.current);
    }
    setPhase("trade");
    setShowTradeModal(false);
    setTradeSecondsLeft(0);
    tradeDelayRef.current = window.setTimeout(() => {
      tradeDelayRef.current = null;
      openTradeMarket(playersSnapshot);
    }, 1500);
  };

  const closeTradeMarket = () => {
    if (tradeIntervalRef.current) {
      window.clearInterval(tradeIntervalRef.current);
      tradeIntervalRef.current = null;
    }
    if (tradeAiTimeoutRef.current) {
      window.clearTimeout(tradeAiTimeoutRef.current);
      tradeAiTimeoutRef.current = null;
    }
    if (tradeAiDelayRef.current) {
      window.clearTimeout(tradeAiDelayRef.current);
      tradeAiDelayRef.current = null;
    }
    if (tradeTimeoutRef.current) {
      window.clearTimeout(tradeTimeoutRef.current);
      tradeTimeoutRef.current = null;
    }
    if (tradeDelayRef.current) {
      window.clearTimeout(tradeDelayRef.current);
      tradeDelayRef.current = null;
    }
    tradeEndsAtRef.current = null;
    setTradeSecondsLeft(0);
    setShowTradeModal(false);
    const closedSession = closeTradeSession(tradeStateRef.current);
    commitTradeSession(closedSession.session);
    setPhase("race");
    addLog("Trading closed. The race is on.");
  };

  const startGame = (mode: "half" | "full") => {
    const startingBalance = mode === "half" ? 350 : 700;
    const basePlayers: Player[] = Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: PLAYER_NAMES[i] ?? `Player ${i + 1}`,
      balance: startingBalance,
      cards: [],
      eliminated: false,
    }));

    const shuffledDeck = shuffleDeck(createDeck());
    const hands = dealHands(shuffledDeck, basePlayers.length);
    const playersWithCards = basePlayers.map((player, idx) => ({
      ...player,
      cards: hands[idx],
    }));

    resetTradeSession(playersWithCards);
    setHorses(initialiseHorses());
    setGameMode(mode);
    setCurrentRace(1);
    setGameStarted(true);
    setPhase("scratch");
    setCurrentPlayerIndex(0);
    setDiceRoll({ die1: 1, die2: 1, total: 2 });
    setDieRotations([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    setIsRolling(false);
    setRaceSummary(null);
    setFinalStandings([]);
    setShowFinalSummary(false);
    setBailoutUsedByPlayer({});
    setBailoutPopup(null);
    finalStatsRecordedRef.current = false;
    lastRollByUserRef.current = false;
    listingCounterRef.current = 0;
    clearPendingGameTimers();
    setPot(0);
    setScratchHistory([]);
    setWinner(null);
    addLog(
      `Race 1 has begun. ${playersWithCards[0].name} starts the scratch phase.`
    );
  };

  const resetGame = () => {
    setGameStarted(false);
    resetTradeSession([]);
    setGameMode(null);
    setCurrentRace(1);
    setHorses([]);
    setPhase(null);
    setCurrentPlayerIndex(0);
    setDiceRoll({ die1: 1, die2: 1, total: 2 });
    setDieRotations([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    setIsRolling(false);
    setDieRotations([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
    setIsRolling(false);
    setRaceSummary(null);
    setFinalStandings([]);
    setShowFinalSummary(false);
    setBailoutUsedByPlayer({});
    setBailoutPopup(null);
    finalStatsRecordedRef.current = false;
    lastRollByUserRef.current = false;
    listingCounterRef.current = 0;
    clearPendingGameTimers();
    setPot(0);
    setScratchHistory([]);
    setWinner(null);
  };

  const getNextActiveIndex = useCallback(
    (startIndex: number) => {
      if (players.length === 0) return startIndex;
      for (let offset = 1; offset <= players.length; offset += 1) {
        const idx = (startIndex + offset) % players.length;
        if (!players[idx].eliminated) return idx;
      }
      return startIndex;
    },
    [players]
  );

  const advanceTurn = () => {
    if (players.length === 0) return;
    setCurrentPlayerIndex((prev) => getNextActiveIndex(prev));
  };

  const handleScratchRoll = (total: number) => {
    const horseNumber = total;
    const horseLabel = horseLabelByNumber[horseNumber];
    const horse = horses.find((h) => h.number === horseNumber);
    if (!horse) return;

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.eliminated) {
      advanceTurn();
      return;
    }

    if (horse.scratched) {
      const penalty = scratchPenaltyByStep[horse.scratchStep ?? 1] ?? 0;
      if (penalty > 0) {
        const updatedPlayers = players.map((player, idx) =>
          idx === currentPlayerIndex
            ? { ...player, balance: player.balance - penalty }
            : player
        );
        setPlayers(applyBailoutIfNeeded(updatedPlayers));
        setPot((prev) => prev + penalty);
        addLog(
          `${currentPlayer.name} rolled ${horseLabel} again and paid $${penalty}.`
        );
      } else {
        addLog(`${currentPlayer.name} rolled ${horseLabel} with no penalty.`);
      }
      advanceTurn();
      return;
    }

    const newScratchStep = scratchHistory.length + 1;
    const penalty = scratchPenaltyByStep[newScratchStep];
    let potIncrease = 0;

    const updatedPlayers = players.map((player) => {
      const matchingCards = player.cards.filter((card) => card.value === horseNumber);
      if (matchingCards.length === 0) {
        return player;
      }
      const amountOwed = penalty * matchingCards.length;
      potIncrease += amountOwed;
      return {
        ...player,
        balance: player.balance - amountOwed,
        cards: player.cards.filter((card) => card.value !== horseNumber),
      };
    });

    if (potIncrease > 0) {
      setPot((prev) => prev + potIncrease);
    }
    const nextPlayers = applyBailoutIfNeeded(updatedPlayers);
    setHorses((prev) =>
      prev.map((h) =>
        h.number === horseNumber
          ? { ...h, scratched: true, scratchStep: newScratchStep }
          : h
      )
    );
    setScratchHistory((prev) => [...prev, horseNumber]);
    playPegPop();

    addLog(
      `${currentPlayer.name} scratched horse ${horseLabel}. Everyone paid $${penalty} per card.`
    );

    if (newScratchStep >= 4) {
      setPlayers(nextPlayers);
      scheduleTradeMarket(nextPlayers);
    } else {
      setPlayers(nextPlayers);
    }

    advanceTurn();
  };

  const handlePayout = (winningHorse: number) => {
    const playersSnapshot = players;
    const winningCards = playersSnapshot.map((player) =>
      player.cards.filter((card) => card.value === winningHorse)
    );
    const totalWinningCards = winningCards.reduce(
      (sum, cards) => sum + cards.length,
      0
    );

    const scheduleRaceSummary = (summary: RaceSummary) => {
      if (summaryDelayRef.current) {
        window.clearTimeout(summaryDelayRef.current);
      }
      summaryDelayRef.current = window.setTimeout(() => {
        setRaceSummary(summary);
        summaryDelayRef.current = null;
      }, 1500);
    };

    const potSnapshot = pot;
    const isFinalRace = currentRace >= totalRaces;
    if (totalWinningCards === 0) {
      addLog("No one held the winning horse. The pot carries over.");
      scheduleRaceSummary({
        winner: winningHorse,
        pot: potSnapshot,
        carryover: true,
        payouts: [],
      });
      if (isFinalRace) {
        setFinalStandings(buildFinalStandings(playersSnapshot));
        recordFinalStats(playersSnapshot);
      }
      return;
    }

    const payoutPerCard = potSnapshot / totalWinningCards;
    const updatedPlayers = playersSnapshot.map((player) => {
      const matches = player.cards.filter((card) => card.value === winningHorse);
      if (matches.length === 0) {
        return player;
      }
      const payout = payoutPerCard * matches.length;
      return {
        ...player,
        balance: player.balance + payout,
      };
    });

    setPlayers(updatedPlayers);
    setPot(0);
    if (isFinalRace) {
      setFinalStandings(buildFinalStandings(updatedPlayers));
      recordFinalStats(updatedPlayers);
    }

    const payouts = playersSnapshot
      .map((player) => {
        const matches = player.cards.filter((card) => card.value === winningHorse);
        if (matches.length === 0) return null;
        return {
          playerId: player.id,
          name: player.name,
          amount: payoutPerCard * matches.length,
          cards: matches.length,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    scheduleRaceSummary({
      winner: winningHorse,
      pot: potSnapshot,
      carryover: false,
      payouts,
    });

    winningCards.forEach((cards, idx) => {
      if (cards.length === 0) return;
      const payout = payoutPerCard * cards.length;
      addLog(
        `${playersSnapshot[idx].name} collected $${payout.toFixed(2)} with ${cards.length} card${
          cards.length > 1 ? "s" : ""
        }.`
      );
    });
  };

  const handleRaceRoll = (total: number) => {
    const horseNumber = total;
    const horseLabel = horseLabelByNumber[horseNumber];
    const horse = horses.find((h) => h.number === horseNumber);
    if (!horse) return;

    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer || currentPlayer.eliminated) {
      advanceTurn();
      return;
    }

    if (horse.scratched) {
      const penalty = scratchPenaltyByStep[horse.scratchStep ?? 1] ?? 0;
      if (penalty > 0) {
        const updatedPlayers = players.map((player, idx) =>
          idx === currentPlayerIndex
            ? { ...player, balance: player.balance - penalty }
            : player
        );
        setPlayers(applyBailoutIfNeeded(updatedPlayers));
        setPot((prev) => prev + penalty);
        addLog(
          `${currentPlayer.name} hit scratched horse ${horseLabel} and paid $${penalty}.`
        );
      } else {
        addLog(
          `${currentPlayer.name} hit scratched horse ${horseLabel} but no penalty was applied.`
        );
      }
      advanceTurn();
      return;
    }

    const maxSpaces = pegDistribution[horseNumber] + 1;
    const nextPosition = Math.min(maxSpaces, horse.position + 1);
    const updatedHorses = horses.map((h) =>
      h.number === horseNumber ? { ...h, position: nextPosition } : h
    );
    setHorses(updatedHorses);
    if (nextPosition !== horse.position) {
      playPegPop();
    }

    const movedHorse = updatedHorses.find((h) => h.number === horseNumber);
    if (!movedHorse) return;

    if (movedHorse.position >= maxSpaces) {
      setPhase("finished");
      setWinner(horseNumber);
      setShowConfetti(true);
      setConfettiSeed((prev) => prev + 1);
      playVictoryConfetti();
      if (confettiTimeoutRef.current) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
      confettiTimeoutRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimeoutRef.current = null;
      }, 2100);
      addLog(`Horse ${horseLabel} crosses the finish line!`);
      handlePayout(horseNumber);
    } else {
      addLog(
        `${currentPlayer.name} advanced horse ${horseLabel} to space ${movedHorse.position}.`
      );
      advanceTurn();
    }
  };

  const handleRoll = () => {
    if (
      !phase ||
      phase === "finished" ||
      phase === "trade" ||
      players.length === 0 ||
      isRolling
    )
      return;
    lastRollByUserRef.current = isUserTurn;
    if (isUserTurn) {
      playDiceRoll();
    }
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    setDiceRoll({ die1, die2, total });
    setDieRotations([
      {
        x: DICE_ROTATIONS[die1][0] + 360 * (2 + Math.floor(Math.random() * 3)),
        y: DICE_ROTATIONS[die1][1] + 360 * (2 + Math.floor(Math.random() * 3)),
      },
      {
        x: DICE_ROTATIONS[die2][0] + 360 * (2 + Math.floor(Math.random() * 3)),
        y: DICE_ROTATIONS[die2][1] + 360 * (2 + Math.floor(Math.random() * 3)),
      },
    ]);
    setIsRolling(true);
    if (rollTimeoutRef.current) {
      window.clearTimeout(rollTimeoutRef.current);
    }
    rollTimeoutRef.current = window.setTimeout(() => {
      setIsRolling(false);
      rollTimeoutRef.current = null;
    }, 800);

    if (phase === "scratch") {
      handleScratchRoll(total);
    } else if (phase === "race") {
      handleRaceRoll(total);
    }
  };

  const handleNextRace = () => {
    if (!gameMode) return;
    const total = gameMode === "half" ? 4 : 8;
    if (currentRace >= total) return;

    const shuffledDeck = shuffleDeck(createDeck());
    const nextRaceNumber = currentRace + 1;
    const activeIndices = players
      .map((player, idx) => (!player.eliminated ? idx : null))
      .filter((idx): idx is number => idx !== null);
    const activePlayers = activeIndices.map((idx) => players[idx]);
    const hands =
      activePlayers.length > 0 ? dealHands(shuffledDeck, activePlayers.length) : [];
    let activeCursor = 0;
    const updatedPlayers = players.map((player) => {
      if (player.eliminated) {
        return { ...player, cards: [] };
      }
      const nextCards = hands[activeCursor] ?? [];
      activeCursor += 1;
      return { ...player, cards: nextCards };
    });
    const startingIndex =
      activeIndices.length > 0
        ? activeIndices[(nextRaceNumber - 1) % activeIndices.length]
        : 0;

    resetTradeSession(updatedPlayers);
    setHorses(initialiseHorses());
    setScratchHistory([]);
    setPot(0);
    setDiceRoll(null);
    setRaceSummary(null);
    setFinalStandings([]);
    setShowFinalSummary(false);
    lastRollByUserRef.current = false;
    clearPendingGameTimers();
    lastRollByUserRef.current = false;
    setWinner(null);
    setPhase("scratch");
    setCurrentRace(nextRaceNumber);
    setCurrentPlayerIndex(startingIndex);
    addLog(
      `Race ${nextRaceNumber} has begun. ${updatedPlayers[startingIndex].name} starts the scratch phase.`
    );
  };

  const handleListCardForSale = (card: Card) => {
    if (phase !== "trade") return;
    const session = tradeStateRef.current;
    const seller = session.players.find((player) => player.id === 1);
    if (!seller || seller.eliminated) return;
    const soldCount = session.sellCounts[seller.id] ?? 0;
    const activeListings = session.listings.filter(
      (listing) => listing.sellerId === seller.id
    ).length;
    if (soldCount + activeListings >= MAX_TRADES_PER_PLAYER) return;
    const result = appendTradeListing(
      session,
      seller.id,
      card,
      createListingId()
    );
    if (!result.changed) return;
    commitTradeSession(result.session);
  };

  const handleCancelListing = (listingId: string) => {
    const result = cancelTradeListing(tradeStateRef.current, listingId);
    if (!result.changed) return;
    commitTradeSession(result.session);
  };

  const handleBuyListing = (listingId: string) => {
    const session = tradeStateRef.current;
    const listing = session.listings.find((entry) => entry.id === listingId);
    if (!listing || listing.sellerId === 1) return;
    const buyer = session.players.find((player) => player.id === 1);
    if (!buyer || buyer.eliminated || buyer.balance < LISTING_PRICE) return;
    const result = buyTradeListing(session, listingId, {
      buyerId: buyer.id,
      listingPrice: LISTING_PRICE,
      maxTradesPerPlayer: MAX_TRADES_PER_PLAYER,
    });
    if (!result.changed) return;
    const nextPlayers = applyBailoutIfNeeded(result.session.players);
    const eliminatedIds = new Set(
      nextPlayers.filter((player) => player.eliminated).map((player) => player.id)
    );
    const nextListings =
      eliminatedIds.size === 0
        ? result.session.listings
        : result.session.listings.filter(
            (entry) => !eliminatedIds.has(entry.sellerId)
          );
    commitTradeSession({
      ...result.session,
      players: nextPlayers,
      listings: nextListings,
    });
  };

  handleRollRef.current = handleRoll;
  handleNextRaceRef.current = handleNextRace;

  const currentPlayer = players[currentPlayerIndex];
  const userPlayer = players.find((player) => player.id === 1) ?? players[0];
  const isUserTurn = currentPlayerIndex === 0 && !userPlayer?.eliminated;
  const isCurrentPlayerActive = currentPlayer ? !currentPlayer.eliminated : false;
  const dieOneValue = diceRoll?.die1 ?? 1;
  const dieTwoValue = diceRoll?.die2 ?? 1;
  const canRoll = (phase === "scratch" || phase === "race") && isUserTurn && !isRolling;
  const rollTotal = dieOneValue + dieTwoValue;
  const currentPlayerCards = userPlayer?.cards ?? [];
  const sidePlayers =
    userPlayer ? players.filter((player) => player.id !== userPlayer.id) : players;
  const leftPlayersCount = Math.floor(sidePlayers.length / 2);
  const leftPlayers = sidePlayers.slice(0, leftPlayersCount);
  const rightPlayers = sidePlayers.slice(leftPlayersCount);
  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, idx) => ({
        id: `${confettiSeed}-${idx}`,
        left: `${(idx * 13) % 100}%`,
        delay: `${(idx % 7) * 0.08}s`,
        duration: `${1.1 + (idx % 5) * 0.12}s`,
        rotate: `${(idx * 37) % 360}deg`,
      })),
    [confettiSeed]
  );
  const isUserEliminated = !!userPlayer?.eliminated;
  const userBuyCount = tradeBuyCounts[userPlayer?.id ?? 1] ?? 0;
  const userSellCount = tradeSellCounts[userPlayer?.id ?? 1] ?? 0;
  const userActiveListings = tradeListings.filter(
    (listing) => listing.sellerId === (userPlayer?.id ?? 1)
  ).length;
  const userBuysLeft = isUserEliminated
    ? 0
    : Math.max(MAX_TRADES_PER_PLAYER - userBuyCount, 0);
  const userSellsLeft = isUserEliminated
    ? 0
    : Math.max(MAX_TRADES_PER_PLAYER - (userSellCount + userActiveListings), 0);
  const showTradeOverlay = phase === "trade" && showTradeModal;
  const renderCards = (cards: Card[]) =>
    sortCardsByValue(cards).map((card, idx) => (
      <div
        key={`${card.value}-${card.suit}-${idx}`}
        className="bg-white px-2 py-1 rounded shadow text-xs font-semibold"
        style={{
          color:
            card.suit === "♥" || card.suit === "♦"
              ? "#dc2626"
              : "#111827",
        }}
      >
        {formatCard(card)}
      </div>
    ));
  const renderTradePanel = (mobile: boolean) => (
    <div
      className={
        mobile
          ? "mobile-trade-panel flex h-full w-full max-h-none flex-col overflow-hidden bg-[#f4e7cd] text-green-900 px-4 py-4"
          : "flex w-full max-w-[920px] flex-col rounded-2xl bg-[#f4e7cd] text-green-900 shadow-2xl border border-green-900/20 px-6 py-6"
      }
    >
      <div
        className={
          mobile
            ? "flex flex-col gap-3"
            : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        }
      >
        <div>
          <h3 className="text-xl font-bold uppercase tracking-wide">Trading Window</h3>
          <p className="hidden md:block text-sm text-green-900/70">
            List any card for ${LISTING_PRICE}. Buy any listed card for ${LISTING_PRICE}.
          </p>
          <p className="text-xs text-green-900/60 mt-1">
            Auto-starts in {tradeSecondsLeft}s.
          </p>
        </div>
        <div
          className={`text-sm font-semibold text-green-900/80 ${
            mobile ? "" : "text-right"
          }`}
        >
          <div>Your balance: ${userPlayer?.balance.toFixed(2) ?? "0.00"}</div>
          <div className="text-xs font-semibold text-green-900/60">
            Buys left: {userBuysLeft} · Sells left: {userSellsLeft}
          </div>
          {isUserEliminated && (
            <div className="text-xs font-semibold text-red-400">You are eliminated.</div>
          )}
        </div>
      </div>

      <div
        className={
          mobile
            ? "mt-4 flex items-center justify-center gap-2"
            : "mt-4 md:mt-6 flex md:hidden items-center justify-center gap-2"
        }
      >
        <button
          type="button"
          onClick={() => setTradeTab("buy")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
            tradeTab === "buy"
              ? "bg-green-900 text-[#f4e7cd] border-green-900"
              : "bg-white/70 text-green-900 border-green-900/20"
          }`}
          aria-pressed={tradeTab === "buy"}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setTradeTab("sell")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
            tradeTab === "sell"
              ? "bg-green-900 text-[#f4e7cd] border-green-900"
              : "bg-white/70 text-green-900 border-green-900/20"
          }`}
          aria-pressed={tradeTab === "sell"}
        >
          Sell
        </button>
      </div>

      <div className={mobile ? "mt-4 flex min-h-0 flex-1 flex-col" : "mt-6 grid grid-cols-1 md:grid-cols-2 gap-6"}>
        <div
          className={
            mobile
              ? tradeTab === "buy"
                ? "flex h-full min-h-0 flex-col"
                : "hidden"
              : tradeTab === "buy"
              ? "block"
              : "hidden md:block"
          }
        >
          <h4 className="text-sm font-bold uppercase tracking-widest text-green-900/60 mb-2">
            Market Listings
          </h4>
          <div
            className={`pr-1 ${
              mobile
                ? "trade-panel-scroll min-h-0 flex-1 space-y-2"
                : "max-h-[320px] overflow-auto space-y-2"
            }`}
          >
            {tradeListings.length === 0 ? (
              <p className="text-sm text-green-900/70">No cards are listed yet.</p>
            ) : (
              tradeListings.map((listing) => {
                const seller =
                  players.find((player) => player.id === listing.sellerId)?.name ?? "Unknown";
                const isUserListing = listing.sellerId === 1;
                const canBuy =
                  !isUserListing &&
                  (userPlayer?.balance ?? 0) >= LISTING_PRICE &&
                  userBuysLeft > 0;
                return (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 border border-green-900/10"
                  >
                    <div>
                      <p className="text-sm font-semibold">{formatCard(listing.card)}</p>
                      <p className="text-xs text-green-900/60">
                        Seller: {isUserListing ? "You" : seller}
                      </p>
                    </div>
                    {isUserListing ? (
                      <button
                        onClick={() => handleCancelListing(listing.id)}
                        aria-label={`Cancel ${formatCard(listing.card)}`}
                        className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/10 text-green-900 hover:bg-green-900/20"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyListing(listing.id)}
                        aria-label={`Buy ${formatCard(listing.card)} for $${LISTING_PRICE}`}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          canBuy
                            ? "bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                        disabled={!canBuy}
                      >
                        Buy ${LISTING_PRICE}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className={
            mobile
              ? tradeTab === "sell"
                ? "flex h-full min-h-0 flex-col"
                : "hidden"
              : tradeTab === "sell"
              ? "block"
              : "hidden md:block"
          }
        >
          <h4 className="text-sm font-bold uppercase tracking-widest text-green-900/60 mb-2">
            Your Cards
          </h4>
          <div
            className={`pr-1 ${
              mobile
                ? "trade-panel-scroll min-h-0 flex-1 space-y-2"
                : "max-h-[320px] overflow-auto space-y-2"
            }`}
          >
            {currentPlayerCards.length === 0 ? (
              <p className="text-sm text-green-900/70">You have no cards to list.</p>
            ) : (
              sortCardsByValue(currentPlayerCards).map((card, idx) => (
                <div
                  key={`${card.value}-${card.suit}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 border border-green-900/10"
                >
                  <span className="text-sm font-semibold">{formatCard(card)}</span>
                  <button
                    onClick={() => handleListCardForSale(card)}
                    aria-label={`List ${formatCard(card)} for $${LISTING_PRICE}`}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      userSellsLeft > 0
                        ? "bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={userSellsLeft === 0}
                  >
                    List ${LISTING_PRICE}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className={
          mobile
            ? "mt-4 flex justify-end"
            : "mt-6 flex flex-col sm:flex-row justify-end gap-3"
        }
      >
        <button
          onClick={closeTradeMarket}
          className="px-4 py-2 rounded-lg font-semibold bg-green-900 text-[#f4e7cd] hover:bg-green-800"
        >
          Start Race
        </button>
      </div>
    </div>
  );
  useTotalEliminationGuard({
    gameStarted,
    phase,
    winner,
    players,
    clearPendingGameTimers,
    buildFinalStandings,
    recordFinalStats,
    setRaceSummary,
    setPhase,
    setFinalStandings,
    setShowFinalSummary,
  });

  useEffect(() => {
    if (!players.length) return;
    if (players[currentPlayerIndex]?.eliminated) {
      const nextIndex = getNextActiveIndex(currentPlayerIndex);
      if (nextIndex !== currentPlayerIndex) {
        setCurrentPlayerIndex(nextIndex);
      }
    }
  }, [players, currentPlayerIndex, getNextActiveIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipNextStatsPersistRef.current) {
      skipNextStatsPersistRef.current = false;
      return;
    }
    safeWriteStatsEnvelope(STATS_STORAGE_KEY, playerStats);
  }, [playerStats]);

  const resetPlayerStats = useCallback(() => {
    skipNextStatsPersistRef.current = true;
    safeRemoveJson(STATS_STORAGE_KEY);
    setPlayerStats(EMPTY_STATS);
  }, []);

  useEffect(() => {
    if (phase === "trade" && showTradeModal) {
      setTradeTab(isMobile ? "sell" : "buy");
    }
  }, [phase, showTradeModal, isMobile]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const shouldLock = phase === "trade" || (gameStarted && isMobile);
    if (!shouldLock) return;
    const releaseScrollLock = acquireScrollLock();
    return () => {
      releaseScrollLock();
    };
  }, [phase, gameStarted, isMobile]);

  useEffect(() => {
    const appRoot = appRootRef.current;
    if (!appRoot) return;
    if (!gameStarted) {
      appRoot.style.setProperty("--hud-h", "0px");
      return;
    }
    const hudElement = hudRef.current;
    if (!hudElement) return;

    const updateHudHeight = () => {
      if (!appRootRef.current || !hudRef.current) return;
      const height = hudRef.current.getBoundingClientRect().height;
      appRootRef.current.style.setProperty(
        "--hud-h",
        `${Math.ceil(height)}px`
      );
    };

    updateHudHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHudHeight);
      return () => {
        window.removeEventListener("resize", updateHudHeight);
      };
    }

    const observer = new ResizeObserver(updateHudHeight);
    observer.observe(hudElement);
    return () => {
      observer.disconnect();
    };
  }, [gameStarted, isMobile]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) {
        window.clearTimeout(rollTimeoutRef.current);
      }
      if (summaryTimeoutRef.current) {
        window.clearTimeout(summaryTimeoutRef.current);
      }
      if (summaryDelayRef.current) {
        window.clearTimeout(summaryDelayRef.current);
      }
      if (confettiTimeoutRef.current) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
      if (aiRollTimeoutRef.current) {
        window.clearTimeout(aiRollTimeoutRef.current);
      }
      if (tradeTimeoutRef.current) {
        window.clearTimeout(tradeTimeoutRef.current);
      }
      if (tradeIntervalRef.current) {
        window.clearInterval(tradeIntervalRef.current);
      }
      if (tradeAiTimeoutRef.current) {
        window.clearTimeout(tradeAiTimeoutRef.current);
      }
      if (tradeDelayRef.current) {
        window.clearTimeout(tradeDelayRef.current);
      }
      if (tradeAiDelayRef.current) {
        window.clearTimeout(tradeAiDelayRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canAutoRoll =
      (phase === "scratch" || phase === "race") &&
      players.length > 0 &&
      !isRolling &&
      !isUserTurn &&
      isCurrentPlayerActive;

    if (!canAutoRoll) {
      if (aiRollTimeoutRef.current) {
        window.clearTimeout(aiRollTimeoutRef.current);
        aiRollTimeoutRef.current = null;
      }
      return;
    }

    if (aiRollTimeoutRef.current) return;
    const rollDelay = lastRollByUserRef.current ? 1500 : 800;
    aiRollTimeoutRef.current = window.setTimeout(() => {
      aiRollTimeoutRef.current = null;
      handleRollRef.current();
    }, rollDelay);
    lastRollByUserRef.current = false;

    return () => {
      if (aiRollTimeoutRef.current) {
        window.clearTimeout(aiRollTimeoutRef.current);
        aiRollTimeoutRef.current = null;
      }
    };
  }, [phase, players.length, isRolling, isUserTurn, isCurrentPlayerActive]);

  useEffect(() => {
    if (!raceSummary) return;
    if (summaryTimeoutRef.current) {
      window.clearTimeout(summaryTimeoutRef.current);
    }
    summaryTimeoutRef.current = window.setTimeout(() => {
      if (currentRace < totalRaces) {
        handleNextRaceRef.current();
      } else {
        setRaceSummary(null);
        setShowFinalSummary(true);
      }
      summaryTimeoutRef.current = null;
    }, 10000);
  }, [raceSummary, currentRace, totalRaces]);

  return (
    <div
      ref={appRootRef}
      style={
        {
          "--hud-h": "144px",
          overflowY: !gameStarted && openHomePanel && isMobile ? "auto" : "hidden",
          WebkitOverflowScrolling:
            !gameStarted && openHomePanel && isMobile ? "touch" : undefined,
        } as React.CSSProperties
      }
      className={`relative flex flex-col items-center h-[100dvh] min-h-[100vh] overflow-hidden text-white ${
        gameStarted ? "justify-center bg-[#e7d7b8]" : "justify-start pt-0 home-screen"
      }`}
    >
      {!gameStarted ? (
        <div
          className="w-full flex flex-col text-center"
          style={
            !gameStarted && openHomePanel && isMobile
              ? { paddingBottom: "48px" }
              : undefined
          }
        >
          <div
            className="w-full py-3 flex justify-center"
            style={{
              backgroundColor: "#1f6f4a",
            }}
          >
            <div
              className="text-[#f2e2c9] text-2xl sm:text-5xl font-black tracking-wide text-center leading-tight px-2"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.35)" }}
            >
              — HORSE RACING BOARD GAME —
            </div>
          </div>

          <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-6 pt-8 sm:pt-12">
            <div className="w-full max-w-4xl rounded-[28px] bg-[#c59653]/90 text-[#3a2212] px-6 sm:px-12 py-7 sm:py-10 shadow-2xl border border-[#8b5a2b]/50">
              <div className="flex flex-col items-center gap-2">
                <div className="h-px w-40 bg-[#8b5a2b]/40" />
                <h2
                  className="text-2xl sm:text-[2.125rem] font-extrabold uppercase text-red-700"
                  style={{
                    letterSpacing: "0.38em",
                    textShadow: "0 2px 6px rgba(234,88,12,0.35)",
                  }}
                >
                  START GAME
                </h2>
                <div className="h-px w-40 bg-[#8b5a2b]/40" />
              </div>
              <div className="mt-6 sm:mt-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <button
                  onClick={() => startGame("half")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-7 py-4 sm:px-9 sm:py-6 rounded-2xl text-black font-bold text-lg sm:text-xl shadow-md"
                >
                  <span className="block">Half Day (4 Races)</span>
                  <span className="block text-sm sm:text-base font-semibold text-black/70 mt-1">
                    5–10 minutes
                  </span>
                </button>
                <button
                  onClick={() => startGame("full")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-7 py-4 sm:px-9 sm:py-6 rounded-2xl text-black font-bold text-lg sm:text-xl shadow-md"
                >
                  <span className="block">Full Day (8 Races)</span>
                  <span className="block text-sm sm:text-base font-semibold text-black/70 mt-1">
                    15–20 minutes
                  </span>
                </button>
              </div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div className="rounded-2xl bg-[#c59653]/85 text-[#3a2212] px-5 py-3 text-left shadow-lg border border-[#8b5a2b]/40 self-start">
                <button
                  type="button"
                  className="w-full text-left text-sm font-bold uppercase tracking-wide"
                  aria-expanded={openHomePanel === "stats"}
                  onClick={() =>
                    setOpenHomePanel((prev) => (prev === "stats" ? null : "stats"))
                  }
                >
                  Player Stats
                </button>
                {openHomePanel === "stats" && (
                  <div className="mt-3 space-y-3 text-sm font-semibold">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/40 px-3 py-2 border border-[#8b5a2b]/20">
                        <p className="text-xs uppercase tracking-wide text-[#6b4b2a]">
                          Half Day
                        </p>
                        <p>Wins: {playerStats.half.wins}</p>
                        <p>Highest Finish: ${playerStats.half.bestBalance.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl bg-white/40 px-3 py-2 border border-[#8b5a2b]/20">
                        <p className="text-xs uppercase tracking-wide text-[#6b4b2a]">
                          Full Day
                        </p>
                        <p>Wins: {playerStats.full.wins}</p>
                        <p>Highest Finish: ${playerStats.full.bestBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-[#8b5a2b]/30 bg-white/55 px-3 py-1.5 text-xs uppercase tracking-wide text-[#6b4b2a] transition hover:bg-white/70"
                      onClick={resetPlayerStats}
                    >
                      Reset Stats
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-[#d1a55b]/85 text-[#3a2212] px-5 py-3 text-left shadow-lg border border-[#8b5a2b]/40 self-start">
                <button
                  type="button"
                  className="w-full text-left text-sm font-bold uppercase tracking-wide"
                  aria-expanded={openHomePanel === "rules"}
                  onClick={() =>
                    setOpenHomePanel((prev) => (prev === "rules" ? null : "rules"))
                  }
                >
                  Rules
                </button>
                {openHomePanel === "rules" && (
                  <div className="mt-3 space-y-1.5 text-sm md:max-h-[320px] md:overflow-auto md:pr-1">
                    <p>
                      1) Setup: 6 players. Each race, everyone is dealt cards from the
                      2-12 deck (four suits).
                    </p>
                    <p>
                      2) Scratch phase: Roll to scratch 4 horses. Penalties are $5,
                      $10, $15, $20 in order. Anyone holding the scratched horse pays
                      the penalty per card. Rolling a scratched horse again charges
                      the roller the same penalty and adds it to the pot.
                    </p>
                    <p>
                      3) Trading window: After scratches, a market opens for 35
                      seconds. Any player can list a card for $30. Any player can buy
                      any listed card for $30. Each player can buy up to 2 cards and
                      sell up to 2 cards per race. Unsold cards return to their owner
                      when trading closes.
                    </p>
                    <p>
                      4) Race phase: Each roll moves the matching horse forward one
                      peg hole. If you roll a scratched horse, you pay its penalty.
                      The horse must hit every peg hole before moving to the winners
                      peg.
                    </p>
                    <p>
                      5) Pot and payouts: All penalties go into the pot. When a horse
                      wins, the pot is split evenly across winning cards.
                    </p>
                    <p>
                      6) Bailout and elimination: Each player can get a one-time
                      bailout when they hit $0 or below ($100 half day, $200 full
                      day). If they are still at $0 or below after that, they are
                      eliminated, lose their cards, and are last in the rankings.
                    </p>
                    <p>
                      7) Turns: Player 1 (you) rolls on your turns. AI players roll
                      automatically on their turns.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center flex-1 min-h-0 relative isolate pt-[var(--hud-h)] md:pt-0">
          {showConfetti && (
            <div
              className="confetti-container confetti-container--below-hud"
              aria-hidden="true"
              data-testid="confetti-container"
            >
              {confettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="confetti-piece"
                  style={{
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    transform: `rotate(${piece.rotate})`,
                  }}
                />
              ))}
            </div>
          )}
          <div
            ref={hudRef}
            role="region"
            aria-label="Game HUD"
            className="game-hud-layer w-full flex flex-col items-center shrink-0 bg-[#e7d7b8] fixed top-0 left-0 right-0 z-50 md:bg-transparent"
          >
            <div className="w-full px-3 lg:px-0 lg:w-2/3 mt-3 mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                <span className="inline-flex items-center rounded-full bg-green-900/70 px-2.5 py-0 md:px-3 md:py-1 text-yellow-100 shadow border border-green-200/20">
                  Race {currentRace} / {totalRaces}
                </span>
              </h2>
              <p className="inline-flex items-center rounded-full bg-white/15 px-2 py-0 md:px-2.5 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                {phase === "scratch"
                  ? "Scratch Phase — remove four horses from contention"
                    : phase === "trade"
                    ? "Trading Window — buy or sell cards for $30"
                    : phase === "race"
                    ? "Race Phase — move horses toward the finish"
                    : "Race Complete"}
                </p>
              </div>
              <button
                onClick={resetGame}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
              >
                Exit
              </button>
            </div>

            <div className="w-full px-1 sm:px-2 md:px-3 lg:px-0 lg:w-2/3 grid grid-cols-2 gap-1 sm:gap-2 md:gap-3 mb-1 sm:mb-2 md:mb-4 relative z-40 bg-[#e7d7b8] py-0 md:py-2 md:flex md:flex-col lg:flex-row">
              <div className="contents md:flex md:flex-col md:gap-3 md:flex-1">
                <div className="contents md:grid md:grid-cols-2 md:gap-3">
                  <div className="w-full bg-green-900/80 rounded-lg md:rounded-xl px-2 py-0 md:px-4 md:py-1 shadow-sm md:shadow-lg border border-green-300/20">
                    <h3 className="text-sm font-semibold uppercase tracking-wide mb-0 md:mb-1">Current Player</h3>
                    <p className="text-xl font-bold">
                      {currentPlayer
                        ? displayPlayerName(currentPlayer.id, currentPlayer.name)
                        : "-"}
                    </p>
                    {currentPlayer?.eliminated && (
                      <p className="text-xs font-semibold text-red-200">Eliminated</p>
                    )}
                  </div>
                  <div className="w-full bg-green-900/80 rounded-lg md:rounded-xl px-2 py-0 md:px-4 md:py-1 shadow-sm md:shadow-lg border border-green-300/20">
                    <h3 className="text-sm font-semibold uppercase tracking-wide mb-0 md:mb-1">Pot</h3>
                    <p className="text-xl font-bold">${pot.toFixed(2)}</p>
                  </div>
                </div>

                <div className="w-full bg-green-900/60 rounded-xl px-2 py-0 md:px-4 md:py-1 shadow-md border border-green-200/10 min-h-[44px] md:min-h-[70px] max-h-none overflow-visible md:max-h-none md:overflow-visible">
                  <h3 className="text-sm font-semibold uppercase tracking-wide mb-0.5 md:mb-2">Scratched Horses</h3>
                  {scratchHistory.length === 0 ? (
                    <p className="text-xs text-green-100">No horses have been scratched yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {scratchHistory.map((horseNum, idx) => (
                        <span
                          key={`${horseNum}-${idx}`}
                          className="bg-red-600/80 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow"
                        >
                          #{horseLabelByNumber[horseNum]} — ${scratchPenaltyByStep[idx + 1]}{" "}
                          line
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full flex justify-center md:flex-1">
                <div
                className={`dice-panel relative z-20 w-full max-w-none md:max-w-[360px] rounded-lg md:rounded-2xl border border-green-200/20 bg-green-900/85 px-2 py-0 md:px-5 md:py-1 shadow-sm md:shadow-lg ${
                  canRoll ? "cursor-pointer" : "cursor-not-allowed dice-panel-disabled"
                }`}
                role="button"
                aria-label="Roll dice"
                  tabIndex={canRoll ? 0 : -1}
                  onClick={canRoll ? handleRoll : undefined}
                  onKeyDown={(event) => {
                    if (!canRoll) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRoll();
                    }
                  }}
                >
                  <div className="pointer-events-none">
                    <p className="text-sm uppercase tracking-[0.2em] text-green-100/80">
                      Roll Total
                    </p>
                  <p className="text-xl font-bold text-yellow-100 mt-0.5 md:mt-1">
                    {rollTotal ?? "—"}
                  </p>
                  <div className="dice-stage mt-1.5 md:mt-2">
                    <DiceCube
                      value={dieOneValue}
                      rotation={dieRotations[0]}
                      rolling={isRolling}
                        size={60}
                      />
                      <DiceCube
                        value={dieTwoValue}
                        rotation={dieRotations[1]}
                        rolling={isRolling}
                        size={60}
                      />
                    </div>
                  <p className="mt-1 md:mt-1.5 text-xs text-green-100/70">
                    {phase === "trade"
                      ? "Trading in progress"
                        : phase && phase !== "finished"
                        ? isUserTurn
                          ? isRolling
                            ? "Rolling..."
                            : "Click to roll the dice"
                          : "Waiting for AI roll"
                        : "Rolls paused"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 min-h-0 flex justify-center relative z-0 overflow-hidden">
            <div className="game-layout mobile-board-stack w-full h-full min-h-0 px-0 sm:px-3 lg:px-4 flex flex-col lg:grid lg:grid-cols-[180px_minmax(0,1fr)_180px] gap-1 md:gap-3 items-stretch lg:items-start">
              <div className="mobile-board-slot order-1 flex min-h-0 lg:order-2 lg:flex-1">
                <div
                  role="region"
                  aria-label="Race board"
                  className="game-board-region flex w-full items-stretch overflow-hidden rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.18)] lg:flex-1"
                >
                  <BoardSurface horses={horses} mobile={isMobile} />
                </div>
              </div>

              <aside className="order-2 lg:order-1 min-h-0">
                <div className="flex h-full min-h-0 flex-col gap-2 md:gap-3">
                  <div
                    role="region"
                    aria-label="Player card dock"
                    className="player-card-dock shrink-0 bg-green-900/80 px-3 py-2 rounded-xl text-center shadow-lg border border-green-200/20"
                  >
                    <h3 className="font-bold mb-1 text-sm">
                      {currentPlayer ? "Your Cards" : "Player"}
                    </h3>
                    <p className="text-yellow-200 font-semibold mb-2 text-xs">
                      💵 ${userPlayer?.balance.toFixed(2) ?? "0.00"}
                    </p>
                    {userPlayer?.eliminated ? (
                      <p className="text-xs font-semibold text-red-200">Eliminated</p>
                    ) : (
                      <div className="player-card-list mt-2 flex flex-wrap justify-center gap-1 max-h-28 overflow-hidden md:overflow-auto">
                        {currentPlayerCards.length > 0 ? (
                          renderCards(currentPlayerCards)
                        ) : (
                          <p className="italic text-gray-300 text-xs">No cards</p>
                        )}
                      </div>
                    )}
                  </div>
                  {leftPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="hidden md:block bg-green-900/80 px-3 py-2 rounded-xl text-center shadow-lg border border-green-200/20"
                    >
                      <h3 className="font-bold mb-1 text-sm">{player.name}</h3>
                      <p className="text-yellow-200 font-semibold mb-2 text-xs">
                        💵 ${player.balance.toFixed(2)}
                      </p>
                      {player.eliminated ? (
                        <p className="text-xs font-semibold text-red-200">Eliminated</p>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-1 mt-2 max-h-28 overflow-hidden md:overflow-auto">
                          {player.cards.length > 0 ? (
                            renderCards(player.cards)
                          ) : (
                            <p className="italic text-gray-300 text-xs">No cards</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              <aside className="order-3 hidden md:block min-h-0">
                <div className="h-full max-h-full overflow-hidden md:overflow-auto pr-1 space-y-3">
                  {rightPlayers.length === 0 ? (
                    <div className="bg-green-900/70 rounded-xl px-3 py-1.5 shadow-lg border border-green-200/20 text-xs text-green-100">
                      No players yet.
                    </div>
                  ) : (
                    rightPlayers.map((player) => (
                      <div
                        key={player.id}
                        className="bg-green-900/80 px-3 py-2 rounded-xl text-center shadow-lg border border-green-200/20"
                      >
                        <h3 className="font-bold mb-1 text-sm">{player.name}</h3>
                        <p className="text-yellow-200 font-semibold mb-2 text-xs">
                          💵 ${player.balance.toFixed(2)}
                        </p>
                        {player.eliminated ? (
                          <p className="text-xs font-semibold text-red-200">Eliminated</p>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-1 mt-2 max-h-28 overflow-hidden md:overflow-auto">
                            {player.cards.length > 0 ? (
                              player.cards.map((card, idx) => (
                                <div
                                  key={`${card.value}-${card.suit}-${idx}`}
                                  className="bg-white px-2 py-1 rounded shadow text-xs font-semibold"
                                  style={{
                                    color:
                                      card.suit === "♥" || card.suit === "♦"
                                        ? "#dc2626"
                                        : "#111827",
                                  }}
                                >
                                  {formatCard(card)}
                                </div>
                              ))
                            ) : (
                              <p className="italic text-gray-300 text-xs">No cards</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          </div>

          <div className="mt-4 flex flex-col md:flex-row gap-3 items-center">
            {phase === "finished" && currentRace >= totalRaces && (
              <p className="text-lg font-semibold text-yellow-200">
                Day complete! Reset to start over.
              </p>
            )}
            {phase === "finished" && winner && (
              <span className="text-lg font-bold text-yellow-300">
                Winner: Horse {horseLabelByNumber[winner]}
              </span>
            )}
          </div>

          {showTradeOverlay && (
            <div
              className={
                isMobile
                  ? "fixed inset-0 z-[80] flex items-stretch justify-center bg-black/40 backdrop-blur-sm"
                  : "fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
              }
              role="dialog"
              aria-modal="true"
              aria-label="Trading Window"
            >
              {renderTradePanel(isMobile)}
            </div>
          )}

          {phase === "finished" && winner && raceSummary && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <div className="w-full max-w-[520px] rounded-2xl bg-[#f4e7cd] text-green-900 shadow-2xl border border-green-900/20 px-6 py-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase tracking-wide">Race Results</h3>
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-widest text-green-900/60">Winner</p>
                  <p className="text-3xl font-bold">
                    Horse {horseLabelByNumber[raceSummary.winner]}
                  </p>
                </div>
                <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 border border-green-900/10">
                  <p className="text-xs uppercase tracking-widest text-green-900/60">Pot</p>
                  <p className="text-xl font-bold">${raceSummary.pot.toFixed(2)}</p>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-widest text-green-900/60 mb-2">
                    Payouts
                  </p>
                  {raceSummary.carryover ? (
                    <p className="text-sm font-semibold">
                      No winning cards. The pot carries over.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {raceSummary.payouts.map((entry) => (
                        <div
                          key={`payout-${entry.playerId}`}
                          className="flex items-center justify-between rounded-lg bg-green-900/5 px-3 py-2"
                        >
                          <span className="text-sm font-semibold">
                            {displayPlayerName(entry.playerId, entry.name)}
                          </span>
                          <span className="text-sm font-bold">
                            ${entry.amount.toFixed(2)} ({entry.cards} card
                            {entry.cards > 1 ? "s" : ""})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                  {currentRace < totalRaces ? (
                    <button
                      onClick={handleNextRace}
                      className="px-4 py-2 rounded-lg font-semibold bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                    >
                      Next Race
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setRaceSummary(null);
                        setShowFinalSummary(true);
                        const userEntry = finalStandings.find(
                          (entry) => entry.playerId === 1
                        );
                        if (userEntry?.rank === 1) {
                          playDailyWinSting();
                        }
                      }}
                      className="px-4 py-2 rounded-lg font-semibold bg-white/70 text-green-900 hover:bg-white"
                    >
                      View Final Standings
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {bailoutPopup && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
              <div className="w-full max-w-[480px] rounded-2xl bg-[#f4e7cd] text-green-900 shadow-2xl border border-green-900/20 px-6 py-5">
                <h3 className="text-lg font-bold uppercase tracking-wide">Lucky Break</h3>
                <p className="mt-2 text-sm text-green-900/70">
                  You were out of cash, so the house stepped in.
                </p>
                <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 border border-green-900/10">
                  <p className="text-xs uppercase tracking-widest text-green-900/60">
                    {bailoutPopup.playerName} received
                  </p>
                  <p className="text-2xl font-bold">${bailoutPopup.amount}</p>
                  <p className="mt-2 text-sm font-semibold">{bailoutPopup.reason}</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setBailoutPopup(null)}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                  >
                    Back to the races
                  </button>
                </div>
              </div>
            </div>
          )}

          {showFinalSummary && finalStandings.length > 0 && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <div className="w-full max-w-[680px] rounded-3xl bg-[#f4e7cd] text-green-900 shadow-2xl border border-green-900/20 px-8 py-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold uppercase tracking-wide">Final Standings</h3>
                </div>
                <p className="mt-2 text-xs uppercase tracking-widest text-green-900/60">
                  {gameMode === "half" ? "Half Day Results" : "Full Day Results"}
                </p>
                <div className="mt-4 space-y-2">
                  {finalStandings.map((entry) => (
                    <div
                      key={`final-${entry.playerId}`}
                      className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 border border-green-900/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-900/70">
                          #{entry.rank}
                        </span>
                        <span className="text-sm font-semibold">
                          {displayPlayerName(entry.playerId, entry.name)}
                        </span>
                      </div>
                      <span className="text-sm font-bold">
                        ${entry.balance.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={resetGame}
                    className="px-4 py-2 rounded-lg font-semibold bg-white/70 text-green-900 hover:bg-white"
                  >
                    Return to Home
                  </button>
                  <button
                    onClick={() => {
                      setShowFinalSummary(false);
                      if (gameMode) {
                        startGame(gameMode);
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;

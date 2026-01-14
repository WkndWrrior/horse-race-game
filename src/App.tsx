import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import RaceBoard3D from "./components/RaceBoard3D";
import { Horse } from "./types";

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

const DiceFace: React.FC<{ value: number; faceClass: string }> = ({ value, faceClass }) => (
  <div className={`dice-face ${faceClass}`}>
    {DICE_PIPS[value].map(([x, y], idx) => (
      <span
        key={`${value}-${idx}`}
        className="dice-pip"
        style={{ left: `${x}%`, top: `${y}%` }}
      />
    ))}
  </div>
);

const DiceCube: React.FC<{
  value: number;
  rotation: DiceRotation;
  rolling: boolean;
  size?: number;
}> = ({ value, rotation, rolling, size = 84 }) => (
  <div
    className={`dice ${rolling ? "dice-rolling" : ""}`}
    style={{ "--dice-size": `${size}px` } as React.CSSProperties}
    aria-label={`Die showing ${value}`}
    data-value={value}
  >
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
    if (typeof window === "undefined") {
      return EMPTY_STATS;
    }
    const stored = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!stored) return EMPTY_STATS;
    try {
      const parsed = JSON.parse(stored) as Partial<PlayerStats> & {
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
    } catch {
      return EMPTY_STATS;
    }
  });
  const [dieRotations, setDieRotations] = useState<[DiceRotation, DiceRotation]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
  const [isRolling, setIsRolling] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);
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
  const bodyOverflowRef = useRef<string | null>(null);
  const htmlOverflowRef = useRef<string | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const hudRef = useRef<HTMLDivElement | null>(null);
  const lastRollByUserRef = useRef(false);
  const tradeStateRef = useRef<{
    players: Player[];
    listings: TradeListing[];
    buyCounts: Record<number, number>;
    sellCounts: Record<number, number>;
  }>({
    players: [],
    listings: [],
    buyCounts: {},
    sellCounts: {},
  });
  const handleRollRef = useRef<() => void>(() => {});
  const handleNextRaceRef = useRef<() => void>(() => {});
  const listingCounterRef = useRef(0);
  const [pot, setPot] = useState(0);
  const [scratchHistory, setScratchHistory] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

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

  const buildFinalStandings = (playersSnapshot: Player[]) => {
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
  };

  const displayPlayerName = (playerId: number, fallback: string) =>
    playerId === 1 ? "You" : fallback;

  const recordFinalStats = (playersSnapshot: Player[]) => {
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
  };

  const applyBailoutIfNeeded = (playersSnapshot: Player[]) => {
    if (!gameMode) return playersSnapshot;
    const amount = gameMode === "full" ? 200 : 100;
    const usedIds: number[] = [];
    const eliminatedIds: number[] = [];
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
        eliminatedIds.push(player.id);
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

    if (eliminatedIds.length > 0) {
      setTradeListings((prev) =>
        prev.filter((listing) => !eliminatedIds.includes(listing.sellerId))
      );
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

  const createAiListings = (playersSnapshot: Player[]) => {
    const listings: TradeListing[] = [];
    const updatedPlayers = playersSnapshot.map((player) => {
      if (
        player.eliminated ||
        player.id === 1 ||
        player.cards.length <= 1
      )
        return player;
      const nextCards = [...player.cards];
      const wantsTwo = nextCards.length > 1 && Math.random() < 0.35;
      const maxListings = Math.max(nextCards.length - 1, 0);
      const listCount = Math.min(wantsTwo ? 2 : 1, maxListings);
      for (let i = 0; i < listCount; i += 1) {
        const cardIndex = Math.floor(Math.random() * nextCards.length);
        const [card] = nextCards.splice(cardIndex, 1);
        listings.push({
          id: createListingId(),
          card,
          sellerId: player.id,
        });
      }
      return { ...player, cards: nextCards };
    });
    return { updatedPlayers, listings };
  };

  const applyAiPurchases = (
    playersSnapshot: Player[],
    listingsSnapshot: TradeListing[],
    buyCountsSnapshot: Record<number, number>,
    sellCountsSnapshot: Record<number, number>,
    maxTransactions = Number.POSITIVE_INFINITY
  ) => {
    let listings = [...listingsSnapshot];
    const updatedPlayers = playersSnapshot.map((player) => ({
      ...player,
      cards: [...player.cards],
    }));
    const eliminatedIds = new Set(
      updatedPlayers.filter((player) => player.eliminated).map((player) => player.id)
    );
    const nextBuyCounts = { ...buyCountsSnapshot };
    const nextSellCounts = { ...sellCountsSnapshot };
    let changed = false;
    let transactions = 0;

    for (const player of updatedPlayers) {
      if (transactions >= maxTransactions) break;
      if (player.eliminated || player.id === 1 || player.balance < LISTING_PRICE) continue;
      let purchases = 0;
      const availableBuys =
        MAX_TRADES_PER_PLAYER - (nextBuyCounts[player.id] ?? 0);
      while (purchases < availableBuys && player.balance >= LISTING_PRICE) {
        if (transactions >= maxTransactions) break;
        if (Math.random() > 0.35) break;
        const options = listings.filter((listing) => {
          if (listing.sellerId === player.id) return false;
          if (eliminatedIds.has(listing.sellerId)) return false;
          const sellerSold = nextSellCounts[listing.sellerId] ?? 0;
          return sellerSold < MAX_TRADES_PER_PLAYER;
        });
        if (options.length === 0) break;
        const listing = options[Math.floor(Math.random() * options.length)];
        player.balance -= LISTING_PRICE;
        player.cards.push(listing.card);
        const seller = updatedPlayers.find((entry) => entry.id === listing.sellerId);
        if (seller) {
          seller.balance += LISTING_PRICE;
        }
        nextBuyCounts[player.id] = (nextBuyCounts[player.id] ?? 0) + 1;
        nextSellCounts[listing.sellerId] =
          (nextSellCounts[listing.sellerId] ?? 0) + 1;
        listings = listings.filter((entry) => entry.id !== listing.id);
        purchases += 1;
        transactions += 1;
        changed = true;
      }
    }

    if (!changed) {
      return {
        updatedPlayers: playersSnapshot,
        listings: listingsSnapshot,
        buyCounts: buyCountsSnapshot,
        sellCounts: sellCountsSnapshot,
        changed: false,
      };
    }

    const finalPlayers = applyBailoutIfNeeded(updatedPlayers);
    return {
      updatedPlayers: finalPlayers,
      listings,
      buyCounts: nextBuyCounts,
      sellCounts: nextSellCounts,
      changed: true,
    };
  };

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
    const { updatedPlayers, listings } = createAiListings(playersSnapshot);
    const initialBuyCounts: Record<number, number> = {};
    const initialSellCounts: Record<number, number> = {};
    setPlayers(updatedPlayers);
    setTradeListings(listings);
    setTradeBuyCounts(initialBuyCounts);
    setTradeSellCounts(initialSellCounts);
    setShowTradeModal(true);
    tradeStateRef.current = {
      players: updatedPlayers,
      listings,
      buyCounts: initialBuyCounts,
      sellCounts: initialSellCounts,
    };
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
        const aiPass = applyAiPurchases(
          snapshot.players,
          snapshot.listings,
          snapshot.buyCounts,
          snapshot.sellCounts,
          1
        );
        if (aiPass.changed) {
          setPlayers(aiPass.updatedPlayers);
          setTradeListings(aiPass.listings);
          setTradeBuyCounts(aiPass.buyCounts);
          setTradeSellCounts(aiPass.sellCounts);
          tradeStateRef.current = {
            players: aiPass.updatedPlayers,
            listings: aiPass.listings,
            buyCounts: aiPass.buyCounts,
            sellCounts: aiPass.sellCounts,
          };
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
    setTradeBuyCounts({});
    setTradeSellCounts({});
    setShowTradeModal(false);
    const listingsSnapshot = tradeStateRef.current.listings;
    const playersSnapshot = tradeStateRef.current.players;
    if (listingsSnapshot.length > 0) {
      const returnedPlayers = playersSnapshot.map((player) => {
        const returns = listingsSnapshot
          .filter((listing) => listing.sellerId === player.id)
          .map((listing) => listing.card);
        if (returns.length === 0) return player;
        return { ...player, cards: [...player.cards, ...returns] };
      });
      setPlayers(returnedPlayers);
    }
    setTradeListings([]);
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

    setPlayers(playersWithCards);
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
    setTradeListings([]);
    setTradeSecondsLeft(0);
    setTradeBuyCounts({});
    setTradeSellCounts({});
    setShowTradeModal(false);
    finalStatsRecordedRef.current = false;
    lastRollByUserRef.current = false;
    listingCounterRef.current = 0;
    if (summaryDelayRef.current) {
      window.clearTimeout(summaryDelayRef.current);
      summaryDelayRef.current = null;
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
    setPot(0);
    setScratchHistory([]);
    setWinner(null);
    addLog(
      `Race 1 has begun. ${playersWithCards[0].name} starts the scratch phase.`
    );
  };

  const resetGame = () => {
    setGameStarted(false);
    setPlayers([]);
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
    setTradeListings([]);
    setTradeSecondsLeft(0);
    setTradeBuyCounts({});
    setTradeSellCounts({});
    setShowTradeModal(false);
    finalStatsRecordedRef.current = false;
    lastRollByUserRef.current = false;
    listingCounterRef.current = 0;
    setShowConfetti(false);
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
    setPot(0);
    setScratchHistory([]);
    setWinner(null);
  };

  const getNextActiveIndex = (startIndex: number) => {
    if (players.length === 0) return startIndex;
    for (let offset = 1; offset <= players.length; offset += 1) {
      const idx = (startIndex + offset) % players.length;
      if (!players[idx].eliminated) return idx;
    }
    return startIndex;
  };

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
    const updatedHorses = horses.map((h) => {
      if (h.number !== horseNumber) return h;
      const newPosition = Math.min(maxSpaces, h.position + 1);
      return { ...h, position: newPosition };
    });
    setHorses(updatedHorses);

    const movedHorse = updatedHorses.find((h) => h.number === horseNumber);
    if (!movedHorse) return;

    if (movedHorse.position >= maxSpaces) {
      setPhase("finished");
      setWinner(horseNumber);
      setShowConfetti(true);
      setConfettiSeed((prev) => prev + 1);
      if (confettiTimeoutRef.current) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
      confettiTimeoutRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimeoutRef.current = null;
      }, 1200);
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

    setPlayers(updatedPlayers);
    setHorses(initialiseHorses());
    setScratchHistory([]);
    setPot(0);
    setDiceRoll(null);
    setRaceSummary(null);
    setFinalStandings([]);
    setShowFinalSummary(false);
    setShowConfetti(false);
    setTradeListings([]);
    setTradeSecondsLeft(0);
    setTradeBuyCounts({});
    setTradeSellCounts({});
    setShowTradeModal(false);
    lastRollByUserRef.current = false;
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
    const seller = players.find((player) => player.id === 1);
    if (!seller || seller.eliminated) return;
    const soldCount = tradeSellCounts[seller.id] ?? 0;
    const activeListings = tradeListings.filter(
      (listing) => listing.sellerId === seller.id
    ).length;
    if (soldCount + activeListings >= MAX_TRADES_PER_PLAYER) return;
    const cardIndex = seller.cards.findIndex(
      (entry) => entry.value === card.value && entry.suit === card.suit
    );
    if (cardIndex < 0) return;
    const updatedPlayers = players.map((player) => {
      if (player.id !== seller.id) return player;
      const nextCards = [...player.cards];
      nextCards.splice(cardIndex, 1);
      return { ...player, cards: nextCards };
    });
    setPlayers(updatedPlayers);
    setTradeListings((prev) => [
      ...prev,
      { id: createListingId(), card, sellerId: seller.id },
    ]);
  };

  const handleCancelListing = (listingId: string) => {
    const listing = tradeListings.find((entry) => entry.id === listingId);
    if (!listing) return;
    const updatedPlayers = players.map((player) => {
      if (player.id !== listing.sellerId) return player;
      return { ...player, cards: [...player.cards, listing.card] };
    });
    setPlayers(updatedPlayers);
    setTradeListings((prev) => prev.filter((entry) => entry.id !== listingId));
  };

  const handleBuyListing = (listingId: string) => {
    const listing = tradeListings.find((entry) => entry.id === listingId);
    if (!listing || listing.sellerId === 1) return;
    const buyer = players.find((player) => player.id === 1);
    if (!buyer || buyer.eliminated || buyer.balance < LISTING_PRICE) return;
    const buyerPurchases = tradeBuyCounts[buyer.id] ?? 0;
    if (buyerPurchases >= MAX_TRADES_PER_PLAYER) return;
    const sellerSold = tradeSellCounts[listing.sellerId] ?? 0;
    if (sellerSold >= MAX_TRADES_PER_PLAYER) return;
    const updatedPlayers = players.map((player) => {
      if (player.id === buyer.id) {
        return {
          ...player,
          balance: player.balance - LISTING_PRICE,
          cards: [...player.cards, listing.card],
        };
      }
      if (player.id === listing.sellerId) {
        return { ...player, balance: player.balance + LISTING_PRICE };
      }
      return player;
    });
    const nextPlayers = applyBailoutIfNeeded(updatedPlayers);
    setPlayers(nextPlayers);
    setTradeListings((prev) => prev.filter((entry) => entry.id !== listing.id));
    setTradeBuyCounts((prev) => ({
      ...prev,
      [buyer.id]: (prev[buyer.id] ?? 0) + 1,
    }));
    setTradeSellCounts((prev) => ({
      ...prev,
      [listing.sellerId]: (prev[listing.sellerId] ?? 0) + 1,
    }));
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
  const isMobileViewport = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => {
    if (!players.length) return;
    if (players[currentPlayerIndex]?.eliminated) {
      const nextIndex = getNextActiveIndex(currentPlayerIndex);
      if (nextIndex !== currentPlayerIndex) {
        setCurrentPlayerIndex(nextIndex);
      }
    }
  }, [players, currentPlayerIndex]);

  useEffect(() => {
    tradeStateRef.current = {
      players,
      listings: tradeListings,
      buyCounts: tradeBuyCounts,
      sellCounts: tradeSellCounts,
    };
  }, [players, tradeListings, tradeBuyCounts, tradeSellCounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(playerStats));
  }, [playerStats]);

  useEffect(() => {
    if (phase === "trade" && showTradeModal) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      setTradeTab(isMobile ? "sell" : "buy");
    }
  }, [phase, showTradeModal]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isMobile = window.innerWidth < 768;
    const shouldLock = phase === "trade" || (gameStarted && isMobile);
    if (shouldLock) {
      if (bodyOverflowRef.current === null) {
        bodyOverflowRef.current = document.body.style.overflow || "";
      }
      if (htmlOverflowRef.current === null) {
        htmlOverflowRef.current = document.documentElement.style.overflow || "";
      }
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return;
    }
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
    if (htmlOverflowRef.current !== null) {
      document.documentElement.style.overflow = htmlOverflowRef.current;
      htmlOverflowRef.current = null;
    }
  }, [phase, gameStarted]);

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
      const gap = window.innerWidth < 768 ? 4 : 0;
      appRootRef.current.style.setProperty(
        "--hud-h",
        `${Math.ceil(height) + gap}px`
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
  }, [gameStarted]);

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
  }, [phase, players.length, isRolling, isUserTurn]);

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
          overflowY:
            !gameStarted && openHomePanel && isMobileViewport ? "auto" : "hidden",
          WebkitOverflowScrolling:
            !gameStarted && openHomePanel && isMobileViewport ? "touch" : undefined,
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
            !gameStarted && openHomePanel && isMobileViewport
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
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold">
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
            <div className="confetti-container" aria-hidden="true">
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
            className="w-full flex flex-col items-center shrink-0 bg-[#e7d7b8] fixed top-0 left-0 right-0 z-50 md:static md:z-auto md:bg-transparent"
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
                  canRoll ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
                role="button"
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
                  <div className="mt-1.5 md:mt-2 flex items-center justify-center gap-4">
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

          <div className="w-full flex-1 min-h-0 flex justify-center mt-0 -translate-y-[50px] sm:-translate-y-[25px] md:translate-y-0 relative z-0 overflow-hidden">
            <div className="w-full h-full min-h-0 px-0 sm:px-3 lg:px-4 grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_180px] gap-[2.5px] md:gap-3 items-start">
              <aside className="order-2 lg:order-1 mt-0 -translate-y-[57px] sm:-translate-y-[28.5px] md:translate-y-0">
                <div className="space-y-3">
                  <div className="bg-green-900/80 px-3 py-2 rounded-xl text-center shadow-lg border border-green-200/20">
                    <h3 className="font-bold mb-1 text-sm">
                      {currentPlayer ? "Your Cards" : "Player"}
                    </h3>
                    <p className="text-yellow-200 font-semibold mb-2 text-xs">
                      💵 ${userPlayer?.balance.toFixed(2) ?? "0.00"}
                    </p>
                    {userPlayer?.eliminated ? (
                      <p className="text-xs font-semibold text-red-200">Eliminated</p>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-1 mt-2 max-h-28 overflow-hidden md:overflow-auto">
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

              <div className="order-1 lg:order-2 flex justify-center items-center h-full min-h-0">
                <RaceBoard3D horses={horses} />
              </div>

              <aside className="order-3 hidden md:block">
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

          {phase === "trade" && showTradeModal && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <div className="w-full max-w-[920px] rounded-2xl bg-[#f4e7cd] text-green-900 shadow-2xl border border-green-900/20 px-6 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold uppercase tracking-wide">
                      Trading Window
                    </h3>
                    <p className="hidden md:block text-sm text-green-900/70">
                      List any card for ${LISTING_PRICE}. Buy any listed card for $
                      {LISTING_PRICE}.
                    </p>
                    <p className="text-xs text-green-900/60 mt-1">
                      Auto-starts in {tradeSecondsLeft}s.
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-green-900/80 text-right">
                    <div>Your balance: ${userPlayer?.balance.toFixed(2) ?? "0.00"}</div>
                    <div className="text-xs font-semibold text-green-900/60">
                      Buys left: {userBuysLeft} · Sells left: {userSellsLeft}
                    </div>
                    {isUserEliminated && (
                      <div className="text-xs font-semibold text-red-400">
                        You are eliminated.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 md:mt-6 flex md:hidden items-center justify-center gap-2">
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

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={tradeTab === "buy" ? "block" : "hidden md:block"}>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-green-900/60 mb-2">
                      Market Listings
                    </h4>
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {tradeListings.length === 0 ? (
                        <p className="text-sm text-green-900/70">
                          No cards are listed yet.
                        </p>
                      ) : (
                        tradeListings.map((listing) => {
                          const seller =
                            players.find((player) => player.id === listing.sellerId)
                              ?.name ?? "Unknown";
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
                                <p className="text-sm font-semibold">
                                  {formatCard(listing.card)}
                                </p>
                                <p className="text-xs text-green-900/60">
                                  Seller: {isUserListing ? "You" : seller}
                                </p>
                              </div>
                              {isUserListing ? (
                                <button
                                  onClick={() => handleCancelListing(listing.id)}
                                  className="px-3 py-1 rounded-full text-xs font-semibold bg-green-900/10 text-green-900 hover:bg-green-900/20"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBuyListing(listing.id)}
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

                  <div className={tradeTab === "sell" ? "block" : "hidden md:block"}>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-green-900/60 mb-2">
                      Your Cards
                    </h4>
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {currentPlayerCards.length === 0 ? (
                        <p className="text-sm text-green-900/70">
                          You have no cards to list.
                        </p>
                      ) : (
                        sortCardsByValue(currentPlayerCards).map((card, idx) => (
                          <div
                            key={`${card.value}-${card.suit}-${idx}`}
                            className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 border border-green-900/10"
                          >
                            <span className="text-sm font-semibold">
                              {formatCard(card)}
                            </span>
                            <button
                              onClick={() => handleListCardForSale(card)}
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

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={closeTradeMarket}
                    className="px-4 py-2 rounded-lg font-semibold bg-green-900 text-[#f4e7cd] hover:bg-green-800"
                  >
                    Start Race
                  </button>
                </div>
              </div>
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

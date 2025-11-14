import React, { useMemo, useState } from "react";
import RaceBoard3D from "./RaceBoard3D";
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
}

type GamePhase = "scratch" | "race" | "finished" | null;

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

const App: React.FC = () => {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
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
  const [pot, setPot] = useState(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [scratchHistory, setScratchHistory] = useState<number[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  const totalRaces = useMemo(() => {
    if (!gameMode) return 0;
    return gameMode === "half" ? 4 : 8;
  }, [gameMode]);

  const handlePlayerSelect = (count: number) => {
    setNumPlayers(count);
  };

  const addLog = (entry: string) => {
    setLogMessages((prev) => [entry, ...prev].slice(0, 30));
  };

  const initialiseHorses = () =>
    laneNumbers.map((lane) => ({
      number: lane,
      position: 0,
      scratched: false,
      scratchStep: undefined,
    }));

  const startGame = (mode: "half" | "full") => {
    if (!numPlayers) return;

    const basePlayers: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      balance: 150,
      cards: [],
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
    setDiceRoll(null);
    setPot(0);
    setScratchHistory([]);
    setWinner(null);
    setLogMessages([
      `Race 1 has begun. ${playersWithCards[0].name} starts the scratch phase.`,
    ]);
  };

  const resetGame = () => {
    setGameStarted(false);
    setNumPlayers(null);
    setPlayers([]);
    setGameMode(null);
    setCurrentRace(1);
    setHorses([]);
    setPhase(null);
    setCurrentPlayerIndex(0);
    setDiceRoll(null);
    setPot(0);
    setLogMessages([]);
    setScratchHistory([]);
    setWinner(null);
  };

  const advanceTurn = () => {
    if (players.length === 0) return;
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  };

  const handleScratchRoll = (total: number) => {
    const horseNumber = total;
    const horseLabel = horseLabelByNumber[horseNumber];
    const horse = horses.find((h) => h.number === horseNumber);
    if (!horse) return;

    const currentPlayer = players[currentPlayerIndex];

    if (horse.scratched) {
      const penalty = scratchPenaltyByStep[horse.scratchStep ?? 1] ?? 0;
      if (penalty > 0) {
        const updatedPlayers = players.map((player, idx) =>
          idx === currentPlayerIndex
            ? { ...player, balance: player.balance - penalty }
            : player
        );
        setPlayers(updatedPlayers);
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
    setPlayers(updatedPlayers);
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
      setPhase("race");
      addLog("All scratches complete! The race is on.");
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

    if (totalWinningCards === 0) {
      addLog("No one held the winning horse. The pot carries over.");
      return;
    }

    const payoutPerCard = pot / totalWinningCards;
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

    if (horse.scratched) {
      const penalty = scratchPenaltyByStep[horse.scratchStep ?? 1] ?? 0;
      if (penalty > 0) {
        const updatedPlayers = players.map((player, idx) =>
          idx === currentPlayerIndex
            ? { ...player, balance: player.balance - penalty }
            : player
        );
        setPlayers(updatedPlayers);
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

    const maxSpaces = pegDistribution[horseNumber];
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
    if (!phase || phase === "finished" || players.length === 0) return;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    setDiceRoll({ die1, die2, total });

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
    const hands = dealHands(shuffledDeck, players.length);
    const nextRaceNumber = currentRace + 1;
    const startingIndex = (nextRaceNumber - 1) % players.length;
    const updatedPlayers = players.map((player, idx) => ({
      ...player,
      cards: hands[idx],
    }));

    setPlayers(updatedPlayers);
    setHorses(initialiseHorses());
    setScratchHistory([]);
    setPot(0);
    setDiceRoll(null);
    setWinner(null);
    setPhase("scratch");
    setCurrentRace(nextRaceNumber);
    setCurrentPlayerIndex(startingIndex);
    addLog(
      `Race ${nextRaceNumber} has begun. ${updatedPlayers[startingIndex].name} starts the scratch phase.`
    );
  };

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-700 text-white">
      {!gameStarted ? (
        <div className="text-center space-y-8">
          <h1 className="text-4xl font-bold mb-4">🏇 Horse Race Game 🏇</h1>

          {!numPlayers ? (
            <>
              <p className="text-lg mb-2">Select number of players:</p>
              <div className="flex flex-wrap justify-center gap-4 max-w-[600px] mx-auto">
                {Array.from({ length: 9 }, (_, i) => i + 4).map((count) => (
                  <button
                    key={count}
                    onClick={() => handlePlayerSelect(count)}
                    className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-black font-semibold w-[70px]"
                  >
                    {count}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-lg mb-4">
                {numPlayers} players selected — choose your game mode:
              </p>
              <div className="flex justify-center gap-6">
                <button
                  onClick={() => startGame("half")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-lg text-black font-semibold"
                >
                  Half Day (4 Races)
                </button>
                <button
                  onClick={() => startGame("full")}
                  className="bg-yellow-500 hover:bg-yellow-600 px-6 py-3 rounded-lg text-black font-semibold"
                >
                  Full Day (8 Races)
                </button>
              </div>
              <button
                onClick={() => setNumPlayers(null)}
                className="mt-6 bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded-lg font-semibold"
              >
                Back
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center pb-12">
          <div className="flex justify-between w-11/12 lg:w-3/4 mt-4 mb-6 items-center">
            <div>
              <h2 className="text-3xl font-bold">Race {currentRace} / {totalRaces}</h2>
              <p className="text-sm text-yellow-200 uppercase tracking-wider">
                {phase === "scratch"
                  ? "Scratch Phase — remove four horses from contention"
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

          <div className="w-11/12 lg:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-900/80 rounded-xl px-4 py-3 shadow-lg border border-green-300/20">
              <h3 className="text-lg font-semibold uppercase tracking-wide mb-1">Current Player</h3>
              <p className="text-2xl font-bold">
                {currentPlayer ? currentPlayer.name : "-"}
              </p>
            </div>
            <div className="bg-green-900/80 rounded-xl px-4 py-3 shadow-lg border border-green-300/20">
              <h3 className="text-lg font-semibold uppercase tracking-wide mb-1">Pot</h3>
              <p className="text-2xl font-bold">${pot.toFixed(2)}</p>
            </div>
            <div className="bg-green-900/80 rounded-xl px-4 py-3 shadow-lg border border-green-300/20">
              <h3 className="text-lg font-semibold uppercase tracking-wide mb-1">Dice</h3>
              {diceRoll ? (
                <p className="text-2xl font-bold">
                  {diceRoll.die1} + {diceRoll.die2} = {diceRoll.total}
                </p>
              ) : (
                <p className="text-xl italic text-green-100">Roll to begin</p>
              )}
            </div>
          </div>

          <div className="w-11/12 lg:w-3/4 bg-green-900/60 rounded-xl px-4 py-3 shadow-md border border-green-200/10 mb-6">
            <h3 className="font-semibold uppercase tracking-wide mb-2">Scratched Horses</h3>
            {scratchHistory.length === 0 ? (
              <p className="text-sm text-green-100">No horses have been scratched yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {scratchHistory.map((horseNum, idx) => (
                  <span
                    key={`${horseNum}-${idx}`}
                    className="bg-red-600/80 px-3 py-1 rounded-full text-sm font-semibold shadow"
                  >
                    #{horseLabelByNumber[horseNum]} — ${scratchPenaltyByStep[idx + 1]} line
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center items-center w-full h-[70vh]">
            <RaceBoard3D horses={horses} />
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-4 items-center">
            <button
              onClick={handleRoll}
              disabled={!phase || phase === "finished"}
              className={`px-6 py-3 rounded-lg font-semibold shadow-lg transition transform hover:-translate-y-0.5 ${
                !phase || phase === "finished"
                  ? "bg-gray-500/70 cursor-not-allowed"
                  : "bg-yellow-500 hover:bg-yellow-400 text-black"
              }`}
            >
              Roll Dice
            </button>
            {phase === "finished" && winner && currentRace < totalRaces && (
              <button
                onClick={handleNextRace}
                className="px-6 py-3 rounded-lg font-semibold shadow-lg bg-blue-500 hover:bg-blue-400 text-white"
              >
                Start Next Race
              </button>
            )}
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

          <div className="mt-8 w-11/12 flex flex-wrap justify-center gap-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-green-900/80 px-5 py-4 rounded-xl text-center shadow-lg border border-green-200/20 w-[180px]"
              >
                <h3 className="font-bold mb-1 text-lg">{player.name}</h3>
                <p className="text-yellow-200 font-semibold mb-2">💵 ${player.balance.toFixed(2)}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-2 max-h-32 overflow-auto">
                  {player.cards.length > 0 ? (
                    player.cards.map((card, idx) => (
                      <div
                        key={`${card.value}-${card.suit}-${idx}`}
                        className="bg-white text-black px-2 py-1 rounded shadow"
                      >
                        {formatCard(card)}
                      </div>
                    ))
                  ) : (
                    <p className="italic text-gray-300 text-sm">No cards</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 w-11/12 lg:w-3/4 bg-green-900/70 rounded-xl px-4 py-4 border border-green-100/10 shadow-inner">
            <h3 className="font-semibold uppercase tracking-wide mb-3">Game Log</h3>
            {logMessages.length === 0 ? (
              <p className="text-sm text-green-100">Actions will appear here as the game progresses.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {logMessages.map((entry, idx) => (
                  <li key={`${entry}-${idx}`} className="text-sm leading-relaxed">
                    • {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
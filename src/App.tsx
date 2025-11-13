import React, { useState } from "react";
import RaceBoard from "./RaceBoard";
import { Horse } from "./types";

interface Player {
  id: number;
  name: string;
  balance: number;
  cards: string[];
}

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

const App: React.FC = () => {
  const [numPlayers, setNumPlayers] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<"half" | "full" | null>(null);
  const [currentRace, setCurrentRace] = useState(1);
  const [horses, setHorses] = useState<Horse[]>([]);

  const laneNumbers = Array.from({ length: 11 }, (_, i) => i + 2);

  const handlePlayerSelect = (count: number) => {
    setNumPlayers(count);
  };

  const startGame = (mode: "half" | "full") => {
    if (!numPlayers) return;

    const initialPlayers: Player[] = Array.from({ length: numPlayers }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      balance: 150,
      cards: [],
    }));

const initialHorses: Horse[] = horseLabels.map((_: string, i: number) => ({
  number: i + 2,
  color: "",
  gradient: "",
  position: i % 3,
  scratched: false,
}));

    setPlayers(initialPlayers);
    setHorses(initialHorses);
    setGameMode(mode);
    setGameStarted(true);
  };

  const resetGame = () => {
    setGameStarted(false);
    setNumPlayers(null);
    setPlayers([]);
    setGameMode(null);
    setCurrentRace(1);
    setHorses([]);
  };

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
        <div className="w-full flex flex-col items-center">
          {/* Header */}
          <div className="flex justify-between w-3/4 mt-4 mb-4 items-center">
            <h2 className="text-2xl font-bold">
              Race {currentRace} / {gameMode === "half" ? 4 : 8}
            </h2>
            <button
              onClick={resetGame}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold"
            >
              Exit
            </button>
          </div>

          {/* Game Board */}
        {/* Game Board */}
<div className="flex justify-center items-center w-full h-[83vh]">
  <RaceBoard horses={horses} />
</div>

          {/* Player Info */}
          <div className="mt-8 w-full flex flex-wrap justify-center gap-6">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-green-900 px-4 py-3 rounded-lg text-center shadow-md w-[150px]"
              >
                <h3 className="font-bold mb-1">{player.name}</h3>
                <p>💵 ${player.balance}</p>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {player.cards.length > 0 ? (
                    player.cards.map((card, idx) => (
                      <div
                        key={idx}
                        className="bg-white text-black px-2 py-1 rounded shadow"
                      >
                        {card}
                      </div>
                    ))
                  ) : (
                    <p className="italic text-gray-300 text-sm">No cards</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

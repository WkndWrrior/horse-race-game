import React from "react";
import { render, waitFor } from "@testing-library/react";
import useTotalEliminationGuard from "../hooks/useTotalEliminationGuard";

type Player = {
  id: number;
  name: string;
  balance: number;
  eliminated: boolean;
};

type FinalStanding = {
  playerId: number;
  rank: number;
};

type HarnessProps = {
  players: Player[];
  gameStarted: boolean;
  phase: string | null;
  winner: number | null;
  clearPendingGameTimers: jest.Mock;
  buildFinalStandings: jest.Mock<FinalStanding[], [Player[]]>;
  recordFinalStats: jest.Mock<void, [Player[]]>;
  setRaceSummary: jest.Mock;
  setPhase: jest.Mock;
  setFinalStandings: jest.Mock;
  setShowFinalSummary: jest.Mock;
};

const GuardHarness = (props: HarnessProps) => {
  useTotalEliminationGuard(props);
  return null;
};

describe("useTotalEliminationGuard", () => {
  it("ends the game cleanly when all players are eliminated before a winner exists", async () => {
    const players: Player[] = [
      { id: 1, name: "You", balance: 0, eliminated: true },
      { id: 2, name: "Lucky Lou", balance: 0, eliminated: true },
      { id: 3, name: "Neigh Sayer", balance: 0, eliminated: true },
    ];
    const standings: FinalStanding[] = [
      { playerId: 1, rank: 1 },
      { playerId: 2, rank: 1 },
      { playerId: 3, rank: 1 },
    ];
    const clearPendingGameTimers = jest.fn();
    const buildFinalStandings = jest.fn<FinalStanding[], [Player[]]>(() => standings);
    const recordFinalStats = jest.fn();
    const setRaceSummary = jest.fn();
    const setPhase = jest.fn();
    const setFinalStandings = jest.fn();
    const setShowFinalSummary = jest.fn();

    render(
      React.createElement(GuardHarness, {
        players,
        gameStarted: true,
        phase: "race",
        winner: null,
        clearPendingGameTimers,
        buildFinalStandings,
        recordFinalStats,
        setRaceSummary,
        setPhase,
        setFinalStandings,
        setShowFinalSummary,
      })
    );

    await waitFor(() => {
      expect(setPhase).toHaveBeenCalledWith("finished");
    });

    expect(clearPendingGameTimers).toHaveBeenCalledTimes(1);
    expect(setRaceSummary).toHaveBeenCalledWith(null);
    expect(buildFinalStandings).toHaveBeenCalledWith(players);
    expect(setFinalStandings).toHaveBeenCalledWith(standings);
    expect(recordFinalStats).toHaveBeenCalledWith(players);
    expect(setShowFinalSummary).toHaveBeenCalledWith(true);
  });

  it("does nothing while at least one player remains active", async () => {
    const players: Player[] = [
      { id: 1, name: "You", balance: 0, eliminated: true },
      { id: 2, name: "Lucky Lou", balance: 50, eliminated: false },
    ];
    const clearPendingGameTimers = jest.fn();
    const buildFinalStandings = jest.fn<FinalStanding[], [Player[]]>();
    const recordFinalStats = jest.fn();
    const setRaceSummary = jest.fn();
    const setPhase = jest.fn();
    const setFinalStandings = jest.fn();
    const setShowFinalSummary = jest.fn();

    render(
      React.createElement(GuardHarness, {
        players,
        gameStarted: true,
        phase: "race",
        winner: null,
        clearPendingGameTimers,
        buildFinalStandings,
        recordFinalStats,
        setRaceSummary,
        setPhase,
        setFinalStandings,
        setShowFinalSummary,
      })
    );

    await waitFor(() => {
      expect(clearPendingGameTimers).not.toHaveBeenCalled();
    });

    expect(setPhase).not.toHaveBeenCalled();
    expect(setFinalStandings).not.toHaveBeenCalled();
    expect(setShowFinalSummary).not.toHaveBeenCalled();
  });
});

import { useEffect } from "react";

interface EliminatedPlayerLike {
  eliminated?: boolean;
}

interface UseTotalEliminationGuardOptions<
  PlayerType extends EliminatedPlayerLike,
  FinalStandingType
> {
  gameStarted: boolean;
  phase: string | null;
  winner: number | null;
  players: PlayerType[];
  clearPendingGameTimers: () => void;
  buildFinalStandings: (players: PlayerType[]) => FinalStandingType[];
  recordFinalStats: (players: PlayerType[]) => void;
  setRaceSummary: (summary: null) => void;
  setPhase: (phase: "finished") => void;
  setFinalStandings: (standings: FinalStandingType[]) => void;
  setShowFinalSummary: (show: boolean) => void;
}

export const hasActivePlayers = <PlayerType extends EliminatedPlayerLike>(
  players: PlayerType[]
) => players.some((player) => !player.eliminated);

const useTotalEliminationGuard = <
  PlayerType extends EliminatedPlayerLike,
  FinalStandingType
>({
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
}: UseTotalEliminationGuardOptions<PlayerType, FinalStandingType>) => {
  useEffect(() => {
    if (!gameStarted || !phase || phase === "finished" || winner) return;
    if (!players.length || hasActivePlayers(players)) return;

    clearPendingGameTimers();
    setRaceSummary(null);
    setPhase("finished");
    setFinalStandings(buildFinalStandings(players));
    recordFinalStats(players);
    setShowFinalSummary(true);
  }, [
    buildFinalStandings,
    clearPendingGameTimers,
    gameStarted,
    phase,
    players,
    recordFinalStats,
    setFinalStandings,
    setPhase,
    setRaceSummary,
    setShowFinalSummary,
    winner,
  ]);
};

export default useTotalEliminationGuard;

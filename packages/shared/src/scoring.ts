import { DEFAULT_SCORING_RULE, MAX_ROUNDS, MIN_PLAYERS, type ScoringRule } from "./constants";
import type { CalculatedRoundScore, PlayerStanding, RoundInputScore } from "./types";

export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}

export interface CalculateRoundInput {
  playerIds: string[];
  winnerId: string;
  scores: RoundInputScore[];
  rule?: ScoringRule;
}

/**
 * Default Teen Patti tracking rule: the winner's points equal the combined
 * losses of every other player. Swap `rule` to add other scoring variants
 * without rewriting callers.
 */
export function calculateRoundScores(input: CalculateRoundInput): CalculatedRoundScore[] {
  const rule = input.rule ?? DEFAULT_SCORING_RULE;
  switch (rule) {
    case "winnerTakesLosses":
      return winnerTakesLosses(input);
    default:
      throw new ScoringError(`Unknown scoring rule: ${String(rule)}`);
  }
}

function winnerTakesLosses(input: CalculateRoundInput): CalculatedRoundScore[] {
  const uniquePlayerIds = [...new Set(input.playerIds)];
  if (uniquePlayerIds.length !== input.playerIds.length) {
    throw new ScoringError("Player list contains duplicates");
  }
  if (uniquePlayerIds.length < MIN_PLAYERS) {
    throw new ScoringError(`A round requires at least ${MIN_PLAYERS} players`);
  }
  if (!uniquePlayerIds.includes(input.winnerId)) {
    throw new ScoringError("Winner must be one of the participating players");
  }

  const scoreByPlayer = new Map(input.scores.map((score) => [score.playerId, score]));
  for (const playerId of uniquePlayerIds) {
    if (!scoreByPlayer.has(playerId)) {
      throw new ScoringError("Every player must have a score entry");
    }
  }
  if (scoreByPlayer.size !== uniquePlayerIds.length) {
    throw new ScoringError("Score entries must match the participating players");
  }

  const winnerInput = scoreByPlayer.get(input.winnerId)!;
  if (winnerInput.lossPoints !== 0) {
    throw new ScoringError("The winner cannot also be listed as a loser");
  }

  let totalLosses = 0;
  const result: CalculatedRoundScore[] = uniquePlayerIds.map((playerId) => {
    const entry = scoreByPlayer.get(playerId)!;
    if (!Number.isFinite(entry.lossPoints) || entry.lossPoints < 0) {
      throw new ScoringError("Loss points must be valid non-negative numbers");
    }

    const isWinner = playerId === input.winnerId;
    if (isWinner) {
      return { playerId, lossPoints: 0, points: 0, isWinner: true };
    }

    totalLosses += entry.lossPoints;
    return {
      playerId,
      lossPoints: entry.lossPoints,
      points: -entry.lossPoints,
      isWinner: false
    };
  });

  const winner = result.find((score) => score.isWinner)!;
  winner.points = totalLosses;
  winner.lossPoints = 0;

  const netSum = result.reduce((sum, score) => sum + score.points, 0);
  if (Math.abs(netSum) > 1e-9) {
    throw new ScoringError("Round net points must equal zero");
  }
  if (winner.points !== totalLosses) {
    throw new ScoringError("Winner points must equal total losses for the round");
  }

  return result;
}

export function assertRoundLimit(currentRoundCount: number): void {
  if (currentRoundCount >= MAX_ROUNDS) {
    throw new ScoringError(`A game can have at most ${MAX_ROUNDS} rounds`);
  }
}

export interface ScoreAccumulator {
  playerId: string;
  playerName: string;
  seatNumber: number;
  pointsWon: number;
  pointsLost: number;
  netPoints: number;
}

export function accumulateScores(
  players: Array<{ id: string; name: string; seatNumber?: number }>,
  rounds: Array<{
    winnerId: string;
    playerScores: Array<{ playerId: string; points: number }>;
  }>
): ScoreAccumulator[] {
  const byId = new Map<string, ScoreAccumulator>(
    players.map((player, index) => [
      player.id,
      {
        playerId: player.id,
        playerName: player.name,
        seatNumber: player.seatNumber ?? index + 1,
        pointsWon: 0,
        pointsLost: 0,
        netPoints: 0
      }
    ])
  );

  for (const round of rounds) {
    for (const score of round.playerScores) {
      const player = byId.get(score.playerId);
      if (!player) continue;
      if (score.points > 0) {
        player.pointsWon += score.points;
      } else if (score.points < 0) {
        player.pointsLost += Math.abs(score.points);
      }
      player.netPoints += score.points;
    }
  }

  return [...byId.values()];
}

export function rankStandings(accumulators: ScoreAccumulator[]): PlayerStanding[] {
  const sorted = [...accumulators].sort((a, b) => {
    if (b.netPoints !== a.netPoints) return b.netPoints - a.netPoints;
    return a.seatNumber - b.seatNumber;
  });

  let lastNet: number | null = null;
  let lastRank = 0;
  return sorted.map((player, index) => {
    const rank = lastNet === player.netPoints ? lastRank : index + 1;
    lastNet = player.netPoints;
    lastRank = rank;
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      seatNumber: player.seatNumber,
      rank,
      pointsWon: player.pointsWon,
      pointsLost: player.pointsLost,
      netPoints: player.netPoints,
      moneyBalance: null
    };
  });
}

export function assertZeroSum(netPoints: number[]): void {
  const sum = netPoints.reduce((total, value) => total + value, 0);
  if (Math.abs(sum) > 1e-9) {
    throw new ScoringError("The sum of all players' net points must equal zero");
  }
}

export function formatSignedPoints(value: number): string {
  if (value > 0) return `+${value.toLocaleString("en-IN")}`;
  if (value < 0) return value.toLocaleString("en-IN");
  return "0";
}

/** Players who have not packed yet. The last remaining player is the winner. */
export function remainingPlayerIds(playerIds: string[], packedPlayerIds: string[]): string[] {
  const packed = new Set(packedPlayerIds);
  return playerIds.filter((playerId) => !packed.has(playerId));
}

export function inferWinnerId(playerIds: string[], packedPlayerIds: string[]): string | null {
  const remaining = remainingPlayerIds(playerIds, packedPlayerIds);
  return remaining.length === 1 ? remaining[0] : null;
}

export function packedRoundInput(
  playerIds: string[],
  packedLosses: Record<string, number>
): CalculateRoundInput | null {
  const packedPlayerIds = Object.keys(packedLosses);
  const winnerId = inferWinnerId(playerIds, packedPlayerIds);
  if (!winnerId) return null;
  return {
    playerIds,
    winnerId,
    scores: playerIds.map((playerId) => ({
      playerId,
      lossPoints: playerId === winnerId ? 0 : packedLosses[playerId] ?? 0
    }))
  };
}

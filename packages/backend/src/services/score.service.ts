import {
  accumulateScores,
  assertZeroSum,
  buildSettlement,
  rankStandings,
  type Game,
  type GameSummary,
  type Leaderboard,
  type SettlementResult
} from "@e-patti/shared";

export function computeLeaderboard(game: Game, range?: { fromRound?: number; toRound?: number }): Leaderboard {
  const fromRound = range?.fromRound ?? 1;
  const toRound = range?.toRound ?? (game.rounds.length || 1);
  const filtered = game.rounds.filter(
    (round) => round.roundNumber >= fromRound && round.roundNumber <= toRound
  );

  const accumulators = accumulateScores(
    game.players.map((player, index) => ({
      id: player.id,
      name: player.name,
      seatNumber: index + 1
    })),
    filtered.map((round) => ({
      winnerId: round.winnerId,
      playerScores: round.playerScores
    }))
  );

  const standings = rankStandings(accumulators);
  const rate = game.scoringConfig.pointsToMoneyRate;
  const withAmounts = standings.map((standing) => ({
    ...standing,
    moneyBalance: rate ? Math.round(standing.netPoints * rate * 100) / 100 : standing.netPoints
  }));
  const netPointsSum = withAmounts.reduce((sum, player) => sum + player.netPoints, 0);
  if (filtered.length > 0) {
    assertZeroSum(withAmounts.map((player) => player.netPoints));
  }

  return {
    gameId: game.id,
    roomId: game.roomId,
    status: game.status,
    pointsToMoneyRate: rate,
    fromRound,
    toRound: filtered.length ? toRound : 0,
    standings: withAmounts,
    netPointsSum
  };
}

export function computeSettlement(game: Game): SettlementResult {
  const leaderboard = computeLeaderboard(game);
  return buildSettlement({
    gameId: leaderboard.gameId,
    roomId: leaderboard.roomId,
    standings: leaderboard.standings,
    pointsToMoneyRate: leaderboard.pointsToMoneyRate
  });
}

export function computeSummary(game: Game): GameSummary {
  const leaderboard = computeLeaderboard(game);
  const settlement = computeSettlement(game);
  const totalPointsWon = leaderboard.standings.reduce((sum, player) => sum + player.pointsWon, 0);
  const totalPointsLost = leaderboard.standings.reduce((sum, player) => sum + player.pointsLost, 0);
  const netBalance = leaderboard.standings.reduce((sum, player) => sum + player.netPoints, 0);
  const reconciles =
    Math.abs(netBalance) < 1e-9 &&
    Math.abs(totalPointsWon - totalPointsLost) < 1e-9 &&
    Math.abs(settlement.totalPayable - settlement.totalReceivable) < 0.009;

  return {
    game,
    leaderboard,
    settlement,
    validation: {
      totalRounds: game.rounds.length,
      totalPointsWon,
      totalPointsLost,
      netBalance,
      totalSettlementAmount: settlement.totalPayable,
      reconciles
    }
  };
}

export function toListItem(game: Game) {
  return {
    id: game.id,
    roomId: game.roomId,
    name: game.name,
    ownerId: game.ownerId,
    playerCount: game.players.length,
    roundCount: game.rounds.length,
    status: game.status,
    updatedAt: game.updatedAt,
    createdAt: game.createdAt,
    completedAt: game.completedAt
  };
}

export function withRoundNames(game: Game): Game {
  const names = new Map(game.players.map((player) => [player.id, player.name]));
  return {
    ...game,
    rounds: [...game.rounds]
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((round) => ({
        ...round,
        winnerName: names.get(round.winnerId),
        playerScores: round.playerScores.map((score) => ({
          ...score,
          playerName: names.get(score.playerId)
        }))
      }))
  };
}

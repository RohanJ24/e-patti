import {
  assertRoundLimit,
  calculateRoundScores,
  createRoundSchema,
  MAX_ROUNDS
} from "@e-patti/shared";
import { NotFoundError, ValidationAppError } from "../errors";
import { updateGame } from "../storage/gameStore";
import { createId, nowIso } from "../utils/ids";
import { assertWritable, getOwnedGame } from "./game.service";
import { withRoundNames } from "./score.service";
import type { StoredGame } from "../storage/models";

function buildCalculatedScores(game: StoredGame, body: unknown) {
  const input = createRoundSchema.parse(body);
  const playerIds = game.players.map((player) => player.id);
  if (!playerIds.includes(input.winnerId)) {
    throw new ValidationAppError("Winner must be a player in this room");
  }
  const expectedIds = new Set(playerIds);
  if (input.scores.length !== playerIds.length || input.scores.some((score) => !expectedIds.has(score.playerId))) {
    throw new ValidationAppError("Provide a score entry for every player in the room");
  }
  const winnerScore = input.scores.find((score) => score.playerId === input.winnerId);
  const normalized = input.scores.map((score) => ({
    playerId: score.playerId,
    lossPoints: score.playerId === input.winnerId ? 0 : score.lossPoints
  }));
  if (winnerScore && winnerScore.lossPoints !== 0) {
    throw new ValidationAppError("The winner cannot also be listed as a loser");
  }
  return {
    winnerId: input.winnerId,
    calculated: calculateRoundScores({
      playerIds,
      winnerId: input.winnerId,
      scores: normalized,
      rule: game.scoringConfig.rule
    })
  };
}

export async function listRounds(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  return game.rounds;
}

export async function getRound(userId: string, gameId: string, roundId: string) {
  const game = await getOwnedGame(userId, gameId);
  const round = game.rounds.find((item) => item.id === roundId);
  if (!round) throw new NotFoundError("Round not found");
  return round;
}

export async function createRound(userId: string, gameId: string, body: unknown) {
  const existing = await getOwnedGame(userId, gameId);
  assertWritable(existing);
  assertRoundLimit(existing.rounds.length);
  buildCalculatedScores(existing, body);
  const timestamp = nowIso();

  const saved = await updateGame(existing.id, (game) => {
    assertWritable(game);
    assertRoundLimit(game.rounds.length);
    const { winnerId: lockedWinner, calculated: lockedScores } = buildCalculatedScores(game, body);
    game.rounds.push({
      id: createId(),
      roundNumber: game.rounds.length + 1,
      winnerId: lockedWinner,
      playerScores: lockedScores.map((score) => ({
        playerId: score.playerId,
        points: score.points
      })),
      createdAt: timestamp,
      updatedAt: timestamp
    });
    game.updatedAt = timestamp;
    return game;
  });

  return withRoundNames(saved).rounds[saved.rounds.length - 1];
}

export async function updateRound(userId: string, gameId: string, roundId: string, body: unknown) {
  const existing = await getOwnedGame(userId, gameId);
  assertWritable(existing);
  if (!existing.rounds.some((round) => round.id === roundId)) {
    throw new NotFoundError("Round not found");
  }

  const saved = await updateGame(existing.id, (game) => {
    assertWritable(game);
    const index = game.rounds.findIndex((round) => round.id === roundId);
    if (index < 0) throw new NotFoundError("Round not found");
    const { winnerId, calculated } = buildCalculatedScores(game, body);
    const current = game.rounds[index];
    game.rounds[index] = {
      ...current,
      winnerId,
      playerScores: calculated.map((score) => ({
        playerId: score.playerId,
        points: score.points
      })),
      updatedAt: nowIso()
    };
    game.updatedAt = nowIso();
    return game;
  });

  const round = withRoundNames(saved).rounds.find((item) => item.id === roundId);
  if (!round) throw new NotFoundError("Round not found");
  return round;
}

export async function deleteRound(userId: string, gameId: string, roundId: string) {
  const existing = await getOwnedGame(userId, gameId);
  assertWritable(existing);
  if (!existing.rounds.some((round) => round.id === roundId)) {
    throw new NotFoundError("Round not found");
  }

  await updateGame(existing.id, (game) => {
    assertWritable(game);
    game.rounds = game.rounds
      .filter((round) => round.id !== roundId)
      .map((round, index) => ({ ...round, roundNumber: index + 1 }));
    game.updatedAt = nowIso();
    return game;
  });

  return { ok: true, maxRounds: MAX_ROUNDS };
}

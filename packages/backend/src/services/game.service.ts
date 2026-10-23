import {
  createGameSchema,
  DEFAULT_SCORING_RULE,
  gamesQuerySchema,
  updateGameSchema
} from "@e-patti/shared";
import { ConflictError, ForbiddenError, NotFoundError, ValidationAppError } from "../errors";
import {
  deleteGameFile,
  findGameByIdOrRoom,
  listAllGames,
  roomIdExists,
  writeGame
} from "../storage/gameStore";
import { withLock } from "../storage/fileStore";
import { createId, nowIso, randomRoomId } from "../utils/ids";
import { computeLeaderboard, computeSettlement, computeSummary, toListItem, withRoundNames } from "./score.service";
import type { StoredGame } from "../storage/models";

async function allocateRoomId(preferred?: string): Promise<string> {
  if (preferred) {
    const code = preferred.trim().toUpperCase();
    if (await roomIdExists(code)) {
      throw new ConflictError("That room ID is already in use");
    }
    return code;
  }
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const code = randomRoomId();
    if (!(await roomIdExists(code))) return code;
  }
  throw new ConflictError("Could not allocate a unique room ID. Please try again.");
}

export async function getOwnedGame(userId: string, gameId: string): Promise<StoredGame> {
  const game = await findGameByIdOrRoom(gameId);
  if (!game) throw new NotFoundError("Game room not found");
  if (game.ownerId !== userId) {
    throw new ForbiddenError("You can only manage games that you created");
  }
  return withRoundNames(game);
}

export function assertWritable(game: StoredGame): void {
  if (game.status === "COMPLETED") {
    throw new ValidationAppError("Completed games are read-only. Reopen the game before making changes.");
  }
}

export async function createGame(userId: string, body: unknown) {
  const input = createGameSchema.parse(body);
  return withLock("games-index", async () => {
    const roomId = await allocateRoomId(input.roomId || undefined);
    const timestamp = nowIso();
    const game: StoredGame = {
      id: createId(),
      roomId,
      name: (input.name ?? "").trim(),
      ownerId: userId,
      players: input.players.map((player) => ({
        id: createId(),
        name: player.name.trim()
      })),
      rounds: [],
      scoringConfig: {
        rule: input.scoringRule ?? DEFAULT_SCORING_RULE,
        pointsToMoneyRate: input.pointsToMoneyRate ?? null
      },
      status: "ACTIVE",
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null
    };
    await writeGame(game, { backup: false });
    return withRoundNames(game);
  });
}

export async function listGames(userId: string, query: unknown) {
  const parsed = gamesQuerySchema.parse(query);
  const search = parsed.search?.trim().toLowerCase() ?? "";
  let games = (await listAllGames()).filter((game) => game.ownerId === userId);

  if (parsed.status) {
    games = games.filter((game) => game.status === parsed.status);
  }
  if (search) {
    games = games.filter((game) => {
      const haystack = `${game.roomId} ${game.name} ${game.players.map((player) => player.name).join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  games.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = games.length;
  const start = (parsed.page - 1) * parsed.pageSize;
  const items = games.slice(start, start + parsed.pageSize).map(toListItem);
  return { items, total, page: parsed.page, pageSize: parsed.pageSize };
}

export async function getGame(userId: string, gameId: string) {
  return getOwnedGame(userId, gameId);
}

export async function updateGame(userId: string, gameId: string, body: unknown) {
  const game = await getOwnedGame(userId, gameId);
  assertWritable(game);
  const input = updateGameSchema.parse(body);
  game.name = input.name === undefined ? game.name : input.name.trim();
  if (input.pointsToMoneyRate !== undefined) {
    game.scoringConfig.pointsToMoneyRate = input.pointsToMoneyRate;
  }
  game.updatedAt = nowIso();
  return withRoundNames(await writeGame(game));
}

export async function deleteGame(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  await deleteGameFile(game);
  return { ok: true };
}

export async function completeGame(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  if (game.status === "COMPLETED") {
    throw new ValidationAppError("This game is already completed");
  }
  game.status = "COMPLETED";
  game.completedAt = nowIso();
  game.updatedAt = game.completedAt;
  return withRoundNames(await writeGame(game));
}

export async function reopenGame(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  if (game.status !== "COMPLETED") {
    throw new ValidationAppError("Only completed games can be reopened");
  }
  game.status = "ACTIVE";
  game.completedAt = null;
  game.updatedAt = nowIso();
  return withRoundNames(await writeGame(game));
}

export async function getSummary(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  return computeSummary(game);
}

export async function getSettlement(userId: string, gameId: string) {
  const game = await getOwnedGame(userId, gameId);
  return computeSettlement(game);
}

export async function getLeaderboard(userId: string, gameId: string, range?: { fromRound?: number; toRound?: number }) {
  const game = await getOwnedGame(userId, gameId);
  return computeLeaderboard(game, range);
}

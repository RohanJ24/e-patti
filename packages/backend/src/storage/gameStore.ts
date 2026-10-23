import fs from "fs/promises";
import path from "path";
import { assertSafeId } from "../utils/ids";
import {
  backupFile,
  deleteFile,
  getPaths,
  readJson,
  resolveInside,
  withLock,
  writeJsonAtomic
} from "./fileStore";
import type { StoredGame } from "./models";

function gameFilePath(gameId: string): string {
  const { gamesDir } = getPaths();
  return resolveInside(gamesDir, `${assertSafeId(gameId, "game id")}.json`);
}

export async function readGame(gameId: string): Promise<StoredGame | null> {
  return readJson<StoredGame | null>(gameFilePath(gameId), null);
}

export async function listAllGames(): Promise<StoredGame[]> {
  const { gamesDir } = getPaths();
  let names: string[] = [];
  try {
    names = await fs.readdir(gamesDir);
  } catch {
    return [];
  }

  const games: StoredGame[] = [];
  for (const name of names) {
    if (!name.endsWith(".json") || name.startsWith("_") || name.endsWith(".lock")) continue;
    const filePath = path.join(gamesDir, name);
    const game = await readJson<StoredGame | null>(filePath, null);
    if (game?.id && game.roomId && Array.isArray(game.players) && Array.isArray(game.rounds)) {
      games.push(game);
    }
  }
  return games;
}

export async function findGameByRoomId(roomId: string): Promise<StoredGame | null> {
  const wanted = roomId.trim().toUpperCase();
  const games = await listAllGames();
  return games.find((game) => game.roomId === wanted) ?? null;
}

export async function findGameByIdOrRoom(gameId: string): Promise<StoredGame | null> {
  const byId = await readGame(gameId);
  if (byId) return byId;
  return findGameByRoomId(gameId);
}

export async function writeGame(game: StoredGame, options?: { backup?: boolean }): Promise<StoredGame> {
  return withLock(`game:${game.id}`, async () => {
    const filePath = gameFilePath(game.id);
    if (options?.backup !== false) {
      await backupFile(filePath, game.id);
    }
    await writeJsonAtomic(filePath, game);
    return game;
  });
}

export async function updateGame(
  gameId: string,
  mutator: (game: StoredGame) => Promise<StoredGame> | StoredGame
): Promise<StoredGame> {
  return withLock(`game:${gameId}`, async () => {
    const current = await readGame(gameId);
    if (!current) {
      throw new Error("GAME_NOT_FOUND");
    }
    const next = await mutator(current);
    const filePath = gameFilePath(gameId);
    await backupFile(filePath, gameId);
    await writeJsonAtomic(filePath, next);
    return next;
  });
}

export async function deleteGameFile(game: StoredGame): Promise<void> {
  return withLock(`game:${game.id}`, async () => {
    const filePath = gameFilePath(game.id);
    await backupFile(filePath, game.id);
    await deleteFile(filePath);
  });
}

export async function roomIdExists(roomId: string, exceptGameId?: string): Promise<boolean> {
  const existing = await findGameByRoomId(roomId);
  if (!existing) return false;
  return existing.id !== exceptGameId;
}

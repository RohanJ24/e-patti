import { leaderboardQuerySchema } from "@e-patti/shared";
import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as gameService from "../services/game.service";
import * as roundService from "../services/round.service";
import { generateGamePdf } from "../services/pdf.service";

const userId = (req: AuthedRequest) => req.user!.id;

function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function create(req: AuthedRequest, res: Response) {
  res.status(201).json({ game: await gameService.createGame(userId(req), req.body) });
}

export async function list(req: AuthedRequest, res: Response) {
  res.json(await gameService.listGames(userId(req), req.query));
}

export async function get(req: AuthedRequest, res: Response) {
  res.json({ game: await gameService.getGame(userId(req), param(req.params.gameId)) });
}

export async function update(req: AuthedRequest, res: Response) {
  res.json({ game: await gameService.updateGame(userId(req), param(req.params.gameId), req.body) });
}

export async function remove(req: AuthedRequest, res: Response) {
  res.json(await gameService.deleteGame(userId(req), param(req.params.gameId)));
}

export async function complete(req: AuthedRequest, res: Response) {
  res.json({ game: await gameService.completeGame(userId(req), param(req.params.gameId)) });
}

export async function reopen(req: AuthedRequest, res: Response) {
  res.json({ game: await gameService.reopenGame(userId(req), param(req.params.gameId)) });
}

export async function summary(req: AuthedRequest, res: Response) {
  res.json(await gameService.getSummary(userId(req), param(req.params.gameId)));
}

export async function settlement(req: AuthedRequest, res: Response) {
  res.json({ settlement: await gameService.getSettlement(userId(req), param(req.params.gameId)) });
}

export async function leaderboard(req: AuthedRequest, res: Response) {
  const query = leaderboardQuerySchema.parse(req.query);
  res.json({
    leaderboard: await gameService.getLeaderboard(userId(req), param(req.params.gameId), query)
  });
}

export async function createRound(req: AuthedRequest, res: Response) {
  res.status(201).json({ round: await roundService.createRound(userId(req), param(req.params.gameId), req.body) });
}

export async function listRounds(req: AuthedRequest, res: Response) {
  res.json({ rounds: await roundService.listRounds(userId(req), param(req.params.gameId)) });
}

export async function getRound(req: AuthedRequest, res: Response) {
  res.json({ round: await roundService.getRound(userId(req), param(req.params.gameId), param(req.params.roundId)) });
}

export async function updateRound(req: AuthedRequest, res: Response) {
  res.json({
    round: await roundService.updateRound(userId(req), param(req.params.gameId), param(req.params.roundId), req.body)
  });
}

export async function deleteRound(req: AuthedRequest, res: Response) {
  res.json(await roundService.deleteRound(userId(req), param(req.params.gameId), param(req.params.roundId)));
}

export async function exportPdf(req: AuthedRequest, res: Response) {
  const { buffer, filename } = await generateGamePdf(userId(req), param(req.params.gameId));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

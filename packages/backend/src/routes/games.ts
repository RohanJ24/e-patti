import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as games from "../controllers/games.controller";

export const gamesRouter = Router();
gamesRouter.use(requireAuth);

gamesRouter.post("/", asyncHandler(games.create));
gamesRouter.get("/", asyncHandler(games.list));
gamesRouter.get("/:gameId", asyncHandler(games.get));
gamesRouter.patch("/:gameId", asyncHandler(games.update));
gamesRouter.delete("/:gameId", asyncHandler(games.remove));
gamesRouter.post("/:gameId/complete", asyncHandler(games.complete));
gamesRouter.post("/:gameId/reopen", asyncHandler(games.reopen));
gamesRouter.get("/:gameId/summary", asyncHandler(games.summary));
gamesRouter.get("/:gameId/settlement", asyncHandler(games.settlement));
gamesRouter.get("/:gameId/leaderboard", asyncHandler(games.leaderboard));
gamesRouter.get("/:gameId/export/pdf", asyncHandler(games.exportPdf));
gamesRouter.post("/:gameId/rounds", asyncHandler(games.createRound));
gamesRouter.get("/:gameId/rounds", asyncHandler(games.listRounds));
gamesRouter.get("/:gameId/rounds/:roundId", asyncHandler(games.getRound));
gamesRouter.patch("/:gameId/rounds/:roundId", asyncHandler(games.updateRound));
gamesRouter.delete("/:gameId/rounds/:roundId", asyncHandler(games.deleteRound));

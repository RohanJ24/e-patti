import type { GameStatus, ScoringRule } from "./constants";

export type { GameStatus, ScoringRule };

export interface ScoringConfig {
  rule: ScoringRule;
  pointsToMoneyRate: number | null;
}

export interface UserPublic {
  id: string;
  fullName: string;
  mobileNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
}

export interface PlayerScore {
  playerId: string;
  playerName?: string;
  points: number;
}

export interface Round {
  id: string;
  roundNumber: number;
  winnerId: string;
  winnerName?: string;
  playerScores: PlayerScore[];
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  roomId: string;
  name: string;
  ownerId: string;
  players: Player[];
  rounds: Round[];
  scoringConfig: ScoringConfig;
  status: GameStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GameListItem {
  id: string;
  roomId: string;
  name: string;
  ownerId: string;
  playerCount: number;
  roundCount: number;
  status: GameStatus;
  updatedAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface PlayerStanding {
  playerId: string;
  playerName: string;
  seatNumber: number;
  rank: number;
  pointsWon: number;
  pointsLost: number;
  netPoints: number;
  moneyBalance: number | null;
}

export interface Leaderboard {
  gameId: string;
  roomId: string;
  status: GameStatus;
  pointsToMoneyRate: number | null;
  fromRound: number;
  toRound: number;
  standings: PlayerStanding[];
  netPointsSum: number;
}

export interface SettlementTransfer {
  payerPlayerId: string;
  payerName: string;
  receiverPlayerId: string;
  receiverName: string;
  amount: number;
  unit: "currency" | "points";
}

export interface SettlementResult {
  gameId: string;
  roomId: string;
  unit: "currency" | "points";
  pointsToMoneyRate: number | null;
  balances: PlayerStanding[];
  transfers: SettlementTransfer[];
  totalPayable: number;
  totalReceivable: number;
  payerTotals: Array<{ playerId: string; playerName: string; amount: number }>;
  receiverTotals: Array<{ playerId: string; playerName: string; amount: number }>;
  disclaimer: string;
}

export interface RoundInputScore {
  playerId: string;
  lossPoints: number;
}

export interface CalculatedRoundScore {
  playerId: string;
  lossPoints: number;
  points: number;
  isWinner: boolean;
}

export interface GameSummary {
  game: Game;
  leaderboard: Leaderboard;
  settlement: SettlementResult;
  validation: {
    totalRounds: number;
    totalPointsWon: number;
    totalPointsLost: number;
    netBalance: number;
    totalSettlementAmount: number;
    reconciles: boolean;
  };
}

export interface AuthTokens {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

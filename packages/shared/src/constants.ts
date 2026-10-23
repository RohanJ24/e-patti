export const APP_NAME = "E-Patti";
export const APP_TAGLINE = "Score tracking and settlement for Teen Patti";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const MAX_ROUNDS = 50;

export const ROOM_CODE_LENGTH = 6;
export const CUSTOM_ROOM_CODE_MIN = 4;
export const CUSTOM_ROOM_CODE_MAX = 12;

export const PHONE_REGEX = /^(?:\+91[-\s]?|91[-\s]?)?[6-9]\d{9}$/;
export const PASSWORD_MIN_LENGTH = 8;

export const GAME_STATUSES = ["ACTIVE", "COMPLETED"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const SCORING_RULES = ["winnerTakesLosses"] as const;
export type ScoringRule = (typeof SCORING_RULES)[number];

export const DEFAULT_SCORING_RULE: ScoringRule = "winnerTakesLosses";

export const SETTLEMENT_DISCLAIMER =
  "These are calculated settlement instructions only. E-Patti does not initiate, collect, hold, or verify any payment.";

export const REPORT_DISCLAIMER =
  "This report contains recorded scores and calculated settlement balances only. No real-money transaction was processed by E-Patti.";

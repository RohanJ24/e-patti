import { z } from "zod";
import {
  CUSTOM_ROOM_CODE_MAX,
  CUSTOM_ROOM_CODE_MIN,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_PLAYERS,
  PASSWORD_MIN_LENGTH,
  PHONE_REGEX,
  SCORING_RULES
} from "./constants";

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid 10-digit mobile number")
  .refine((value) => PHONE_REGEX.test(value.replace(/\s/g, "")), {
    message: "Enter a valid Indian mobile number"
  })
  .transform(normalizePhone);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    mobileNumber: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const loginSchema = z.object({
  mobileNumber: phoneSchema,
  password: z.string().min(1, "Password is required")
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
  confirmPassword: z.string().optional()
});

const playerNameSchema = z
  .string()
  .trim()
  .min(1, "Player name is required")
  .max(40, "Player name is too long");

const roomIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]*$/, "Room ID may only contain letters and numbers")
  .refine(
    (value) =>
      value.length === 0 ||
      (value.length >= CUSTOM_ROOM_CODE_MIN && value.length <= CUSTOM_ROOM_CODE_MAX),
    `Custom room ID must be ${CUSTOM_ROOM_CODE_MIN}–${CUSTOM_ROOM_CODE_MAX} characters`
  );

export const createGameSchema = z
  .object({
    roomId: roomIdSchema.optional(),
    name: z.string().trim().max(80, "Game name is too long").optional().default(""),
    pointsToMoneyRate: z
      .number()
      .positive("Conversion rate must be greater than 0")
      .max(1_000_000)
      .optional()
      .nullable(),
    scoringRule: z.enum(SCORING_RULES).optional(),
    players: z
      .array(z.object({ name: playerNameSchema }))
      .min(MIN_PLAYERS, `Add at least ${MIN_PLAYERS} players`)
      .max(MAX_PLAYERS, `A room can have at most ${MAX_PLAYERS} players`)
  })
  .superRefine((data, ctx) => {
    const names = data.players.map((player) => player.name.trim().toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Player names must be unique within a room",
        path: ["players"]
      });
    }
  });

export const updateGameSchema = z.object({
  name: z.string().trim().max(80).optional(),
  pointsToMoneyRate: z.number().positive().max(1_000_000).optional().nullable()
});

export const roundScoreInputSchema = z.object({
  playerId: z.string().min(1),
  lossPoints: z.number().min(0, "Loss points cannot be negative").max(1_000_000)
});

export const createRoundSchema = z.object({
  winnerId: z.string().min(1, "Select a winner"),
  scores: z.array(roundScoreInputSchema).min(MIN_PLAYERS).max(MAX_PLAYERS)
});

export const updateRoundSchema = createRoundSchema;

export const gamesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

export const leaderboardQuerySchema = z.object({
  fromRound: z.coerce.number().int().min(1).optional(),
  toRound: z.coerce.number().int().min(1).max(MAX_ROUNDS).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type CreateRoundInput = z.infer<typeof createRoundSchema>;

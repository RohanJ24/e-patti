import crypto from "crypto";
import { ROOM_CODE_LENGTH } from "@e-patti/shared";
import { ValidationAppError } from "../errors";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function createId(): string {
  return crypto.randomUUID();
}

export function randomRoomId(length = ROOM_CODE_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return result;
}

export function assertSafeId(value: string, label = "identifier"): string {
  if (!SAFE_ID.test(value)) {
    throw new ValidationAppError(`Invalid ${label}`);
  }
  return value;
}

export function nowIso(): string {
  return new Date().toISOString();
}

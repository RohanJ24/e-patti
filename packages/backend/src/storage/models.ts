import type { Game, UserPublic } from "@e-patti/shared";

export interface StoredUser {
  id: string;
  fullName: string;
  mobileNumber: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersFile {
  users: StoredUser[];
}

export type StoredGame = Game;

export function toPublicUser(user: StoredUser): UserPublic {
  return {
    id: user.id,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

import { loginSchema, registerSchema, updateProfileSchema } from "@e-patti/shared";
import { config } from "../config";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationAppError } from "../errors";
import { signAccessToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { findUserById, findUserByMobile, saveUser } from "../storage/userStore";
import { toPublicUser } from "../storage/models";
import { createId, nowIso } from "../utils/ids";

export async function registerUser(body: unknown) {
  const input = registerSchema.parse(body);
  const existing = await findUserByMobile(input.mobileNumber);
  if (existing) {
    throw new ConflictError("An account with this mobile number already exists");
  }

  const timestamp = nowIso();
  const user = await saveUser({
    id: createId(),
    fullName: input.fullName.trim(),
    mobileNumber: input.mobileNumber,
    passwordHash: await hashPassword(input.password),
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, mobileNumber: user.mobileNumber }),
    tokenType: "Bearer" as const,
    expiresIn: config.jwtExpiresIn
  };
}

export async function loginUser(body: unknown) {
  const input = loginSchema.parse(body);
  const user = await findUserByMobile(input.mobileNumber);
  if (!user) {
    throw new UnauthorizedError("Invalid mobile number or password");
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw new UnauthorizedError("Invalid mobile number or password");
  }
  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ sub: user.id, mobileNumber: user.mobileNumber }),
    tokenType: "Bearer" as const,
    expiresIn: config.jwtExpiresIn
  };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user);
}

export async function updateProfile(userId: string, body: unknown) {
  const input = updateProfileSchema.parse(body);
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("User not found");

  if (input.fullName) user.fullName = input.fullName.trim();
  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new ValidationAppError("Current password is required to set a new password");
    }
    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) throw new ValidationAppError("Current password is incorrect");
    if (input.confirmPassword && input.confirmPassword !== input.newPassword) {
      throw new ValidationAppError("Passwords do not match");
    }
    user.passwordHash = await hashPassword(input.newPassword);
  }

  user.updatedAt = nowIso();
  const saved = await saveUser(user);
  return toPublicUser(saved);
}

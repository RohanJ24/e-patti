import jwt from "jsonwebtoken";
import { config } from "../config";
import { UnauthorizedError } from "../errors";

export interface JwtPayload {
  sub: string;
  mobileNumber: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded === "string" || !decoded.sub || typeof decoded.mobileNumber !== "string") {
      throw new UnauthorizedError("Invalid session");
    }
    return { sub: decoded.sub, mobileNumber: decoded.mobileNumber };
  } catch {
    throw new UnauthorizedError("Session expired or invalid. Please log in again.");
  }
}

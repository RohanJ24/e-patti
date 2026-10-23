import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { findUserById } from "../storage/userStore";
import { UnauthorizedError } from "../errors";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    fullName: string;
    mobileNumber: string;
  };
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedError("Account no longer exists");
    }
    req.user = { id: user.id, fullName: user.fullName, mobileNumber: user.mobileNumber };
    next();
  } catch (error) {
    next(error);
  }
}

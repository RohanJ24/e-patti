import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as authService from "../services/auth.service";

export async function register(req: AuthedRequest, res: Response) {
  res.status(201).json(await authService.registerUser(req.body));
}

export async function login(req: AuthedRequest, res: Response) {
  res.json(await authService.loginUser(req.body));
}

export function logout(_req: AuthedRequest, res: Response) {
  res.json({ message: "Logged out. Discard the access token on the client." });
}

export async function me(req: AuthedRequest, res: Response) {
  res.json({ user: await authService.getCurrentUser(req.user!.id) });
}

export async function updateMe(req: AuthedRequest, res: Response) {
  res.json({ user: await authService.updateProfile(req.user!.id, req.body) });
}

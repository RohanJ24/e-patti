import { Router } from "express";
import { authLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as authController from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(authController.register));
authRouter.post("/login", authLimiter, asyncHandler(authController.login));
authRouter.post("/logout", requireAuth, asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.patch("/me", requireAuth, asyncHandler(authController.updateMe));

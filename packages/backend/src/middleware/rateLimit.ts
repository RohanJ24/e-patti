import rateLimit from "express-rate-limit";
import { config } from "../config";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many attempts. Please wait a few minutes and try again."
    }
  }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 180,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest
});

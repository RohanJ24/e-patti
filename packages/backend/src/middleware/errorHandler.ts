import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ScoringError, SettlementError } from "@e-patti/shared";
import { AppError } from "../errors";
import { config } from "../config";

function isZodError(err: unknown): err is ZodError {
  return (
    err instanceof ZodError ||
    Boolean(
      err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name?: string }).name === "ZodError" &&
        "issues" in err &&
        Array.isArray((err as { issues: unknown }).issues)
    )
  );
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isZodError(err)) {
    const issues = err.issues ?? [];
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: issues[0]?.message ?? "Invalid request",
        details: issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      }
    });
  }

  if (err instanceof ScoringError || err instanceof SettlementError) {
    return res.status(400).json({
      error: { code: "GAME_RULE_ERROR", message: err.message }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message }
    });
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  if (message === "ROOM_CODE_TAKEN") {
    return res.status(409).json({
      error: { code: "CONFLICT", message: "That room ID is already in use" }
    });
  }
  if (message === "GAME_NOT_FOUND") {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Game room not found" }
    });
  }

  console.error("Unhandled error", config.isProd ? (err instanceof Error ? err.message : "error") : err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again."
    }
  });
}

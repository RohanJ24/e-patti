import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { gamesRouter } from "./routes/games";
import { openApiDocument } from "./swagger";
import { ensureStorage } from "./storage/fileStore";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(
    cors({
      origin: config.isProd ? config.corsOrigin.split(",").map((value) => value.trim()) : true,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  if (!config.isTest) {
    app.use(morgan(config.isProd ? "combined" : "dev"));
  }
  app.use(apiLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "e-patti-api", storage: "json-files" });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: "E-Patti API" }));
  app.get("/openapi.json", (_req, res) => res.json(openApiDocument));

  app.use(`${config.apiPrefix}/auth`, authRouter);
  app.use(`${config.apiPrefix}/games`, gamesRouter);

  app.use(errorHandler);
  return app;
}

export async function bootstrapStorage(): Promise<void> {
  await ensureStorage();
}

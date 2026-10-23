import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const repoRoot = path.resolve(__dirname, "../../..");

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveDir(envName: string, fallback: string): string {
  const value = process.env[envName];
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test" || process.env.VITEST === "true",
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? "0.0.0.0",
  apiPrefix: process.env.API_PREFIX ?? "/api",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  jwtSecret: required("JWT_SECRET", "dev-only-change-me-please-use-a-long-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  logLevel: process.env.LOG_LEVEL ?? "info",
  trustProxy: process.env.TRUST_PROXY === "true",
  get dataDir() {
    return resolveDir("DATA_DIR", path.join(repoRoot, "data"));
  },
  get generatedDir() {
    return resolveDir("GENERATED_DIR", path.join(repoRoot, "generated"));
  },
  pdfRetentionHours: Number(process.env.PDF_RETENTION_HOURS ?? 24)
};

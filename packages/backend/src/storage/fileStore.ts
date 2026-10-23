import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { config } from "../config";
import { ValidationAppError } from "../errors";

const queues = new Map<string, Promise<unknown>>();

export function getPaths() {
  const dataDir = config.dataDir;
  const generatedDir = config.generatedDir;
  return {
    dataDir,
    generatedDir,
    usersDir: path.join(dataDir, "users"),
    usersFile: path.join(dataDir, "users", "users.json"),
    gamesDir: path.join(dataDir, "games"),
    backupsDir: path.join(dataDir, "backups"),
    pdfDir: path.join(generatedDir, "pdf")
  };
}

export async function ensureStorage(): Promise<void> {
  const paths = getPaths();
  await fs.mkdir(paths.usersDir, { recursive: true });
  await fs.mkdir(paths.gamesDir, { recursive: true });
  await fs.mkdir(paths.backupsDir, { recursive: true });
  await fs.mkdir(paths.pdfDir, { recursive: true });
}

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  queues.set(
    key,
    current.then(
      () => undefined,
      () => undefined
    )
  );
  return current;
}

async function acquireLock(lockPath: string, timeoutMs = 8000): Promise<() => Promise<void>> {
  const started = Date.now();
  while (true) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.writeFile(`${process.pid}:${Date.now()}`);
      return async () => {
        await handle.close().catch(() => undefined);
        await fs.unlink(lockPath).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      if (Date.now() - started > timeoutMs) {
        try {
          const stat = await fs.stat(lockPath);
          if (Date.now() - stat.mtimeMs > timeoutMs) {
            await fs.unlink(lockPath).catch(() => undefined);
            continue;
          }
        } catch {
          continue;
        }
        throw new Error(`Timed out waiting for file lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 20)));
    }
  }
}

export async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const paths = getPaths();
  const safeKey = key.replace(/[^A-Za-z0-9._-]/g, "_");
  return enqueue(key, async () => {
    await ensureStorage();
    const release = await acquireLock(path.join(paths.dataDir, `${safeKey}.lock`));
    try {
      return await task();
    } finally {
      await release();
    }
  });
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  try {
    JSON.parse(json);
  } catch {
    throw new ValidationAppError("Refusing to write invalid JSON");
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${crypto.randomBytes(8).toString("hex")}.tmp`;
  await fs.writeFile(tempPath, json, { encoding: "utf8", mode: 0o600 });
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    await fs.copyFile(tempPath, filePath);
    await fs.unlink(tempPath).catch(() => undefined);
  }
}

export async function backupFile(sourcePath: string, label: string): Promise<void> {
  try {
    await fs.access(sourcePath);
  } catch {
    return;
  }
  const paths = getPaths();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(paths.backupsDir, `${label}-${stamp}.json`);
  await fs.copyFile(sourcePath, dest);
  await pruneBackups(label);
}

async function pruneBackups(label: string, keep = 10): Promise<void> {
  const paths = getPaths();
  const entries = await fs.readdir(paths.backupsDir);
  const matching = entries
    .filter((name) => name.startsWith(`${label}-`) && name.endsWith(".json"))
    .sort()
    .reverse();
  await Promise.all(
    matching.slice(keep).map((name) => fs.unlink(path.join(paths.backupsDir, name)).catch(() => undefined))
  );
}

export async function deleteFile(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => undefined);
}

export function resolveInside(root: string, ...segments: string[]): string {
  const resolved = path.resolve(root, ...segments);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new ValidationAppError("Invalid file path");
  }
  return resolved;
}

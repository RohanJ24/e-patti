import { config } from "./config";
import { bootstrapStorage, createApp } from "./app";

async function main() {
  await bootstrapStorage();
  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    console.log(`E-Patti API listening on http://${config.host}:${config.port}`);
    console.log(`API docs: http://localhost:${config.port}/docs`);
    console.log(`JSON data directory: ${config.dataDir}`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Failed to start");
  process.exit(1);
});

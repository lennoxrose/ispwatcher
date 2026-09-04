import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db/index.js";
import { startMonitorScheduler, stopMonitorScheduler } from "./scheduler/monitor-scheduler.js";

const app = buildApp();
startMonitorScheduler();

async function shutdown(): Promise<void> {
  stopMonitorScheduler();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: config.server.port, host: config.server.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

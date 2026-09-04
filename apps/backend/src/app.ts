import Fastify, { type FastifyError } from "fastify";
import { checkDbHealth } from "./db/index.js";
import { contractRoutes } from "./modules/contract/contract.routes.js";
import { campaignRoutes } from "./modules/campaign/campaign.routes.js";
import { monitoringRoutes } from "./modules/monitoring/monitoring.routes.js";
import { NotFoundError, ValidationError, ConflictError } from "./shared/errors.js";
import { logger } from "./lib/logger.js";

export function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof NotFoundError) {
      reply.code(404).send({ error: error.message });
      return;
    }
    if (error instanceof ValidationError) {
      reply.code(400).send({ error: error.message });
      return;
    }
    if (error instanceof ConflictError) {
      reply.code(409).send({ error: error.message });
      return;
    }
    if (error.validation) {
      reply.code(400).send({ error: error.message });
      return;
    }
    app.log.error(error);
    reply.code(500).send({ error: "Internal server error" });
  });

  app.get("/health", async (_request, reply) => {
    const dbHealthy = await checkDbHealth();
    reply.code(dbHealthy ? 200 : 503).send({
      status: dbHealthy ? "ok" : "unhealthy",
      db: dbHealthy,
    });
  });

  app.register(contractRoutes, { prefix: "/contracts" });
  app.register(campaignRoutes, { prefix: "/campaigns" });
  app.register(monitoringRoutes, { prefix: "/monitoring" });

  return app;
}

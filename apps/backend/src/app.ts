import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { checkDbHealth } from "./db/index.js";
import { contractRoutes } from "./modules/contract/contract.routes.js";
import { campaignRoutes } from "./modules/campaign/campaign.routes.js";
import { monitoringRoutes } from "./modules/monitoring/monitoring.routes.js";
import { protocolRoutes } from "./modules/protocol/protocol.routes.js";
import { complaintRoutes } from "./modules/complaint/complaint.routes.js";
import { settingsRoutes } from "./modules/settings/settings.routes.js";
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from "./shared/errors.js";
import { requireAuth } from "./shared/auth.js";
import { logger } from "./lib/logger.js";

export function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  // Reflects the request's own origin rather than a fixed allowlist — this
  // is a single-user tool with its own token-based auth as the real
  // boundary (see shared/auth.ts), not a public multi-tenant API.
  app.register(cors, { origin: true });

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
    if (error instanceof UnauthorizedError) {
      reply.code(401).send({ error: error.message });
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

  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Everything except /health requires a valid API token — wrapped in its
  // own encapsulated context so the hook doesn't apply outside it.
  app.register(async (protectedApp) => {
    protectedApp.addHook("onRequest", requireAuth);

    protectedApp.register(contractRoutes, { prefix: "/contracts" });
    protectedApp.register(campaignRoutes, { prefix: "/campaigns" });
    protectedApp.register(protocolRoutes, { prefix: "/campaigns" });
    protectedApp.register(monitoringRoutes, { prefix: "/monitoring" });
    protectedApp.register(complaintRoutes, { prefix: "/complaints" });
    protectedApp.register(settingsRoutes, { prefix: "/settings" });
  });

  return app;
}

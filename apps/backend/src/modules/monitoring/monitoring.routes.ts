import type { FastifyInstance } from "fastify";
import * as monitoringController from "./monitoring.controller.js";

const dashboardSchema = {
  params: {
    type: "object",
    required: ["contractId"],
    properties: {
      contractId: { type: "string", pattern: "^[0-9]+$" },
    },
  },
  querystring: {
    type: "object",
    properties: {
      windowDays: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

export async function monitoringRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:contractId", { schema: dashboardSchema }, monitoringController.getDashboard);
}

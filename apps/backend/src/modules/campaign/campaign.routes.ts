import type { FastifyInstance } from "fastify";
import * as campaignController from "./campaign.controller.js";

const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

const createCampaignSchema = {
  body: {
    type: "object",
    required: ["contractId"],
    properties: {
      contractId: { type: "integer" },
    },
  },
};

const updateStatusSchema = {
  ...idParamSchema,
  body: {
    type: "object",
    required: ["status"],
    properties: {
      status: { type: "string", enum: ["RUNNING", "COMPLETE", "FAILED_INSUFFICIENT_DATA"] },
    },
  },
};

const logMeasurementSchema = {
  ...idParamSchema,
  body: {
    type: "object",
    required: ["downloadMbit", "uploadMbit", "pingMs"],
    properties: {
      downloadMbit: { type: "number", minimum: 0 },
      uploadMbit: { type: "number", minimum: 0 },
      pingMs: { type: "number", minimum: 0 },
    },
  },
};

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", campaignController.list);
  app.get("/:id", { schema: idParamSchema }, campaignController.get);
  app.post("/", { schema: createCampaignSchema }, campaignController.create);
  app.patch("/:id/status", { schema: updateStatusSchema }, campaignController.updateStatus);
  app.get("/:id/gate", { schema: idParamSchema }, campaignController.getGate);
  app.post(
    "/:id/measurements",
    { schema: logMeasurementSchema },
    campaignController.logMeasurement,
  );
  app.get("/:id/evaluate", { schema: idParamSchema }, campaignController.evaluate);
}

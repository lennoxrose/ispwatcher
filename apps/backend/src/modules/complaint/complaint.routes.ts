import type { FastifyInstance } from "fastify";
import * as complaintController from "./complaint.controller.js";

const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

const generateSchema = {
  body: {
    type: "object",
    required: ["contractId"],
    properties: {
      contractId: { type: "integer" },
      campaignId: { type: "integer" },
    },
  },
};

const reductionPercentSchema = {
  ...idParamSchema,
  body: {
    type: "object",
    required: ["mode"],
    properties: {
      mode: { type: "string", enum: ["AUTO", "MANUAL"] },
      value: { type: "number" },
    },
  },
};

export async function complaintRoutes(app: FastifyInstance): Promise<void> {
  app.post("/", { schema: generateSchema }, complaintController.generate);
  app.get("/:id", { schema: idParamSchema }, complaintController.get);
  app.get("/:id/file", { schema: idParamSchema }, complaintController.downloadFile);
  app.patch(
    "/:id/reduction-percent",
    { schema: reductionPercentSchema },
    complaintController.setReductionPercent,
  );
  app.patch("/:id/sent", { schema: idParamSchema }, complaintController.markSent);
}

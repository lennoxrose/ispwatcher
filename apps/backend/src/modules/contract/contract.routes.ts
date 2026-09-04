import type { FastifyInstance } from "fastify";
import * as contractController from "./contract.controller.js";

const speedFields = {
  maxSpeedMbit: { type: "number" },
  normalSpeedMbit: { type: "number" },
  minSpeedMbit: { type: "number" },
};

const createContractSchema = {
  body: {
    type: "object",
    required: ["ispName", "ispAddress", "maxSpeedMbit", "normalSpeedMbit", "minSpeedMbit"],
    properties: {
      ispName: { type: "string", minLength: 1 },
      ispAddress: { type: "string", minLength: 1 },
      ...speedFields,
    },
  },
};

const updateContractSchema = {
  body: {
    type: "object",
    minProperties: 1,
    properties: {
      ispName: { type: "string", minLength: 1 },
      ispAddress: { type: "string", minLength: 1 },
      ...speedFields,
    },
  },
};

const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

export async function contractRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", contractController.list);
  app.get("/:id", { schema: idParamSchema }, contractController.get);
  app.post("/", { schema: createContractSchema }, contractController.create);
  app.patch(
    "/:id",
    { schema: { ...idParamSchema, ...updateContractSchema } },
    contractController.update,
  );
  app.delete("/:id", { schema: idParamSchema }, contractController.remove);
}

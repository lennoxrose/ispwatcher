import type { FastifyInstance } from "fastify";
import * as protocolController from "./protocol.controller.js";

const idParamSchema = {
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", pattern: "^[0-9]+$" },
    },
  },
};

export async function protocolRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:id/protocol", { schema: idParamSchema }, protocolController.get);
  app.post("/:id/protocol", { schema: idParamSchema }, protocolController.upload);
  app.get("/:id/protocol/file", { schema: idParamSchema }, protocolController.download);
}

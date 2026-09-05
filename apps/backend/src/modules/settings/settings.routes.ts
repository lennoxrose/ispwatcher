import type { FastifyInstance } from "fastify";
import * as settingsController from "./settings.controller.js";

const updateIdentitySchema = {
  body: {
    type: "object",
    required: ["senderName", "senderAddress", "senderCity"],
    properties: {
      senderName: { type: "string" },
      senderAddress: { type: "string" },
      senderCity: { type: "string" },
    },
  },
};

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", settingsController.get);
  app.patch("/", { schema: updateIdentitySchema }, settingsController.updateIdentity);
  app.post("/regenerate-token", settingsController.regenerateToken);
}

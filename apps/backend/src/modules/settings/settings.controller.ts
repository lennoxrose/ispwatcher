import type { FastifyReply, FastifyRequest } from "fastify";
import * as settingsService from "./settings.service.js";
import type { UpdateIdentityInput } from "./settings.types.js";

export async function get(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const settings = await settingsService.getSettings();
  reply.send(settings);
}

export async function updateIdentity(
  request: FastifyRequest<{ Body: UpdateIdentityInput }>,
  reply: FastifyReply,
): Promise<void> {
  const settings = await settingsService.updateIdentity(request.body);
  reply.send(settings);
}

export async function regenerateToken(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const settings = await settingsService.regenerateToken();
  reply.send(settings);
}

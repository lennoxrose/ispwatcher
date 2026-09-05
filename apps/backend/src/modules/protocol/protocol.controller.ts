import type { FastifyReply, FastifyRequest } from "fastify";
import { ValidationError } from "../../shared/errors.js";
import * as protocolService from "./protocol.service.js";

export async function get(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const protocol = await protocolService.getProtocol(Number(request.params.id));
  if (!protocol) {
    reply.code(404).send({ error: "No official protocol uploaded for this campaign" });
    return;
  }
  reply.send({ uploadedAt: protocol.uploadedAt });
}

export async function upload(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const file = await request.file();
  if (!file) {
    throw new ValidationError("No file was uploaded");
  }
  const fileBuffer = await file.toBuffer();
  const protocol = await protocolService.uploadProtocol({
    campaignId: Number(request.params.id),
    fileBuffer,
  });
  reply.code(201).send({ uploadedAt: protocol.uploadedAt });
}

export async function download(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const buffer = await protocolService.getProtocolFile(Number(request.params.id));
  reply.type("application/pdf").send(buffer);
}

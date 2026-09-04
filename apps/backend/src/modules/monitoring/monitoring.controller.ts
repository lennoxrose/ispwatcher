import type { FastifyReply, FastifyRequest } from "fastify";
import * as monitoringService from "./monitoring.service.js";

export async function getDashboard(
  request: FastifyRequest<{ Params: { contractId: string }; Querystring: { windowDays?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const contractId = Number(request.params.contractId);
  const windowDays = request.query.windowDays ? Number(request.query.windowDays) : undefined;
  const dashboard = await monitoringService.getDashboard(contractId, windowDays);
  reply.send(dashboard);
}

import type { FastifyReply, FastifyRequest } from "fastify";
import * as campaignService from "./campaign.service.js";
import type { CampaignStatus, CreateCampaignInput, LogMeasurementInput } from "./campaign.types.js";

export async function list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const campaigns = await campaignService.listCampaigns();
  reply.send(campaigns);
}

export async function get(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const campaign = await campaignService.getCampaign(Number(request.params.id));
  reply.send(campaign);
}

export async function create(
  request: FastifyRequest<{ Body: CreateCampaignInput }>,
  reply: FastifyReply,
): Promise<void> {
  const campaign = await campaignService.createCampaign(request.body);
  reply.code(201).send(campaign);
}

export async function updateStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: CampaignStatus } }>,
  reply: FastifyReply,
): Promise<void> {
  const campaign = await campaignService.transitionStatus(
    Number(request.params.id),
    request.body.status,
  );
  reply.send(campaign);
}

export async function getGate(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const gate = await campaignService.getMeasurementGate(Number(request.params.id));
  reply.send(gate);
}

export async function logMeasurement(
  request: FastifyRequest<{ Params: { id: string }; Body: LogMeasurementInput }>,
  reply: FastifyReply,
): Promise<void> {
  const measurement = await campaignService.logMeasurement(
    Number(request.params.id),
    request.body,
  );
  reply.code(201).send(measurement);
}

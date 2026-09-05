import type { FastifyReply, FastifyRequest } from "fastify";
import * as complaintService from "./complaint.service.js";
import type { GenerateComplaintInput, SetReductionPercentInput } from "./complaint.types.js";

export async function generate(
  request: FastifyRequest<{ Body: GenerateComplaintInput }>,
  reply: FastifyReply,
): Promise<void> {
  const complaint = await complaintService.generateComplaint(request.body);
  reply.code(201).send(complaint);
}

export async function get(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const complaint = await complaintService.getComplaint(Number(request.params.id));
  reply.send(complaint);
}

export async function downloadFile(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const buffer = await complaintService.getComplaintFile(Number(request.params.id));
  reply.type("application/pdf").send(buffer);
}

export async function setReductionPercent(
  request: FastifyRequest<{ Params: { id: string }; Body: SetReductionPercentInput }>,
  reply: FastifyReply,
): Promise<void> {
  const complaint = await complaintService.setReductionPercent(
    Number(request.params.id),
    request.body,
  );
  reply.send(complaint);
}

export async function markSent(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const complaint = await complaintService.markSent(Number(request.params.id));
  reply.send(complaint);
}

import type { FastifyReply, FastifyRequest } from "fastify";
import * as contractService from "./contract.service.js";
import type { CreateContractInput, UpdateContractInput } from "./contract.types.js";

export async function list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const contracts = await contractService.listContracts();
  reply.send(contracts);
}

export async function get(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const contract = await contractService.getContract(Number(request.params.id));
  reply.send(contract);
}

export async function create(
  request: FastifyRequest<{ Body: CreateContractInput }>,
  reply: FastifyReply,
): Promise<void> {
  const contract = await contractService.createContract(request.body);
  reply.code(201).send(contract);
}

export async function update(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateContractInput }>,
  reply: FastifyReply,
): Promise<void> {
  const contract = await contractService.updateContract(Number(request.params.id), request.body);
  reply.send(contract);
}

export async function remove(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  await contractService.deleteContract(Number(request.params.id));
  reply.code(204).send();
}

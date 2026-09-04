import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { contractRepository } from "./contract.repository.js";
import type { Contract, CreateContractInput, UpdateContractInput } from "./contract.types.js";

function validateSpeeds(speeds: {
  maxSpeedMbit: number;
  normalSpeedMbit: number;
  minSpeedMbit: number;
}): void {
  const { maxSpeedMbit, normalSpeedMbit, minSpeedMbit } = speeds;
  if (maxSpeedMbit <= 0 || normalSpeedMbit <= 0 || minSpeedMbit <= 0) {
    throw new ValidationError("Speed values must be greater than zero");
  }
  if (!(maxSpeedMbit >= normalSpeedMbit && normalSpeedMbit >= minSpeedMbit)) {
    throw new ValidationError(
      "Speed values must satisfy maxSpeedMbit >= normalSpeedMbit >= minSpeedMbit",
    );
  }
}

export async function listContracts(): Promise<Contract[]> {
  return contractRepository.findAll();
}

export async function getContract(id: number): Promise<Contract> {
  const contract = await contractRepository.findById(id);
  if (!contract) {
    throw new NotFoundError("Contract", id);
  }
  return contract;
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  validateSpeeds(input);
  return contractRepository.create(input);
}

export async function updateContract(
  id: number,
  input: UpdateContractInput,
): Promise<Contract> {
  const existing = await getContract(id);
  validateSpeeds({
    maxSpeedMbit: input.maxSpeedMbit ?? existing.maxSpeedMbit,
    normalSpeedMbit: input.normalSpeedMbit ?? existing.normalSpeedMbit,
    minSpeedMbit: input.minSpeedMbit ?? existing.minSpeedMbit,
  });
  return contractRepository.update(id, input);
}

export async function deleteContract(id: number): Promise<void> {
  await contractRepository.remove(id);
}

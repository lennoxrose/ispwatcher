import type { Contract as ContractModel } from "../../generated/prisma/client.js";

export type Contract = ContractModel;

export type CreateContractInput = Omit<Contract, "id" | "createdAt">;

export type UpdateContractInput = Partial<CreateContractInput>;

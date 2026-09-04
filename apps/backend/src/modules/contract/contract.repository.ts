import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { Contract, CreateContractInput, UpdateContractInput } from "./contract.types.js";

export const contractRepository = {
  async findAll(): Promise<Contract[]> {
    return prisma.contract.findMany({ orderBy: { createdAt: "desc" } });
  },

  async findById(id: number): Promise<Contract | null> {
    return prisma.contract.findUnique({ where: { id } });
  },

  async create(data: CreateContractInput): Promise<Contract> {
    return prisma.contract.create({ data });
  },

  async update(id: number, data: UpdateContractInput): Promise<Contract> {
    try {
      return await prisma.contract.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Contract", id);
      }
      throw error;
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await prisma.contract.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundError("Contract", id);
        }
        if (error.code === "P2003") {
          throw new ConflictError(
            `Contract ${id} has campaigns and cannot be deleted`,
          );
        }
      }
      throw error;
    }
  },
};

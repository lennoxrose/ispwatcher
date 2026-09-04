import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { NotFoundError } from "../../shared/errors.js";
import type { MonitoringRun, RecordMonitoringRunInput } from "./monitoring.types.js";

const RECENT_RUNS_LIMIT = 50;

export const monitoringRepository = {
  async create(data: RecordMonitoringRunInput): Promise<MonitoringRun> {
    try {
      return await prisma.monitoringRun.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundError("Contract", data.contractId);
      }
      throw error;
    }
  },

  async findRecent(contractId: number, limit: number = RECENT_RUNS_LIMIT): Promise<MonitoringRun[]> {
    return prisma.monitoringRun.findMany({
      where: { contractId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  },

  async findSince(contractId: number, since: Date): Promise<MonitoringRun[]> {
    return prisma.monitoringRun.findMany({
      where: { contractId, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
    });
  },
};

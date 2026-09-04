import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import { NotFoundError } from "../../shared/errors.js";
import type {
  Campaign,
  CampaignStatus,
  CampaignWithDetails,
  CreateCampaignInput,
} from "./campaign.types.js";

export const campaignRepository = {
  async findAll(): Promise<Campaign[]> {
    return prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  },

  async findById(id: number): Promise<Campaign | null> {
    return prisma.campaign.findUnique({ where: { id } });
  },

  async findByIdWithDetails(id: number): Promise<CampaignWithDetails | null> {
    return prisma.campaign.findUnique({
      where: { id },
      include: { measurements: true, contract: true },
    });
  },

  async create(data: CreateCampaignInput): Promise<Campaign> {
    try {
      return await prisma.campaign.create({ data: { contractId: data.contractId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new NotFoundError("Contract", data.contractId);
      }
      throw error;
    }
  },

  async updateStatus(
    id: number,
    data: { status: CampaignStatus; startedAt?: Date; completedAt?: Date },
  ): Promise<Campaign> {
    try {
      return await prisma.campaign.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Campaign", id);
      }
      throw error;
    }
  },
};

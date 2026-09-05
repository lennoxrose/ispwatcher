import { prisma } from "../../db/index.js";
import type { OfficialProtocol } from "./protocol.types.js";

export const protocolRepository = {
  async findByCampaignId(campaignId: number): Promise<OfficialProtocol | null> {
    return prisma.officialProtocol.findUnique({ where: { campaignId } });
  },

  async upsert(campaignId: number, data: { filePath: string }): Promise<OfficialProtocol> {
    return prisma.officialProtocol.upsert({
      where: { campaignId },
      create: { campaignId, filePath: data.filePath },
      update: { filePath: data.filePath, uploadedAt: new Date() },
    });
  },
};

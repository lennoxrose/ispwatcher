import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../db/index.js";
import type { ComplaintDraft } from "./complaint.types.js";

type ComplaintDraftWrite = Prisma.ComplaintDraftUncheckedCreateInput;

export const complaintRepository = {
  async findById(id: number): Promise<ComplaintDraft | null> {
    return prisma.complaintDraft.findUnique({ where: { id } });
  },

  async findByCampaignId(campaignId: number): Promise<ComplaintDraft | null> {
    return prisma.complaintDraft.findFirst({ where: { campaignId } });
  },

  async findInformalByContractId(contractId: number): Promise<ComplaintDraft | null> {
    return prisma.complaintDraft.findFirst({ where: { contractId, campaignId: null } });
  },

  async create(data: ComplaintDraftWrite): Promise<ComplaintDraft> {
    return prisma.complaintDraft.create({ data });
  },

  async update(id: number, data: Partial<ComplaintDraftWrite>): Promise<ComplaintDraft> {
    return prisma.complaintDraft.update({ where: { id }, data });
  },
};

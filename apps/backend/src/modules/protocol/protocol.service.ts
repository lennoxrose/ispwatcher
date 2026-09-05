import { readFile } from "node:fs/promises";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import { writeDataFile } from "../../lib/file-storage.js";
import { campaignRepository } from "../campaign/campaign.repository.js";
import { protocolRepository } from "./protocol.repository.js";
import type { OfficialProtocol, UploadProtocolInput } from "./protocol.types.js";

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function getProtocol(campaignId: number): Promise<OfficialProtocol | null> {
  return protocolRepository.findByCampaignId(campaignId);
}

export async function getProtocolFile(campaignId: number): Promise<Buffer> {
  const protocol = await protocolRepository.findByCampaignId(campaignId);
  if (!protocol) {
    throw new NotFoundError("OfficialProtocol", campaignId);
  }
  return readFile(protocol.filePath);
}

// Re-uploading replaces the previous file in place — same deterministic
// path per campaign, so this is just an overwrite, not a rename+delete.
export async function uploadProtocol(input: UploadProtocolInput): Promise<OfficialProtocol> {
  const campaign = await campaignRepository.findById(input.campaignId);
  if (!campaign) {
    throw new NotFoundError("Campaign", input.campaignId);
  }
  if (!isPdf(input.fileBuffer)) {
    throw new ValidationError("Official protocol upload must be a PDF file");
  }

  const filePath = await writeDataFile(`protocols/${input.campaignId}.pdf`, input.fileBuffer);
  return protocolRepository.upsert(input.campaignId, { filePath });
}

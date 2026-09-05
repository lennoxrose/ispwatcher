import type { OfficialProtocol as OfficialProtocolModel } from "../../generated/prisma/client.js";

export type OfficialProtocol = OfficialProtocolModel;

export type UploadProtocolInput = {
  campaignId: number;
  fileBuffer: Buffer;
};

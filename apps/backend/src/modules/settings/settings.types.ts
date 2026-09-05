import type { Settings as SettingsModel } from "../../generated/prisma/client.js";

export type Settings = SettingsModel;

export type UpdateIdentityInput = {
  senderName: string;
  senderAddress: string;
  senderCity: string;
};

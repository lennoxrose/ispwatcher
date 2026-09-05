import { randomBytes } from "node:crypto";
import { config } from "../../config.js";
import { settingsRepository } from "./settings.repository.js";
import type { Settings, UpdateIdentityInput } from "./settings.types.js";

export async function getSettings(): Promise<Settings> {
  return settingsRepository.getOrCreate(config.auth.bootstrapToken);
}

export async function updateIdentity(input: UpdateIdentityInput): Promise<Settings> {
  const settings = await getSettings();
  return settingsRepository.updateIdentity(settings.id, input);
}

export async function regenerateToken(): Promise<Settings> {
  const settings = await getSettings();
  const newToken = randomBytes(24).toString("hex");
  return settingsRepository.updateToken(settings.id, newToken);
}

export async function verifyToken(presented: string | undefined): Promise<boolean> {
  if (!presented) {
    return false;
  }
  const settings = await getSettings();
  return settings.apiToken === presented;
}

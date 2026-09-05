import { prisma } from "../../db/index.js";
import type { Settings, UpdateIdentityInput } from "./settings.types.js";

export const settingsRepository = {
  async get(): Promise<Settings | null> {
    return prisma.settings.findFirst();
  },

  // Singleton bootstrap — only ever creates a row if none exists yet.
  async getOrCreate(bootstrapToken: string): Promise<Settings> {
    const existing = await prisma.settings.findFirst();
    if (existing) {
      return existing;
    }
    return prisma.settings.create({ data: { apiToken: bootstrapToken } });
  },

  async updateIdentity(id: number, data: UpdateIdentityInput): Promise<Settings> {
    return prisma.settings.update({ where: { id }, data });
  },

  async updateToken(id: number, apiToken: string): Promise<Settings> {
    return prisma.settings.update({ where: { id }, data: { apiToken } });
  },
};

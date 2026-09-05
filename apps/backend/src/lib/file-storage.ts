import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

// Shared by the protocol upload and complaint PDF generation paths — both
// just need "write this buffer under dataDir, creating folders as needed."
export async function writeDataFile(relativePath: string, data: Buffer): Promise<string> {
  const absolutePath = path.join(config.storage.dataDir, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, data);
  return absolutePath;
}

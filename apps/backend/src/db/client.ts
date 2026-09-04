import { PrismaClient } from "../generated/prisma/client.js";
import { createAdapter } from "./adapter.js";

export const prisma = new PrismaClient({ adapter: createAdapter() });

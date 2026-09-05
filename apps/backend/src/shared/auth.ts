import type { FastifyRequest } from "fastify";
import * as settingsService from "../modules/settings/settings.service.js";
import { UnauthorizedError } from "./errors.js";

const BEARER_PREFIX = "Bearer ";

export async function requireAuth(request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization;
  const presented = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : undefined;

  if (!(await settingsService.verifyToken(presented))) {
    throw new UnauthorizedError();
  }
}

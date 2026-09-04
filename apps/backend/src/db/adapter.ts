import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "../config.js";

export function createAdapter(): PrismaMariaDb {
  return new PrismaMariaDb({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.name,
    connectionLimit: 5,
  });
}

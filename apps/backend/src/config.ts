import "dotenv/config";

interface Config {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  server: {
    port: number;
    host: string;
  };
  monitoring: {
    intervalMinutes: number;
    speedtest: {
      baseUrl: string;
      downloadCkSize: number;
      uploadBytes: number;
    };
  };
  storage: {
    dataDir: string;
  };
  auth: {
    bootstrapToken: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function requirePortEnv(name: string): number {
  const raw = requireEnv(name);
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Env var ${name} must be a valid port number, got: ${raw}`);
  }
  return port;
}

function optionalPositiveIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Env var ${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

// Endpoint paths (ping.php/garbage.php/empty.php) are resolved against this
// with `new URL(path, base)`, which requires a trailing slash to keep the
// "backend/" segment — normalize rather than fail on an easy-to-omit slash.
function requireBaseUrlEnv(name: string): string {
  const raw = requireEnv(name);
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export const config: Config = {
  database: {
    host: requireEnv("DATABASE_HOST"),
    port: requirePortEnv("DATABASE_PORT"),
    user: requireEnv("DATABASE_USER"),
    password: requireEnv("DATABASE_PASSWORD"),
    name: requireEnv("DATABASE_NAME"),
  },
  server: {
    port: requirePortEnv("PORT"),
    host: requireEnv("HOST"),
  },
  monitoring: {
    intervalMinutes: optionalPositiveIntEnv("MONITOR_INTERVAL_MINUTES", 15),
    speedtest: {
      baseUrl: requireBaseUrlEnv("SPEEDTEST_BASE_URL"),
      downloadCkSize: optionalPositiveIntEnv("SPEEDTEST_DOWNLOAD_CK_SIZE", 10),
      uploadBytes: optionalPositiveIntEnv("SPEEDTEST_UPLOAD_BYTES", 5_000_000),
    },
  },
  storage: {
    // Uploaded protocols + generated complaint PDFs. Defaults to a relative
    // path for local dev; production points this at a mounted PVC (see the
    // argocd repo's apps/speed-nachweis/ deployment).
    dataDir: process.env.DATA_DIR ?? "./data",
  },
  auth: {
    // Seeds Settings.apiToken only if no settings row exists yet (see
    // settings.repository.ts). After that the DB row is authoritative —
    // regenerating the token via the UI doesn't touch this env var.
    bootstrapToken: requireEnv("API_TOKEN"),
  },
};

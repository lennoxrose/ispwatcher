import { performance } from "node:perf_hooks";
import { config } from "../config.js";
import type { SpeedTestResult } from "./speedtest-client.types.js";

// LAYER 1 ONLY. Speaks our self-hosted LibreSpeed backend's protocol
// (ping.php / garbage.php / empty.php, resolved against SPEEDTEST_BASE_URL)
// — this is NOT the § 57 TKG measurement mechanism and must never be
// presented as one. See plans.md §2a and CLAUDE.md's "label estimates as
// estimates" rule.

const PING_SAMPLES = 5;

function endpoint(pathAndQuery: string): string {
  return new URL(pathAndQuery, config.monitoring.speedtest.baseUrl).toString();
}

export async function runSpeedTest(): Promise<SpeedTestResult> {
  const pingMs = await measurePing();
  const downloadMbit = await measureDownload();
  const uploadMbit = await measureUpload();
  return { downloadMbit, uploadMbit, pingMs };
}

async function measurePing(): Promise<number> {
  const url = endpoint("ping.php");
  const samples: number[] = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    const start = performance.now();
    await fetch(url, { cache: "no-store" });
    samples.push(performance.now() - start);
  }
  return samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
}

async function measureDownload(): Promise<number> {
  const url = endpoint(`garbage.php?ck_size=${config.monitoring.speedtest.downloadCkSize}`);
  const start = performance.now();
  const response = await fetch(url, { cache: "no-store" });
  const bytes = await response.arrayBuffer();
  const elapsedSeconds = (performance.now() - start) / 1000;
  return bytesToMbit(bytes.byteLength, elapsedSeconds);
}

async function measureUpload(): Promise<number> {
  const url = endpoint("empty.php");
  const payload = new Uint8Array(config.monitoring.speedtest.uploadBytes);
  const start = performance.now();
  await fetch(url, { method: "POST", body: payload });
  const elapsedSeconds = (performance.now() - start) / 1000;
  return bytesToMbit(payload.byteLength, elapsedSeconds);
}

function bytesToMbit(bytes: number, seconds: number): number {
  return (bytes * 8) / seconds / 1_000_000;
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "../config.js";
import { runSpeedTest } from "./speedtest-client.js";

test("runSpeedTest speaks LibreSpeed's ping.php/garbage.php/empty.php protocol", async (t) => {
  const calls: { url: string; init?: RequestInit }[] = [];

  t.mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    const url = input.toString();
    calls.push(init === undefined ? { url } : { url, init });

    // A small delay so the elapsed-time-based Mbit/s math has a non-zero denominator.
    await new Promise((resolve) => setTimeout(resolve, 5));

    if (url.includes("garbage.php")) {
      return new Response(new Uint8Array(1_000_000));
    }
    return new Response(null, { status: 200 });
  });

  const result = await runSpeedTest();

  assert.ok(Number.isFinite(result.pingMs) && result.pingMs > 0);
  assert.ok(Number.isFinite(result.downloadMbit) && result.downloadMbit > 0);
  assert.ok(Number.isFinite(result.uploadMbit) && result.uploadMbit > 0);

  const pingCalls = calls.filter((c) => c.url.includes("ping.php"));
  const downloadCalls = calls.filter((c) => c.url.includes("garbage.php"));
  const uploadCalls = calls.filter((c) => c.url.includes("empty.php"));

  assert.equal(pingCalls.length, 5);
  assert.equal(downloadCalls.length, 1);
  assert.equal(uploadCalls.length, 1);

  const downloadCall = downloadCalls[0];
  const uploadCall = uploadCalls[0];
  assert.ok(downloadCall);
  assert.ok(uploadCall);

  assert.ok(downloadCall.url.startsWith(config.monitoring.speedtest.baseUrl));
  assert.ok(downloadCall.url.includes(`ck_size=${config.monitoring.speedtest.downloadCkSize}`));
  assert.ok(uploadCall.url.startsWith(config.monitoring.speedtest.baseUrl));
  assert.equal(uploadCall.init?.method, "POST");
});

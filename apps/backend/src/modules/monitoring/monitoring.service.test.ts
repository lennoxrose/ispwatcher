import { test } from "node:test";
import assert from "node:assert/strict";
import { contractRepository } from "../contract/contract.repository.js";
import { monitoringRepository } from "./monitoring.repository.js";
import * as monitoringService from "./monitoring.service.js";
import { NotFoundError } from "../../shared/errors.js";
import type { Contract } from "../contract/contract.types.js";
import type { MonitoringRun } from "./monitoring.types.js";

// Contract for these fixtures: normalSpeedMbit=50 (the line trend flagging checks against).
const testContract: Contract = {
  id: 1,
  ispName: "Test ISP",
  ispAddress: "Test Street 1",
  maxSpeedMbit: 100,
  normalSpeedMbit: 50,
  minSpeedMbit: 25,
  createdAt: new Date(),
};

function makeRuns(downloadSpeeds: number[]): MonitoringRun[] {
  return downloadSpeeds.map((downloadMbit, index) => ({
    id: index + 1,
    contractId: 1,
    timestamp: new Date(),
    downloadMbit,
    uploadMbit: 10,
    pingMs: 15,
  }));
}

test("getTrendSummary throws NotFoundError when the contract doesn't exist", async (t) => {
  t.mock.method(contractRepository, "findById", async () => null);

  await assert.rejects(() => monitoringService.getTrendSummary(999), NotFoundError);
});

test("getTrendSummary reports no sustained underperformance when speeds are healthy", async (t) => {
  t.mock.method(contractRepository, "findById", async () => testContract);
  t.mock.method(monitoringRepository, "findSince", async () => makeRuns(new Array(30).fill(80)));

  const result = await monitoringService.getTrendSummary(1, 7);

  assert.equal(result.sustainedUnderperformance, false);
  assert.equal(result.belowContractPercent, 0);
  assert.equal(result.sampleSize, 30);
  assert.match(result.disclaimer, /not the certified/);
});

test("getTrendSummary flags sustained underperformance past the threshold with enough samples", async (t) => {
  t.mock.method(contractRepository, "findById", async () => testContract);
  // 25 healthy + 10 below the 50 Mbit/s normal speed = 35 total, 10/35 ≈ 28.6% > 20% threshold.
  const runs = makeRuns([...new Array(25).fill(80), ...new Array(10).fill(30)]);
  t.mock.method(monitoringRepository, "findSince", async () => runs);

  const result = await monitoringService.getTrendSummary(1, 7);

  assert.equal(result.sustainedUnderperformance, true);
  assert.equal(result.sampleSize, 35);
  assert.ok(result.belowContractPercent > 20);
});

test("getTrendSummary does not flag when the sample size is below the minimum, even at 100% below normal", async (t) => {
  t.mock.method(contractRepository, "findById", async () => testContract);
  const runs = makeRuns(new Array(10).fill(30)); // all below normal, but only 10 samples (min is 20)
  t.mock.method(monitoringRepository, "findSince", async () => runs);

  const result = await monitoringService.getTrendSummary(1, 7);

  assert.equal(result.sustainedUnderperformance, false);
  assert.equal(result.belowContractPercent, 100);
});

test("recordRun persists via the repository", async (t) => {
  const createMock = t.mock.method(
    monitoringRepository,
    "create",
    async (input: Parameters<typeof monitoringRepository.create>[0]) => ({
      id: 1,
      timestamp: new Date(),
      ...input,
    }),
  );

  const result = await monitoringService.recordRun({
    contractId: 1,
    downloadMbit: 90,
    uploadMbit: 20,
    pingMs: 12,
  });

  assert.equal(createMock.mock.calls.length, 1);
  assert.equal(result.downloadMbit, 90);
});

test("getDashboard returns recent runs plus a trend summary", async (t) => {
  t.mock.method(contractRepository, "findById", async () => testContract);
  const runs = makeRuns([80, 82, 84]);
  t.mock.method(monitoringRepository, "findSince", async () => runs);
  t.mock.method(monitoringRepository, "findRecent", async () => runs);

  const dashboard = await monitoringService.getDashboard(1);

  assert.equal(dashboard.recentRuns.length, 3);
  assert.equal(dashboard.trend.sustainedUnderperformance, false);
});

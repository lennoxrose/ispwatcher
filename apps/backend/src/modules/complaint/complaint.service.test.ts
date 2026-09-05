import { test } from "node:test";
import assert from "node:assert/strict";
import { computeAutoReductionPercent } from "./complaint.service.js";
import type { Contract } from "../contract/contract.types.js";
import type { CampaignWithDetails } from "../campaign/campaign.types.js";

const testContract: Contract = {
  id: 1,
  ispName: "Test ISP",
  ispAddress: "Test Street 1",
  maxSpeedMbit: 100,
  normalSpeedMbit: 50,
  minSpeedMbit: 25,
  createdAt: new Date(),
};

function measurement(downloadMbit: number): CampaignWithDetails["measurements"][number] {
  return {
    id: 1,
    campaignId: 1,
    timestamp: new Date(),
    downloadMbit,
    uploadMbit: 10,
    pingMs: 20,
    dayIndex: 1,
  };
}

test("computeAutoReductionPercent is 0 with no measurements", () => {
  assert.equal(computeAutoReductionPercent([], testContract), 0);
});

test("computeAutoReductionPercent is 0 when every measurement meets or beats normal speed", () => {
  const measurements = [measurement(50), measurement(60), measurement(90)];
  assert.equal(computeAutoReductionPercent(measurements, testContract), 0);
});

test("computeAutoReductionPercent averages the shortfall below normal speed across measurements", () => {
  // 25 is 50% below 50 (normal); 50 is exactly at normal (0% shortfall).
  const measurements = [measurement(25), measurement(50)];
  assert.equal(computeAutoReductionPercent(measurements, testContract), 25);
});

test("computeAutoReductionPercent never counts a measurement above normal speed as a negative shortfall", () => {
  // 0 is 100% below normal; 100 is above normal (clamped to 0, not -100%).
  const measurements = [measurement(0), measurement(100)];
  assert.equal(computeAutoReductionPercent(measurements, testContract), 50);
});

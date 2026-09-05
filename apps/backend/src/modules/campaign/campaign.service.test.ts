import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignRepository } from "./campaign.repository.js";
import * as campaignService from "./campaign.service.js";
import { CampaignStatus } from "./campaign.types.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { Campaign, CampaignWithDetails } from "./campaign.types.js";

function makeCampaign(status: CampaignStatus): Campaign {
  return {
    id: 1,
    contractId: 1,
    status,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
  };
}

const testContract: CampaignWithDetails["contract"] = {
  id: 1,
  ispName: "Test ISP",
  ispAddress: "Test Street 1",
  maxSpeedMbit: 100,
  normalSpeedMbit: 50,
  minSpeedMbit: 25,
  createdAt: new Date(),
};

function makeMeasurements(dayDownloads: number[][]): CampaignWithDetails["measurements"] {
  let id = 1;
  const measurements: CampaignWithDetails["measurements"] = [];
  dayDownloads.forEach((daySpeeds, dayOffset) => {
    for (const downloadMbit of daySpeeds) {
      measurements.push({
        id: id++,
        campaignId: 1,
        timestamp: new Date(),
        downloadMbit,
        uploadMbit: 10,
        pingMs: 20,
        dayIndex: dayOffset + 1,
      });
    }
  });
  return measurements;
}

function makeCampaignWithDetails(dayDownloads: number[][]): CampaignWithDetails {
  return {
    ...makeCampaign(CampaignStatus.RUNNING),
    contract: testContract,
    measurements: makeMeasurements(dayDownloads),
  };
}

test("transitionStatus allows PENDING -> RUNNING and sets startedAt", async (t) => {
  t.mock.method(campaignRepository, "findById", async () => makeCampaign(CampaignStatus.PENDING));
  const updateMock = t.mock.method(
    campaignRepository,
    "updateStatus",
    async (
      _id: Parameters<typeof campaignRepository.updateStatus>[0],
      data: Parameters<typeof campaignRepository.updateStatus>[1],
    ) => ({
      ...makeCampaign(CampaignStatus.RUNNING),
      ...data,
    }),
  );

  await campaignService.transitionStatus(1, CampaignStatus.RUNNING);

  assert.equal(updateMock.mock.calls.length, 1);
  const call = updateMock.mock.calls[0];
  assert.ok(call);
  const [, data] = call.arguments;
  assert.equal(data.status, CampaignStatus.RUNNING);
  assert.ok(data.startedAt instanceof Date);
});

test("transitionStatus rejects PENDING -> COMPLETE", async (t) => {
  t.mock.method(campaignRepository, "findById", async () => makeCampaign(CampaignStatus.PENDING));

  await assert.rejects(
    () => campaignService.transitionStatus(1, CampaignStatus.COMPLETE),
    ConflictError,
  );
});

test("transitionStatus rejects transitions out of a terminal state", async (t) => {
  t.mock.method(campaignRepository, "findById", async () => makeCampaign(CampaignStatus.COMPLETE));

  await assert.rejects(
    () => campaignService.transitionStatus(1, CampaignStatus.RUNNING),
    ConflictError,
  );
});

test("getCampaign throws NotFoundError when the repository finds nothing", async (t) => {
  t.mock.method(campaignRepository, "findById", async () => null);

  await assert.rejects(() => campaignService.getCampaign(999), NotFoundError);
});

// Contract for these fixtures: maxSpeedMbit=100, normalSpeedMbit=50, minSpeedMbit=25.
const cleanDay = [86, 87, 88, 89, 90, 91, 92, 93, 94, 95];

test("evaluateCampaign passes cleanly when all three criteria are met", async (t) => {
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeCampaignWithDetails([cleanDay, cleanDay, cleanDay]),
  );

  const result = await campaignService.evaluateCampaign(1);

  assert.deepEqual(result, { underperforming: false, failedCriteria: [] });
});

test("evaluateCampaign fails only maxFail when 2+ days miss 90% of max speed", async (t) => {
  const belowMaxDay = [70, 72, 74, 76, 78, 80, 81, 82, 83, 85]; // day max 85 < 90% of 100
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeCampaignWithDetails([belowMaxDay, belowMaxDay, cleanDay]),
  );

  const result = await campaignService.evaluateCampaign(1);

  assert.deepEqual(result, { underperforming: true, failedCriteria: ["maxFail"] });
});

test("evaluateCampaign fails only normFail when >10% of measurements miss normal speed", async (t) => {
  const oneBelowNormal = [45, 90, 91, 92, 93, 94, 95, 96, 97, 98]; // 1 measurement < 50
  const twoBelowNormal = [45, 46, 90, 91, 92, 93, 94, 95, 96, 97]; // 2 measurements < 50
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeCampaignWithDetails([oneBelowNormal, oneBelowNormal, twoBelowNormal]),
  );

  const result = await campaignService.evaluateCampaign(1);

  assert.deepEqual(result, { underperforming: true, failedCriteria: ["normFail"] });
});

test("evaluateCampaign fails only minFail when 2+ days undercut min speed", async (t) => {
  const belowMinDay = [20, 90, 91, 92, 93, 94, 95, 96, 97, 98]; // day min 20 < 25
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeCampaignWithDetails([belowMinDay, belowMinDay, cleanDay]),
  );

  const result = await campaignService.evaluateCampaign(1);

  assert.deepEqual(result, { underperforming: true, failedCriteria: ["minFail"] });
});

test("evaluateCampaign refuses to evaluate a campaign with fewer than 30 measurements", async (t) => {
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeCampaignWithDetails([cleanDay, cleanDay]),
  );

  await assert.rejects(() => campaignService.evaluateCampaign(1), ConflictError);
});

// --- computeGate: pure function, tested directly with explicit `now` values ---

function makeRunningCampaign(
  measurements: CampaignWithDetails["measurements"],
  startedAt: Date | null = null,
): CampaignWithDetails {
  return {
    ...makeCampaign(CampaignStatus.RUNNING),
    startedAt,
    contract: testContract,
    measurements,
  };
}

function measurementAt(timestamp: Date, dayIndex: number): CampaignWithDetails["measurements"][number] {
  return {
    id: Math.floor(Math.random() * 1_000_000),
    campaignId: 1,
    timestamp,
    downloadMbit: 90,
    uploadMbit: 10,
    pingMs: 20,
    dayIndex,
  };
}

test("computeGate allows the very first measurement of a fresh campaign", () => {
  const campaign = makeRunningCampaign([]);
  const gate = campaignService.computeGate(campaign, new Date("2026-01-01T10:00:00Z"));

  assert.equal(gate.allowed, true);
  assert.deepEqual(gate.progress, { totalLogged: 0, daysUsed: 0, todayLogged: 0 });
});

test("computeGate rejects a measurement less than 5 minutes after the last one", () => {
  const first = measurementAt(new Date("2026-01-01T10:00:00Z"), 1);
  const campaign = makeRunningCampaign([first]);

  const gate = campaignService.computeGate(campaign, new Date("2026-01-01T10:03:00Z"));

  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /5 minutes/);
});

test("computeGate allows a measurement exactly 5 minutes after the last one", () => {
  const first = measurementAt(new Date("2026-01-01T10:00:00Z"), 1);
  const campaign = makeRunningCampaign([first]);

  const gate = campaignService.computeGate(campaign, new Date("2026-01-01T10:05:00Z"));

  assert.equal(gate.allowed, true);
});

test("computeGate requires a 3-hour gap after the 5th measurement of the day", () => {
  const dayStart = new Date("2026-01-01T08:00:00Z").getTime();
  const fiveMeasurements = Array.from({ length: 5 }, (_, i) =>
    measurementAt(new Date(dayStart + i * 10 * 60 * 1000), 1),
  );
  const campaign = makeRunningCampaign(fiveMeasurements);
  const fifthTimestamp = fiveMeasurements[4]!.timestamp.getTime();

  const tooSoon = campaignService.computeGate(campaign, new Date(fifthTimestamp + 60 * 60 * 1000));
  assert.equal(tooSoon.allowed, false);
  assert.match(tooSoon.reason ?? "", /3 hours/);

  const afterGap = campaignService.computeGate(campaign, new Date(fifthTimestamp + 3 * 60 * 60 * 1000));
  assert.equal(afterGap.allowed, true);
});

test("computeGate caps a day at 10 measurements", () => {
  const dayStart = new Date("2026-01-01T08:00:00Z").getTime();
  const tenMeasurements = Array.from({ length: 10 }, (_, i) =>
    measurementAt(new Date(dayStart + i * 30 * 60 * 1000), 1),
  );
  const campaign = makeRunningCampaign(tenMeasurements);

  const gate = campaignService.computeGate(
    campaign,
    new Date(tenMeasurements[9]!.timestamp.getTime() + 4 * 60 * 60 * 1000),
  );

  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /10 measurements today/);
});

test("computeGate rejects a new day once all 3 measurement days are used", () => {
  const day1 = measurementAt(new Date("2026-01-01T10:00:00Z"), 1);
  const day2 = measurementAt(new Date("2026-01-02T10:00:00Z"), 2);
  const day3 = measurementAt(new Date("2026-01-03T10:00:00Z"), 3);
  const campaign = makeRunningCampaign([day1, day2, day3]);

  const gate = campaignService.computeGate(campaign, new Date("2026-01-05T10:00:00Z"));

  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /3 measurement days/);
});

test("computeGate rejects once the campaign's 14-day window has expired", () => {
  const startedAt = new Date("2026-01-01T00:00:00Z");
  const campaign = makeRunningCampaign([], startedAt);

  const gate = campaignService.computeGate(campaign, new Date("2026-01-20T00:00:00Z"));

  assert.equal(gate.allowed, false);
  assert.match(gate.reason ?? "", /14-day/);
});

test("computeGate rejects when the campaign isn't RUNNING", () => {
  const campaign: CampaignWithDetails = {
    ...makeRunningCampaign([]),
    status: CampaignStatus.PENDING,
  };

  const gate = campaignService.computeGate(campaign, new Date());

  assert.equal(gate.allowed, false);
});

// --- logMeasurement / getMeasurementGate: wiring to the repository ---

const measurementInput = { downloadMbit: 90, uploadMbit: 10, pingMs: 20 };

test("getMeasurementGate reads through to computeGate via the repository", async (t) => {
  t.mock.method(campaignRepository, "findByIdWithDetails", async () => makeRunningCampaign([]));

  const gate = await campaignService.getMeasurementGate(1);

  assert.equal(gate.allowed, true);
});

test("logMeasurement persists via the repository once the gate allows it", async (t) => {
  t.mock.method(campaignRepository, "findByIdWithDetails", async () => makeRunningCampaign([]));
  const addMock = t.mock.method(
    campaignRepository,
    "addMeasurement",
    async (campaignId: number, data: Parameters<typeof campaignRepository.addMeasurement>[1]) => ({
      id: 1,
      campaignId,
      ...data,
    }),
  );

  await campaignService.logMeasurement(1, measurementInput);

  assert.equal(addMock.mock.calls.length, 1);
  const call = addMock.mock.calls[0];
  assert.ok(call);
  const [, data] = call.arguments;
  assert.equal(data.dayIndex, 1);
});

test("logMeasurement rejects without touching the repository when the gate disallows it", async (t) => {
  const day1 = measurementAt(new Date("2026-01-01T10:00:00Z"), 1);
  const day2 = measurementAt(new Date("2026-01-02T10:00:00Z"), 2);
  const day3 = measurementAt(new Date("2026-01-03T10:00:00Z"), 3);
  t.mock.method(campaignRepository, "findByIdWithDetails", async () =>
    makeRunningCampaign([day1, day2, day3]),
  );
  const addMock = t.mock.method(campaignRepository, "addMeasurement", async () => {
    throw new Error("should not be called");
  });

  await assert.rejects(() => campaignService.logMeasurement(1, measurementInput), ConflictError);
  assert.equal(addMock.mock.calls.length, 0);
});

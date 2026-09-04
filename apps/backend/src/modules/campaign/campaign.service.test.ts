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

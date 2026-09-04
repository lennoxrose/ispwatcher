import { test } from "node:test";
import assert from "node:assert/strict";
import { contractRepository } from "./contract.repository.js";
import * as contractService from "./contract.service.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";
import type { Contract } from "./contract.types.js";

const sampleContract: Contract = {
  id: 1,
  ispName: "Test ISP",
  ispAddress: "Test Street 1",
  maxSpeedMbit: 100,
  normalSpeedMbit: 50,
  minSpeedMbit: 25,
  createdAt: new Date(),
};

test("createContract rejects out-of-order speed values", async () => {
  await assert.rejects(
    () =>
      contractService.createContract({
        ispName: "Test ISP",
        ispAddress: "Test Street 1",
        maxSpeedMbit: 50,
        normalSpeedMbit: 100,
        minSpeedMbit: 25,
      }),
    ValidationError,
  );
});

test("createContract rejects non-positive speed values", async () => {
  await assert.rejects(
    () =>
      contractService.createContract({
        ispName: "Test ISP",
        ispAddress: "Test Street 1",
        maxSpeedMbit: 100,
        normalSpeedMbit: 50,
        minSpeedMbit: 0,
      }),
    ValidationError,
  );
});

test("createContract persists valid input via the repository", async (t) => {
  const createMock = t.mock.method(contractRepository, "create", async () => sampleContract);

  const result = await contractService.createContract({
    ispName: sampleContract.ispName,
    ispAddress: sampleContract.ispAddress,
    maxSpeedMbit: sampleContract.maxSpeedMbit,
    normalSpeedMbit: sampleContract.normalSpeedMbit,
    minSpeedMbit: sampleContract.minSpeedMbit,
  });

  assert.equal(createMock.mock.calls.length, 1);
  assert.deepEqual(result, sampleContract);
});

test("getContract throws NotFoundError when the repository finds nothing", async (t) => {
  t.mock.method(contractRepository, "findById", async () => null);

  await assert.rejects(() => contractService.getContract(999), NotFoundError);
});

test("updateContract validates the merged speed values, not just the patch", async (t) => {
  t.mock.method(contractRepository, "findById", async () => sampleContract);

  await assert.rejects(
    () => contractService.updateContract(sampleContract.id, { minSpeedMbit: 200 }),
    ValidationError,
  );
});

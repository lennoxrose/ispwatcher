import { test } from "node:test";
import assert from "node:assert/strict";
import { settingsRepository } from "./settings.repository.js";
import * as settingsService from "./settings.service.js";
import type { Settings } from "./settings.types.js";

function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    senderName: "",
    senderAddress: "",
    senderCity: "",
    apiToken: "bootstrap-token",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test("getSettings bootstraps a row only when none exists yet", async (t) => {
  const getOrCreateMock = t.mock.method(settingsRepository, "getOrCreate", async () =>
    makeSettings(),
  );

  const settings = await settingsService.getSettings();

  assert.equal(settings.apiToken, "bootstrap-token");
  assert.equal(getOrCreateMock.mock.calls.length, 1);
});

test("regenerateToken produces a different token than the one before it", async (t) => {
  t.mock.method(settingsRepository, "getOrCreate", async () => makeSettings());
  const updateMock = t.mock.method(
    settingsRepository,
    "updateToken",
    async (id: number, apiToken: string) => makeSettings({ id, apiToken }),
  );

  const result = await settingsService.regenerateToken();

  assert.notEqual(result.apiToken, "bootstrap-token");
  assert.match(result.apiToken, /^[0-9a-f]{48}$/);
  assert.equal(updateMock.mock.calls.length, 1);
});

test("regenerateToken called twice produces two different tokens", async (t) => {
  t.mock.method(settingsRepository, "getOrCreate", async () => makeSettings());
  t.mock.method(settingsRepository, "updateToken", async (id: number, apiToken: string) =>
    makeSettings({ id, apiToken }),
  );

  const first = await settingsService.regenerateToken();
  const second = await settingsService.regenerateToken();

  assert.notEqual(first.apiToken, second.apiToken);
});

test("verifyToken rejects when no token is presented", async (t) => {
  t.mock.method(settingsRepository, "getOrCreate", async () => makeSettings());

  assert.equal(await settingsService.verifyToken(undefined), false);
});

test("verifyToken accepts only the current stored token", async (t) => {
  t.mock.method(settingsRepository, "getOrCreate", async () =>
    makeSettings({ apiToken: "the-real-token" }),
  );

  assert.equal(await settingsService.verifyToken("the-real-token"), true);
  assert.equal(await settingsService.verifyToken("wrong-token"), false);
});

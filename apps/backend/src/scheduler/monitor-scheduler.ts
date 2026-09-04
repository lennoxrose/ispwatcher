import { config } from "../config.js";
import { runSpeedTest } from "../engine/speedtest-client.js";
import { logger } from "../lib/logger.js";
import { contractRepository } from "../modules/contract/contract.repository.js";
import * as monitoringService from "../modules/monitoring/monitoring.service.js";

// LAYER 1 — fires unattended, no BNetzA rules apply (see plans.md §2a).
// One speed test per tick, recorded against every existing contract (usually
// just one) since it's the same physical connection being measured.

let timer: NodeJS.Timeout | undefined;

export function startMonitorScheduler(): void {
  const intervalMs = config.monitoring.intervalMinutes * 60 * 1000;
  timer = setInterval(() => void runTick(), intervalMs);
  timer.unref();
}

export function stopMonitorScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

async function runTick(): Promise<void> {
  try {
    const contracts = await contractRepository.findAll();
    if (contracts.length === 0) {
      logger.debug("monitor-scheduler: no contracts configured yet, skipping this tick");
      return;
    }

    const result = await runSpeedTest();
    await Promise.all(
      contracts.map((contract) =>
        monitoringService.recordRun({ contractId: contract.id, ...result }),
      ),
    );
    logger.info({ result }, "monitor-scheduler: recorded speed test run");
  } catch (error) {
    logger.error({ error }, "monitor-scheduler: speed test run failed");
  }
}

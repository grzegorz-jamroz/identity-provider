import cron from 'node-cron';

import { tenantIds } from '../config/tenants.js';

import getAppConfig from './utility/appConfig.js';
import { getDb } from './db.js';

export function startCleanupJob(db, appConfig) {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.info('[CRON] Starting cleanup of expired refresh tokens...');

    try {
      const [result] = await db.execute(
        `DELETE
         FROM ${appConfig.refreshTokenTableName}
         WHERE exp < ?`,
        [new Date()],
      );
      console.info(`[CRON] Cleanup complete. Deleted ${result.affectedRows} expired tokens.`);
    } catch (error) {
      console.error('[CRON] Error during cleanup:', error);
    }
  });
  console.info('[CRON] Cleanup job scheduled (Daily at 00:00).');
}

export async function startCleanupJobForAllSystems() {
  for (const tenantId of tenantIds) {
    console.info(`[CRON] Starting cleanup job for tenant: ${tenantId}`);
    const db = await getDb(tenantId);
    const appConfig = getAppConfig(tenantId);
    startCleanupJob(db, appConfig);
  }
}

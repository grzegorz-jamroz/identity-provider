import cron from 'node-cron';

import appConfig from '../config/app-config.js';

import db from './db.js';

export default function startCleanupJob() {
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

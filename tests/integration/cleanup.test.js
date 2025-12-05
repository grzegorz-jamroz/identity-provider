import { jest } from '@jest/globals';
import cron from 'node-cron';

import startCleanupJob from '../../src/cleanup.js';
import db from '../../src/db.js';
import transform from '../../src/utility/transform.js';

process.env.NODE_ENV = 'test';

const expiredTokenUuid = '019ae4d0-23e3-70af-aac5-dca6fdf45966';
const validTokenUuid = '019ae4db-a24b-74cd-bc06-c4bfaca8ce7e';
const userUuid = '019ae4cc-1c38-7187-afb8-631c2814c5da';

describe('Cron Cleanup Job', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should schedule the job and correctly delete expired tokens when executed', async () => {
    // Expect & Given
    await createUser();
    await createExpiredToken();
    await createValidToken();
    const cronSpy = jest.spyOn(cron, 'schedule').mockImplementation(() => {});

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    // When
    startCleanupJob();
    expect(cronSpy).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
    const scheduledFunction = cronSpy.mock.calls[0][1];
    await scheduledFunction();

    // Then
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Starting cleanup'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleanup complete'));
    const [expiredRows] = await db.execute('SELECT * FROM refresh_token WHERE uuid = ?', [
      transform.uuid.toBinary(expiredTokenUuid),
    ]);
    expect(expiredRows.length).toBe(0);
    const [validRows] = await db.execute('SELECT * FROM refresh_token WHERE uuid = ?', [
      transform.uuid.toBinary(validTokenUuid),
    ]);
    expect(validRows.length).toBe(1);
  });

  it('should log an error if the DB query fails during cleanup', async () => {
    // Expect & Given
    const cronSpy = jest.spyOn(cron, 'schedule').mockImplementation(() => {});
    jest.spyOn(db, 'execute').mockRejectedValueOnce(new Error('DB Connection Lost'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // When
    startCleanupJob();
    const scheduledFunction = cronSpy.mock.calls[0][1];
    await scheduledFunction();

    // Then
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error during cleanup'),
      expect.any(Error),
    );
  });
});

const createUser = async () =>
  await db.execute(
    `INSERT INTO user (uuid, username, email, password, roles, created_at, updated_at)
     VALUES (?, 'cronuser', 'cron@test.com', 'pass', '[]', NOW(), NOW())`,
    [transform.uuid.toBinary(userUuid)],
  );

const createExpiredToken = async () =>
  await db.execute(
    `INSERT INTO refresh_token (uuid, user_uuid, device_info, iat, exp, created_at)
     VALUES (?, ?, 'expired_device', NOW(), NOW() - INTERVAL 1 DAY, NOW())`,
    [transform.uuid.toBinary(expiredTokenUuid), transform.uuid.toBinary(userUuid)],
  );

const createValidToken = async () =>
  await db.execute(
    `INSERT INTO refresh_token (uuid, user_uuid, device_info, iat, exp, created_at)
     VALUES (?, ?, 'valid_device', NOW(), NOW() + INTERVAL 1 DAY, NOW())`,
    [transform.uuid.toBinary(validTokenUuid), transform.uuid.toBinary(userUuid)],
  );

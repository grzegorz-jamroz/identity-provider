import { jest } from '@jest/globals';
import cron from 'node-cron';

import { startCleanupJob } from '../../src/cleanup.js';
import { getDb } from '../../src/db.js';
import getAppConfig from '../../src/utility/appConfig.js';
import transform from '../../src/utility/transform.js';

process.env.NODE_ENV = 'test';

const expiredTokenUuid = '019ae4d0-23e3-70af-aac5-dca6fdf45966';
const validTokenUuid = '019ae4db-a24b-74cd-bc06-c4bfaca8ce7e';
const userUuid = '019ae4cc-1c38-7187-afb8-631c2814c5da';

describe('Cron Cleanup Job', () => {
  let db;
  let appConfig;

  beforeAll(async () => {
    db = await getDb();
    appConfig = await getAppConfig();
  });

  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should schedule the job and correctly delete expired tokens when executed', async () => {
    // Expect & Given
    await createUser(db);
    await createExpiredToken(db);
    await createValidToken(db);
    const cronSpy = jest.spyOn(cron, 'schedule').mockImplementation(() => {});

    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    // When
    startCleanupJob(db, appConfig);
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
    startCleanupJob(db, appConfig);
    const scheduledFunction = cronSpy.mock.calls[0][1];
    await scheduledFunction();

    // Then
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error during cleanup'),
      expect.any(Error),
    );
  });
});

describe('Cleanup Job For All Systems', () => {
  beforeEach(() => {
    jest.resetModules(); // Clear cache to allow fresh mocks
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should schedule cleanup jobs for all tenants', async () => {
    // 1. Define Mocks
    // We create the mock functions *before* the module mocking
    const executeMock = jest.fn();
    const getDbMock = jest.fn().mockResolvedValue({ execute: executeMock });
    const getAppConfigMock = jest.fn().mockReturnValue({ refreshTokenTableName: 'refresh_token' });
    const cronScheduleMock = jest.fn();

    // 2. Mock 'node-cron'
    // We must mock the module itself because resetModules() creates a new instance
    jest.unstable_mockModule('node-cron', () => ({
      default: {
        schedule: cronScheduleMock,
      },
      schedule: cronScheduleMock, // Handle named import if present
    }));

    // 3. Mock dependencies
    jest.unstable_mockModule('../../src/db.js', () => ({
      __esModule: true, // Explicitly tell Jest this is an ESM mock
      getDb: getDbMock,
    }));

    jest.unstable_mockModule('../../src/utility/appConfig.js', () => ({
      __esModule: true,
      default: getAppConfigMock,
    }));

    jest.unstable_mockModule('../../config/tenants.js', () => ({
      __esModule: true,
      tenantIds: ['tenant-1', 'tenant-2'],
    }));

    // 4. Dynamic Import (Must happen AFTER mocks are defined)
    const { startCleanupJobForAllSystems } = await import('../../src/cleanup.js');

    // 5. Execute
    await startCleanupJobForAllSystems();

    // 6. Assertions
    // Verify DB connections were requested for both tenants
    expect(getDbMock).toHaveBeenCalledTimes(2);
    expect(getDbMock).toHaveBeenCalledWith('tenant-1');
    expect(getDbMock).toHaveBeenCalledWith('tenant-2');

    // Verify Config was requested
    expect(getAppConfigMock).toHaveBeenCalledTimes(2);
    expect(getAppConfigMock).toHaveBeenCalledWith('tenant-1');
    expect(getAppConfigMock).toHaveBeenCalledWith('tenant-2');

    // Verify Cron jobs were scheduled
    expect(cronScheduleMock).toHaveBeenCalledTimes(2);
    expect(cronScheduleMock).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
  });
});

const createUser = async (db) =>
  await db.execute(
    `INSERT INTO user (uuid, username, email, password, roles, created_at, updated_at)
     VALUES (?, 'cronuser', 'cron@test.com', 'pass', '[]', NOW(), NOW())`,
    [transform.uuid.toBinary(userUuid)],
  );

const createExpiredToken = async (db) =>
  await db.execute(
    `INSERT INTO refresh_token (uuid, user_uuid, device_info, iat, exp, created_at)
     VALUES (?, ?, 'expired_device', NOW(), NOW() - INTERVAL 1 DAY, NOW())`,
    [transform.uuid.toBinary(expiredTokenUuid), transform.uuid.toBinary(userUuid)],
  );

const createValidToken = async (db) =>
  await db.execute(
    `INSERT INTO refresh_token (uuid, user_uuid, device_info, iat, exp, created_at)
     VALUES (?, ?, 'valid_device', NOW(), NOW() + INTERVAL 1 DAY, NOW())`,
    [transform.uuid.toBinary(validTokenUuid), transform.uuid.toBinary(userUuid)],
  );

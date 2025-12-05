import { jest } from '@jest/globals';

describe('DB Configuration', () => {
  // Save the original environment variables so we can restore them later
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // force Jest to re-run the file on the next import
    jest.resetModules();

    // Reset env vars to a clean state
    process.env = { ...ORIGINAL_ENV };
    process.env.DB_NAME = 'auth_db';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = 'password';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should use the regular database name when NODE_ENV is NOT test (Production Mode)', async () => {
    // 1. Set the environment to Production
    process.env.NODE_ENV = 'production';

    // 2. Mock mysql2/promise
    // We mock it to prevent an actual connection attempt and to spy on the arguments
    const createPoolMock = jest.fn(() => ({})); // Return dummy pool object

    jest.unstable_mockModule('mysql2/promise', () => ({
      default: { createPool: createPoolMock },
    }));

    // 3. Dynamic Import (triggers the logic in db.js)
    await import('../../src/db.js');

    // 4. Verify the database name passed to createPool
    expect(createPoolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        database: 'auth_db', // Should match DB_NAME exactly (no suffix)
      }),
    );
  });

  it('should append _test suffix when NODE_ENV is test (Test Mode)', async () => {
    // 1. Set the environment to Test
    process.env.NODE_ENV = 'test';

    // 2. Mock mysql2/promise again
    const createPoolMock = jest.fn(() => ({}));

    jest.unstable_mockModule('mysql2/promise', () => ({
      default: { createPool: createPoolMock },
    }));

    // 3. Dynamic Import
    await import('../../src/db.js');

    // 4. Verify the suffix was added
    expect(createPoolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        database: 'auth_db_test', // Should have the suffix
      }),
    );
  });
});

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
    const { getDb } = await import('../../src/db.js');
    await getDb();

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
    const { getDb } = await import('../../src/db.js');
    await getDb();

    // 4. Verify the suffix was added
    expect(createPoolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        database: 'auth_db_test', // Should have the suffix
      }),
    );
  });

  it('should throw an error if default tenant is disabled', async () => {
    // 1. Mock tenants to NOT have a 'default' property
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {}, // No 'default' key
    }));

    // 2. Dynamic Import and call
    const { getDb } = await import('../../src/db.js');

    // 3. Assert that it throws the correct error
    await expect(getDb()).rejects.toThrow('Default tenant configuration is disabled.');
  });

  it('should throw an error for an unknown system', async () => {
    // 1. Mock tenants
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'existing-system': { dbConfig: { database: 'db1' } },
      },
    }));

    // 2. Dynamic Import and call
    const { getDb } = await import('../../src/db.js');

    // 3. Assert that it throws for a non-existent system
    await expect(getDb('unknown-system')).rejects.toThrow('Unknown system: unknown-system');
  });

  it('should handle configuration without nested dbConfig (fallback to default empty object)', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'legacy-system': {
          something: 'value',
        },
      },
    }));

    const createPoolMock = jest.fn(() => ({}));
    jest.unstable_mockModule('mysql2/promise', () => ({
      default: { createPool: createPoolMock },
    }));

    const { getDb } = await import('../../src/db.js');
    await getDb('legacy-system');

    expect(createPoolMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionLimit: 10,
      }),
    );
  });

  it('should create, cache, and close pools correctly', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'system-1': { dbConfig: { database: 'system_1_db' } },
        'system-2': { dbConfig: { database: 'system_2_db' } },
      },
    }));

    // 1. Mock createPool to return a pool with a mockable .end() method
    const poolEndMock = jest.fn().mockResolvedValue();
    const createPoolMock = jest.fn(() => ({
      end: poolEndMock,
    }));
    jest.unstable_mockModule('mysql2/promise', () => ({
      default: { createPool: createPoolMock },
    }));

    // 2. Dynamic Import
    const { getDb, closeAllPools } = await import('../../src/db.js');

    // 3. Get DB for two different systems to populate cache
    const pool1 = await getDb('system-1');
    await getDb('system-2');

    // 4. Verify pools were created
    expect(createPoolMock).toHaveBeenCalledTimes(2);

    // 5. Get the same DB again, should be cached (no new pool created)
    const cachedPool1 = await getDb('system-1');
    expect(cachedPool1).toBe(pool1);
    expect(createPoolMock).toHaveBeenCalledTimes(2); // Still 2, not 3

    // 6. Close all pools
    await closeAllPools();

    // 7. Verify .end() was called on each pool
    expect(poolEndMock).toHaveBeenCalledTimes(2);

    // 8. Get DB again, should create a new pool as cache is cleared
    const newPool1 = await getDb('system-1');
    expect(newPool1).not.toBe(pool1);
    expect(createPoolMock).toHaveBeenCalledTimes(3); // Now 3
  });
});

import { jest } from '@jest/globals';

describe('App Config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should handle tenant without nested appConfig', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'simple-system': {
          someOtherProp: 123,
        },
      },
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');

    const config = await getAppConfig('simple-system');

    expect(config.userTableName).toBeDefined();
    expect(config.userTableName).toEqual('user');
  });

  it('should merge tenant specific config overrides', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'override-system': {
          appConfig: { userTableName: 'system_users' },
        },
      },
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');

    const config = await getAppConfig('override-system');

    expect(config.userTableName).toBe('system_users');
    expect(config.refreshTokenTableName).toBe('refresh_token');
  });

  it('should throw an error if default tenant is disabled', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {},
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');

    await expect(getAppConfig()).rejects.toThrow('Default tenant configuration is disabled.');
  });

  it('should throw an error for an unknown system', async () => {
    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: {
        'existing-system': { appConfig: {} },
      },
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');

    await expect(getAppConfig('unknown-system')).rejects.toThrow('Unknown system: unknown-system');
  });

  it('should use ENV variables when they are present', async () => {
    process.env.USER_TABLE_NAME = 'custom_users';
    process.env.REFRESH_TOKEN_TABLE_NAME = 'custom_tokens';

    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: { default: {} },
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');
    const config = await getAppConfig();

    expect(config.userTableName).toBe('custom_users');
    expect(config.refreshTokenTableName).toBe('custom_tokens');
  });

  it('should use default table names when ENV variables are empty or missing', async () => {
    process.env.USER_TABLE_NAME = '';
    process.env.REFRESH_TOKEN_TABLE_NAME = '';

    jest.unstable_mockModule('../../config/tenants.js', () => ({
      tenants: { default: {} },
    }));

    const { default: getAppConfig } = await import('../../src/utility/appConfig.js');
    const config = await getAppConfig();

    expect(config.userTableName).toBe('user');
    expect(config.refreshTokenTableName).toBe('refresh_token');
  });
});

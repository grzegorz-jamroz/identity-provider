import { tenantIds, tenants } from '../config/tenants.js';

export const validateTenantsConfig = async () => {
  for (const tenantId of tenantIds) {
    validateTenantConfig(tenantId);
  }
};

const validateTenantConfig = (systemName = 'default') => {
  if (systemName === 'default' && !tenants['default']) {
    throw new Error('Default tenant configuration is disabled.');
  }

  if (!tenants[systemName]) {
    throw new Error(`Unknown system: ${systemName}`);
  }

  const tenantConfig = tenants[systemName];
  const tenantAppConfig = tenantConfig.appConfig || {};

  if (!isValidTableName(tenantAppConfig.refreshTokenTableName)) {
    throw new Error(
      `Invalid refresh token table name format. Affected system "${systemName}". Only letters, numbers, and underscores are allowed.`,
    );
  }

  if (!isValidTableName(tenantAppConfig.userTableName)) {
    throw new Error(
      `Invalid user table name format. Affected system "${systemName}". Only letters, numbers, and underscores are allowed.`,
    );
  }
};

const isValidTableName = (tableName) => /^[a-zA-Z0-9_]+$/.test(tableName);

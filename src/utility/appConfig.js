import dotenv from 'dotenv';

import { tenants } from '../../config/tenants.js';

dotenv.config({ path: '../.env.local' });
dotenv.config({ path: '../.env' });
dotenv.config();

const defaultAppConfig = {
  userTableName: process.env.USER_TABLE_NAME || 'user',
  refreshTokenTableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'refresh_token',
};

const getAppConfig = async (systemName = 'default') => {
  if (systemName === 'default' && !tenants['default']) {
    throw new Error('Default tenant configuration is disabled.');
  }

  if (!tenants[systemName]) {
    throw new Error(`Unknown system: ${systemName}`);
  }

  const tenantConfig = tenants[systemName];
  const tenantAppConfig = tenantConfig.appConfig || {};

  return {
    ...defaultAppConfig,
    ...tenantAppConfig,
  };
};

export default getAppConfig;

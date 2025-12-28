import mysql from 'mysql2/promise';

import { tenants } from '../config/tenants.js';

const poolCache = new Map();

const defaultDbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

/**
 * Retrieves or creates a database connection pool for a specific system.
 * @param {string} systemName - The system identifier from the request
 * @returns {Promise<mysql.Pool>}
 */
export const getDb = async (systemName = 'default') => {
  if (systemName === 'default' && !tenants['default']) {
    throw new Error('Default tenant configuration is disabled.');
  }

  if (!tenants[systemName]) {
    throw new Error(`Unknown system: ${systemName}`);
  }

  if (poolCache.has(systemName)) {
    return poolCache.get(systemName);
  }

  const tenantConfig = tenants[systemName];
  const tenantDbConfig = tenantConfig.dbConfig || {};
  const targetDbName =
    process.env.NODE_ENV === 'test' ? `${tenantDbConfig.database}_test` : tenantDbConfig.database;
  const poolConfig = {
    ...defaultDbConfig,
    ...tenantDbConfig,
    database: targetDbName,
  };
  const pool = mysql.createPool(poolConfig);
  poolCache.set(systemName, pool);

  return pool;
};

export const closeAllPools = async () => {
  for (const [key, pool] of poolCache) {
    await pool.end();
  }

  poolCache.clear();
};

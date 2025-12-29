let tenants;
const defaultTenants = {
  default: {
    dbConfig: {
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
    },
    appConfig: {
      userTableName: process.env.USER_TABLE_NAME || 'user',
      refreshTokenTableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'refresh_token',
    },
  },
};

try {
  const localTenants = await import('./tenants-local.js');
  tenants = localTenants.tenants;
} catch (e) {
  tenants = defaultTenants;
}

export { tenants };
export const tenantIds = Object.keys(tenants);

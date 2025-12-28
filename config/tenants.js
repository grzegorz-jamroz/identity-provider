import dotenv from 'dotenv';
dotenv.config();

export const tenants = {
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

export const tenantIds = Object.keys(tenants);

import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config();

export default {
  userTableName: process.env.USER_TABLE_NAME || 'user',
  refreshTokenTableName: process.env.REFRESH_TOKEN_TABLE_NAME || 'refresh_token',
};

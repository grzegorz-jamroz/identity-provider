import jwt from 'jsonwebtoken';

import appConfig from '../../config/app-config.js';
import db from '../db.js';
import NotFoundError from '../error/NotFoundError.js';
import transform from '../utility/transform.js';

const findOneByUuid = async (uuid) => {
  const [tokens] = await db.execute(
    `SELECT * FROM ${appConfig.refreshTokenTableName} WHERE uuid = ?`,
    [transform.uuid.toBinary(uuid)],
  );

  if (tokens.length === 0) {
    throw new NotFoundError();
  }

  return tokens[0];
};

const insertOne = async (refreshToken) => {
  const decodedRT = jwt.decode(refreshToken);

  await db.execute(
    `INSERT INTO ${appConfig.refreshTokenTableName} (uuid, user_uuid, device_info, iat, exp, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      transform.uuid.toBinary(decodedRT.refreshTokenUuid),
      transform.uuid.toBinary(decodedRT.userUuid),
      decodedRT.deviceInfo,
      new Date(decodedRT.iat * 1000),
      new Date(decodedRT.exp * 1000),
      new Date(),
    ],
  );
};

const deleteOneByUuid = async (uuid) => {
  await db.execute(`DELETE FROM ${appConfig.refreshTokenTableName} WHERE uuid = ?`, [
    transform.uuid.toBinary(uuid),
  ]);
};

const deleteExpiredByUserUuid = async (userUuid) => {
  await db.execute(
    `DELETE FROM ${appConfig.refreshTokenTableName} WHERE user_uuid = ? AND exp < ?`,
    [transform.uuid.toBinary(userUuid), new Date()],
  );
};

export default {
  findOneByUuid,
  insertOne,
  deleteOneByUuid,
  deleteExpiredByUserUuid,
};

import jwt from 'jsonwebtoken';

import NotFoundError from '../error/NotFoundError.js';
import transform from '../utility/transform.js';

export class TokenRepository {
  constructor(db, appConfig) {
    this.db = db;
    this.appConfig = appConfig;
  }

  async findOneByUuid(uuid) {
    const [tokens] = await this.db.execute(
      `SELECT * FROM \`${this.appConfig.refreshTokenTableName}\` WHERE uuid = ?`,
      [transform.uuid.toBinary(uuid)],
    );

    if (tokens.length === 0) {
      throw new NotFoundError();
    }

    return tokens[0];
  }

  async insertOne(refreshToken) {
    const decodedRT = jwt.decode(refreshToken);

    await this.db.execute(
      `INSERT INTO ${this.appConfig.refreshTokenTableName} (uuid, user_uuid, device_info, iat, exp, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transform.uuid.toBinary(decodedRT.refreshTokenUuid),
        transform.uuid.toBinary(decodedRT.userUuid),
        decodedRT.deviceInfo,
        new Date(decodedRT.iat * 1000),
        new Date(decodedRT.exp * 1000),
        new Date(),
      ],
    );
  }

  async deleteOneByUuid(uuid) {
    await this.db.execute(
      `DELETE FROM \`${this.appConfig.refreshTokenTableName}\` WHERE uuid = ?`,
      [transform.uuid.toBinary(uuid)],
    );
  }

  async deleteExpiredByUserUuid(userUuid) {
    await this.db.execute(
      `DELETE FROM \`${this.appConfig.refreshTokenTableName}\` WHERE user_uuid = ? AND exp < ?`,
      [transform.uuid.toBinary(userUuid), new Date()],
    );
  }
}

export default TokenRepository;

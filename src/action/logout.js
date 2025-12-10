import jwt from 'jsonwebtoken';
import { parse as uuidParse } from 'uuid';

import appConfig from '../../config/app-config.js';
import db from '../db.js';

export default async function logout(req, res) {
  const token = req.headers['refresh_token'];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const refreshTokenUuidBinary = Buffer.from(uuidParse(payload.refreshTokenUuid));
    await db.execute(`DELETE FROM ${appConfig.refreshTokenTableName} WHERE uuid = ?`, [
      refreshTokenUuidBinary,
    ]);

    return res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.sendStatus(403);
    }

    console.error(err);

    if (err instanceof jwt.JsonWebTokenError) {
      return res.sendStatus(403);
    }

    return res.sendStatus(500);
  }
}

import Joi from 'joi';
import jwt from 'jsonwebtoken';

import { tenantIds } from '../../config/tenants.js';
import { getDb } from '../db.js';
import TokenRepository from '../repository/tokenRepository.js';
import getAppConfig from '../utility/appConfig.js';

export default async function logout(req, res) {
  const accessToken = req.headers['access_token'];

  if (!accessToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const { system } = getValidatedData(req);
    const db = await getDb(system);
    const appConfig = await getAppConfig(system);
    const tokenRepository = new TokenRepository(db, appConfig);
    await tokenRepository.deleteOneByUuid(payload.refreshTokenUuid);

    return res.json({ message: 'Successfully logged out.' });
  } catch (err) {
    if (err instanceof Joi.ValidationError) {
      return res.status(422).json({
        message: 'Invalid data',
        type: 'logout',
        details: err.details.map(
          ({ type, context }) => `${context.key}.${type.split('.').slice(1).join('.')}`,
        ),
      });
    }

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

const getValidatedData = (req) => {
  const { error, value } = schema.validate(req.query ?? {}, { abortEarly: false });

  if (error) {
    throw error;
  }

  return value;
};

const schema = Joi.object({
  system: Joi.string()
    .valid(...tenantIds)
    .optional()
    .default('default'),
});

import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { stringify as uuidStringify, v7 as uuidv7 } from 'uuid';

import { tenantIds } from '../../config/tenants.js';
import { getDb } from '../db.js';
import NotFoundError from '../error/NotFoundError.js';
import TokenRepository from '../repository/tokenRepository.js';
import UserRepository from '../repository/userRepository.js';
import getAppConfig from '../utility/appConfig.js';
import token from '../utility/token.js';

export default async function refresh(req, res) {
  const refreshToken = req.headers['refresh_token'];

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  try {
    const { refreshTokenUuid, userUuid } = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const { system } = getValidatedData(req);
    const db = await getDb(system);
    const appConfig = await getAppConfig(system);
    const tokenRepository = new TokenRepository(db, appConfig);
    const userRepository = new UserRepository(db, appConfig);
    const currentToken = await tokenRepository.findOneByUuid(refreshTokenUuid);
    const user = await userRepository.findOneByUuid(userUuid);

    await tokenRepository.deleteOneByUuid(refreshTokenUuid);

    const accessToken = token.accessToken.create(user);
    const newRefreshToken = token.refreshToken.create(
      uuidv7(),
      uuidStringify(user.uuid),
      req.headers['user-agent'] || currentToken.device_info,
    );
    await tokenRepository.insertOne(newRefreshToken);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err instanceof Joi.ValidationError) {
      return res.status(422).json({
        message: 'Invalid data',
        type: 'refresh',
        details: err.details.map(
          ({ type, context }) => `${context.key}.${type.split('.').slice(1).join('.')}`,
        ),
      });
    }

    // TODO - to make it stricter - I can invalidate all user tokens here (Security Alert)
    if (err instanceof NotFoundError) {
      return res.sendStatus(403);
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
  const { error, value } = schema.validate(req.query, { abortEarly: false });

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

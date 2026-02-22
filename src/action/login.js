import Joi from 'joi';
import { stringify as uuidStringify, v7 as uuidv7 } from 'uuid';

import { tenantIds } from '../../config/tenants.js';
import { getDb } from '../db.js';
import InvalidCredentialsError from '../error/InvalidCredentialsError.js';
import TokenRepository from '../repository/tokenRepository.js';
import UserRepository from '../repository/userRepository.js';
import getAppConfig from '../utility/appConfig.js';
import LazyCleanupExpiredTokens from '../utility/lazyCleanupExpiredTokens.js';
import token from '../utility/token.js';

export default async function login(req, res) {
  try {
    const { username, password, deviceInfo, system } = getValidatedData(req);
    const db = await getDb(system);
    const appConfig = await getAppConfig(system);
    const tokenRepository = new TokenRepository(db, appConfig);
    const userRepository = new UserRepository(db, appConfig);
    const user = await userRepository.findOneByCredentials(username, password);
    new LazyCleanupExpiredTokens(tokenRepository).run(user.uuid);
    const refreshTokenUuid = uuidv7();
    const refreshToken = token.refreshToken.create(
      refreshTokenUuid,
      uuidStringify(user.uuid),
      deviceInfo,
    );
    const accessToken = token.accessToken.create(user, refreshTokenUuid);
    await tokenRepository.insertOne(refreshToken);

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    if (err instanceof Joi.ValidationError) {
      return res.status(422).json({
        message: 'Missing credentials',
        type: 'credentials.missing',
        details: err.details.map(
          ({ type, context }) => `${context.key}.${type.split('.').slice(1).join('.')}`,
        ),
      });
    }

    if (err instanceof InvalidCredentialsError) {
      return res.status(401).json({ message: 'Invalid credentials', type: 'credentials.invalid' });
    }

    console.error(err);

    return res.sendStatus(500);
  }
}

const getValidatedData = (req) => {
  const deviceInfo = req.headers['user-agent'] || 'unknown';
  const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false });

  if (error) {
    throw error;
  }

  return { ...value, deviceInfo };
};

const schema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
  system: Joi.string()
    .valid(...tenantIds)
    .optional()
    .default('default'),
});

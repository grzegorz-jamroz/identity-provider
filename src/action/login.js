import Joi from 'joi';
import { stringify as uuidStringify, v7 as uuidv7 } from 'uuid';

import InvalidCredentialsError from '../error/InvalidCredentialsError.js';
import tokenRepository from '../repository/tokenRepository.js';
import userRepository from '../repository/userRepository.js';
import lazyCleanupExpiredTokens from '../utility/lazyCleanupExpiredTokens.js';
import token from '../utility/token.js';

export default async function login(req, res) {
  try {
    const { username, password, deviceInfo } = getValidatedData(req);
    const user = await userRepository.findOneByCredentials(username, password);
    lazyCleanupExpiredTokens(user.uuid);
    const accessToken = token.accessToken.create(user);
    const refreshToken = token.refreshToken.create(uuidv7(), uuidStringify(user.uuid), deviceInfo);
    await tokenRepository.insertOne(refreshToken);

    return res.json({ accessToken, refreshToken });
  } catch (err) {
    if (err instanceof Joi.ValidationError) {
      return res.status(422).json({
        message: 'Missing credentials',
        type: 'credentials.missing',
        types: err.details.map(
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
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    throw error;
  }

  return { ...value, deviceInfo };
};

const schema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

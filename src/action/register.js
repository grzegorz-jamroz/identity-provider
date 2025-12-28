import bcrypt from 'bcrypt';
import Joi from 'joi';
import { parse as uuidParse, v7 as uuidv7 } from 'uuid';

import { tenantIds } from '../../config/tenants.js';
import { getDb } from '../db.js';
import NotFoundError from '../error/NotFoundError.js';
import UserRepository from '../repository/userRepository.js';
import getAppConfig from '../utility/appConfig.js';

export default async function register(req, res) {
  if (process.env.ENABLE_REGISTRATION !== 'true') {
    return res.status(404).send('Registration is disabled');
  }

  try {
    const { username, email, password, system } = getValidatedData(req);
    const db = await getDb(system);
    const appConfig = await getAppConfig(system);
    const userRepository = new UserRepository(db, appConfig);

    try {
      await userRepository.getUuidByUsernameOrEmail(username, email);

      return res.status(409).json({ message: 'User already exists' });
    } catch (err) {
      if (err instanceof NotFoundError === false) {
        throw err;
      }
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 10));
    const userUuid = uuidv7();
    const userUuidBinary = Buffer.from(uuidParse(userUuid));
    await userRepository.insertOne({
      userUuidBinary,
      username,
      email,
      hashedPassword,
    });

    return res.status(201).json({ message: 'User created', uuid: userUuid });
  } catch (err) {
    if (err instanceof Joi.ValidationError) {
      return res.status(422).json({
        message: 'Invalid data',
        type: 'register',
        details: err.details.map(
          ({ type, context }) => `${context.key}.${type.split('.').slice(1).join('.')}`,
        ),
      });
    }

    console.error(err);

    return res.sendStatus(500);
  }
}

const getValidatedData = (req) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    throw error;
  }

  return value;
};

const schema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .min(1)
    .max(50)
    .trim()
    .required(),

  email: Joi.string().email().trim().lowercase().required(),

  password: Joi.string().min(8).max(72).required(),

  system: Joi.string()
    .valid(...tenantIds)
    .optional()
    .default('default'),
});

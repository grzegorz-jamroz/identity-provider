import bcrypt from 'bcrypt';
import Joi from 'joi';
import { parse as uuidParse, v7 as uuidv7 } from 'uuid';

import appConfig from '../../config/app-config.js';
import db from '../db.js';

export default async function register(req, res) {
  if (process.env.ENABLE_REGISTRATION !== 'true') {
    return res.status(404).send('Registration is disabled');
  }

  try {
    const { username, email, password } = getValidatedData(req);
    const [existing] = await db.execute(
      `SELECT uuid
       FROM ${appConfig.userTableName}
       WHERE email = ?
          OR username = ?`,
      [email, username],
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 10));
    const userUuid = uuidv7();
    const userUuidBinary = Buffer.from(uuidParse(userUuid));

    await db.execute(
      `INSERT INTO ${appConfig.userTableName} (uuid, username, email, password, roles, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userUuidBinary,
        username,
        email,
        hashedPassword,
        JSON.stringify(['ROLE_USER']),
        new Date(),
        new Date(),
      ],
    );

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
});

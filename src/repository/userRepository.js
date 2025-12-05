import bcrypt from 'bcrypt';

import appConfig from '../../config/app-config.js';
import db from '../db.js';
import InvalidCredentialsError from '../error/InvalidCredentialsError.js';
import NotFoundError from '../error/NotFoundError.js';
import transform from '../utility/transform.js';

const findOneByUuid = async (uuid) => {
  const [users] = await db.execute(`SELECT * FROM ${appConfig.userTableName} WHERE uuid = ?`, [
    transform.uuid.toBinary(uuid),
  ]);

  if (users.length === 0) {
    throw new NotFoundError();
  }

  return users[0];
};

const findOneByCredentials = async (username, password) => {
  const [users] = await db.execute(
    `SELECT * FROM ${appConfig.userTableName} WHERE email = ? OR username = ?`,
    [username, username],
  );

  const error = new InvalidCredentialsError('Invalid credentials');

  if (users.length === 0) {
    throw error;
  }

  const user = users[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw error;
  }

  return user;
};

export default {
  findOneByUuid,
  findOneByCredentials,
};

import bcrypt from 'bcrypt';

import InvalidCredentialsError from '../error/InvalidCredentialsError.js';
import NotFoundError from '../error/NotFoundError.js';
import transform from '../utility/transform.js';

export class UserRepository {
  constructor(db, appConfig) {
    this.db = db;
    this.appConfig = appConfig;
  }

  async findOneByUuid(uuid) {
    const [users] = await this.db.execute(
      `SELECT * FROM \`${this.appConfig.userTableName}\` WHERE uuid = ?`,
      [transform.uuid.toBinary(uuid)],
    );

    if (users.length === 0) {
      throw new NotFoundError();
    }

    return users[0];
  }

  async findOneByCredentials(username, password) {
    const [users] = await this.db.execute(
      `SELECT * FROM \`${this.appConfig.userTableName}\` WHERE email = ? OR username = ?`,
      [username, username],
    );

    const error = new InvalidCredentialsError('Invalid credentials');

    if (users.length === 0) {
      throw error;
    }

    const user = users[0];

    // Replace the prefix in the string before comparing (PHP uses $2y, but Node prefer $2b)
    const passwordHash = user.password.replace(/^\$2y/, '$2b');

    const match = await bcrypt.compare(password, passwordHash);

    if (!match) {
      throw error;
    }

    return user;
  }

  async getUuidByUsernameOrEmail(username, email) {
    const [users] = await this.db.execute(
      `SELECT uuid
       FROM \`${this.appConfig.userTableName}\`
       WHERE email = ?
          OR username = ?`,
      [email, username],
    );

    if (users.length === 0) {
      throw new NotFoundError();
    }

    return users[0].uuid;
  }

  async insertOne({
    userUuidBinary,
    username,
    email,
    hashedPassword,
    roles,
    createdAt,
    updatedAt,
  }) {
    await this.db.execute(
      `INSERT INTO \`${this.appConfig.userTableName}\` (uuid, username, email, password, roles, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userUuidBinary,
        username,
        email,
        hashedPassword,
        roles || JSON.stringify(['ROLE_USER']),
        createdAt || new Date(),
        updatedAt || new Date(),
      ],
    );
  }
}

export default UserRepository;

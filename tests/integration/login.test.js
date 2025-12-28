import { jest } from '@jest/globals';
import request from 'supertest';
import { stringify as uuidStringify } from 'uuid';

import app from '../../src/app.js';
import { getDb } from '../../src/db.js';
import getAppConfig from '../../src/utility/appConfig.js';
import { createUser } from '../helper.js';

process.env.NODE_ENV = 'test';

describe('Integration Login Tests', () => {
  let db;
  let appConfig;

  beforeAll(async () => {
    db = await getDb();
    appConfig = await getAppConfig();
  });

  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /login', () => {
    it('should register and then login successfully using email in credentials', async () =>
      await testUserLogin('real@test.com', 'Password123!', db));

    it('should register and then login successfully using username in credentials', async () =>
      await testUserLogin('realuser', 'Password123!', db));

    it('should fail when missing credentials', async () => {
      // When
      const res = await request(app).post('/login').send({});

      // Then
      expect(res.statusCode).toBe(422);
      expect(res.body).toStrictEqual({
        message: 'Missing credentials',
        type: 'credentials.missing',
        details: ['username.required', 'password.required'],
      });
    });

    it('should fail login when wrong username', async () => {
      // Expect & Given
      const createUserResponse = await createUser();
      expect(createUserResponse.statusCode).toBe(201);
      expect(createUserResponse.body.message).toBe('User created');

      // When
      const res = await request(app).post('/login').send({
        username: 'wrong_username',
        password: 'Password123!',
      });

      // Then
      expect(res.statusCode).toBe(401);
      expect(res.body).toStrictEqual({
        message: 'Invalid credentials',
        type: 'credentials.invalid',
      });
    });

    it('should fail login when wrong password', async () => {
      // Expect & Given
      const createUserResponse = await createUser();
      expect(createUserResponse.statusCode).toBe(201);
      expect(createUserResponse.body.message).toBe('User created');

      // When
      const res = await request(app).post('/login').send({
        username: 'real@test.com',
        password: 'wrong_password',
      });

      // Then
      expect(res.statusCode).toBe(401);
      expect(res.body).toStrictEqual({
        message: 'Invalid credentials',
        type: 'credentials.invalid',
      });
    });

    it('should return 500 when db connection is lost', async () => {
      jest.spyOn(db, 'execute').mockImplementationOnce(() => {
        throw new Error('Unexpected DB Connection Cut');
      });

      // When
      const res = await request(app).post('/login').send({
        username: 'real@test.com',
        password: 'wrong_password',
      });

      // Then
      expect(res.statusCode).toBe(500);
    });

    it('should login user when db connection is lost for lazy cleanup', async () => {
      // Expect & Given
      const originalExecute = db.execute;

      jest.spyOn(db, 'execute').mockImplementation((sql, params) => {
        if (sql.includes(`DELETE FROM ${appConfig.refreshTokenTableName} WHERE user_uuid`)) {
          throw new Error('Simulated cleanup error');
        }

        return originalExecute.call(db, sql, params);
      });

      // When & Then
      await testUserLogin('real@test.com', 'Password123!', db);
    });
  });
});

export const testUserLogin = async (username, password, db) => {
  // Expect & Given
  const createUserResponse = await createUser();
  expect(createUserResponse.statusCode).toBe(201);
  expect(createUserResponse.body.message).toBe('User created');
  const userUuid = createUserResponse.body.uuid;

  // When
  const res = await request(app).post('/login').send({
    username,
    password,
  });

  // Then
  expect(res.statusCode).toBe(200);
  expect(res.body.accessToken).toBeDefined();
  expect(res.body.refreshToken).toBeDefined();

  const [refreshTokenRows] = await db.execute('SELECT * FROM refresh_token');
  expect(refreshTokenRows.length).toBe(1);
  const refreshTokenData = refreshTokenRows[0];
  expect(refreshTokenData.user_uuid).toBeDefined();
  expect(refreshTokenData.iat).toBeDefined();
  expect(refreshTokenData.exp).toBeDefined();
  expect(refreshTokenData.created_at).toBeDefined();
  expect(uuidStringify(refreshTokenData.user_uuid)).toBe(userUuid);

  return res;
};

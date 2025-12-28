import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';

import app from '../../src/app.js';
import { getDb } from '../../src/db.js';
import { createUser } from '../helper.js';

import { testUserLogin } from './login.test.js';

process.env.NODE_ENV = 'test';

describe('Integration Auth Tests', () => {
  let db;

  beforeAll(async () => {
    db = await getDb();
  });

  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /auth', () => {
    it('should register, login and auth successfully', async () => {
      // Expect & Given
      const loginResponse = await testUserLogin('real@test.com', 'Password123!', db);
      const accessToken = loginResponse.body.accessToken;

      // When
      const response = await request(app).post('/auth').set('access_token', accessToken);

      // Then
      expect(response.statusCode).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.uuid).toBeDefined();
      expect(response.body.user.username).toBe('realuser');
      expect(response.body.user.email).toBe('real@test.com');
      expect(response.body.user.roles).toBe(JSON.stringify(['ROLE_USER']));
    });

    it('should return 401 when refresh_token is not present in headers', async () => {
      const response = await request(app).post('/auth');

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when access_token is expired', async () => {
      // Expect & Given
      process.env.ACCESS_TOKEN_EXPIRES_IN = '1s';
      const accessToken = await getAccessTokenAfterLogin();

      // Wait for 3 seconds to ensure the token is expired
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // When
      const response = await request(app).post('/auth').set('access_token', accessToken);

      // Then
      expect(response.statusCode).toBe(403);

      // Cleanup for other tests
      process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
    });

    it('should return 403 when access_token has invalid signature', async () => {
      // Expect & Given
      const refreshTokenWithInvalidSignature = jwt.sign(
        {
          refreshTokenUuid: uuidv7(),
          userUuid: uuidv7(),
          deviceInfo: 'undefined',
        },
        'invalid_secret_key',
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN },
      );

      // When
      const response = await request(app)
        .post('/auth')
        .set('access_token', refreshTokenWithInvalidSignature);

      // Then
      expect(response.statusCode).toBe(403);
    });
  });
});

export const getAccessTokenAfterLogin = async () => {
  await createUser();
  const loginRes = await request(app).post('/login').send({
    username: 'real@test.com',
    password: 'Password123!',
  });

  return loginRes.body.accessToken;
};

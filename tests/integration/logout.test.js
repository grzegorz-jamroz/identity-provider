import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { parse as uuidParse, v7 as uuidv7 } from 'uuid';

import appConfig from '../../config/app-config.js';
import app from '../../src/app.js';
import db from '../../src/db.js';

import { testUserLogin } from './login.test.js';
import { getRefreshTokenAfterLogin } from './refresh.test.js';

process.env.NODE_ENV = 'test';

describe('Integration Logout Tests', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /logout', () => {
    it('should register, login and logout successfully', async () => {
      // Expect & Given
      const loginResponse = await testUserLogin('real@test.com', 'Password123!');
      const refreshToken = loginResponse.body.refreshToken;

      // When
      const response = await request(app).get('/logout').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Successfully logged out.');

      const payload = jwt.decode(refreshToken);
      const [tokens] = await db.execute('SELECT * FROM refresh_token WHERE uuid = ?', [
        Buffer.from(uuidParse(payload.refreshTokenUuid)),
      ]);
      expect(tokens.length).toBe(0);
    });

    it('should return 401 when refresh_token is not present in headers', async () => {
      const response = await request(app).get('/logout');

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when refresh_token is expired', async () => {
      // Expect & Given
      process.env.REFRESH_TOKEN_EXPIRES_IN = '1s';
      const refreshToken = await getRefreshTokenAfterLogin();
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // When
      const response = await request(app).get('/logout').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(403);

      // Cleanup for other tests
      process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    });

    it('should return 403 when refresh_token has invalid signature', async () => {
      // Expect & Given
      const refreshTokenWithInvalidSignature = jwt.sign(
        {
          refreshTokenUuid: uuidv7(),
          userUuid: uuidv7(),
          deviceInfo: 'undefined',
        },
        'invalid_secret_key',
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN },
      );

      // When
      const response = await request(app)
        .get('/logout')
        .set('refresh_token', refreshTokenWithInvalidSignature);

      // Then
      expect(response.statusCode).toBe(403);
    });

    it('should return 500 when db connection is lost', async () => {
      // Expect & Given
      const originalExecute = db.execute;

      jest.spyOn(db, 'execute').mockImplementation((sql, params) => {
        if (sql.includes(`DELETE FROM ${appConfig.refreshTokenTableName} WHERE uuid`)) {
          throw new Error('Simulated cleanup error');
        }

        return originalExecute.call(db, sql, params);
      });
      const loginResponse = await testUserLogin('real@test.com', 'Password123!');
      const refreshToken = loginResponse.body.refreshToken;

      // When
      const response = await request(app).get('/logout').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(500);
    });
  });
});

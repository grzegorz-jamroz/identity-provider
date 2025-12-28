import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { parse as uuidParse, v7 as uuidv7 } from 'uuid';

import app from '../../src/app.js';
import { getDb } from '../../src/db.js';
import { createUser } from '../helper.js';

process.env.NODE_ENV = 'test';

describe('Integration Refresh Tests', () => {
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

  describe('GET /refresh', () => {
    it('should rotate tokens correctly', async () => {
      // Expect & Given
      const refreshToken = await getRefreshTokenAfterLogin();

      // When
      const response = await request(app).get('/refresh').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(200);
      const newRefreshToken = response.body.refreshToken;

      const oldPayload = jwt.decode(refreshToken);
      const [oldTokens] = await db.execute('SELECT * FROM refresh_token WHERE uuid = ?', [
        Buffer.from(uuidParse(oldPayload.refreshTokenUuid)),
      ]);
      expect(oldTokens.length).toBe(0);

      const newPayload = jwt.decode(newRefreshToken);
      const [newTokens] = await db.execute('SELECT * FROM refresh_token WHERE uuid = ?', [
        Buffer.from(uuidParse(newPayload.refreshTokenUuid)),
      ]);
      expect(newTokens.length).toBe(1);
    });

    it('should not allow to use refresh token twice', async () => {
      // Expect & Given
      const refreshToken = await getRefreshTokenAfterLogin();

      // When
      await request(app).get('/refresh').set('refresh_token', refreshToken);
      const response = await request(app).get('/refresh').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(403);
    });

    it('should return 401 when refresh_token is not present in headers', async () => {
      const response = await request(app).get('/refresh');

      expect(response.statusCode).toBe(401);
    });

    it('should return 403 when user does not exist', async () => {
      // Expect & Given
      const refreshToken = await getRefreshTokenAfterLogin();
      const decodedRT = jwt.decode(refreshToken);
      const refreshTokenWithInvalidUserUuid = jwt.sign(
        {
          refreshTokenUuid: decodedRT.refreshTokenUuid,
          userUuid: uuidv7(),
          deviceInfo: decodedRT.deviceInfo,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN },
      );

      // When
      const response = await request(app)
        .get('/refresh')
        .set('refresh_token', refreshTokenWithInvalidUserUuid);

      // Then
      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when refresh_token is expired', async () => {
      // Expect & Given
      process.env.REFRESH_TOKEN_EXPIRES_IN = '1s';
      const refreshToken = await getRefreshTokenAfterLogin();
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // When
      const response = await request(app).get('/refresh').set('refresh_token', refreshToken);

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
        .get('/refresh')
        .set('refresh_token', refreshTokenWithInvalidSignature);

      // Then
      expect(response.statusCode).toBe(403);
    });

    it('should return 422 when invalid "system" parameter is provided', async () => {
      // Expect & Given
      const refreshToken = await getRefreshTokenAfterLogin();

      // When
      const response = await request(app)
        .get('/refresh')
        .set('refresh_token', refreshToken)
        .query({ system: 'invalid_system' });

      // Then
      expect(response.statusCode).toBe(422);
      expect(response.body.message).toBe('Invalid data');
      expect(response.body.details).toEqual(['system.only']);
    });

    it('should return 500 when db connection is lost', async () => {
      // Expect & Given
      const refreshToken = await getRefreshTokenAfterLogin();
      jest.spyOn(db, 'execute').mockImplementationOnce(() => {
        throw new Error('Unexpected DB Connection Cut');
      });

      // When
      const response = await request(app).get('/refresh').set('refresh_token', refreshToken);

      // Then
      expect(response.statusCode).toBe(500);
    });
  });
});

export const getRefreshTokenAfterLogin = async () => {
  await createUser();
  const loginRes = await request(app).post('/login').send({
    username: 'real@test.com',
    password: 'Password123!',
  });

  return loginRes.body.refreshToken;
};

import { jest } from '@jest/globals';

import db from '../../src/db.js';
import { createUser } from '../helper.js';

process.env.NODE_ENV = 'test';

describe('Integration Register Tests', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM refresh_token');
    await db.execute('DELETE FROM user');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /register', () => {
    it('should register user', async () => {
      // When
      const response = await createUser({
        username: 'realuser',
        email: 'real@test.com',
        password: 'Password123!',
      });

      // Then
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('User created');
      expect(response.body.uuid).toBeDefined();
    });

    it('should return 422 when validation fails', async () => {
      // When
      const response = await createUser({
        username: 'realuser&*%#',
        email: 'not-an-email',
        password: '123',
      });

      // Then
      expect(response.statusCode).toBe(422);
      expect(response.body.message).toBe('Invalid data');
      expect(response.body.details).toEqual([
        'username.pattern.base',
        'email.email',
        'password.min',
      ]);
    });

    it('should return 409 when user already exists', async () => {
      // Expect & Given
      await createUser();

      // When
      const response = await createUser({
        username: 'realuser',
        email: 'new@test.com',
        password: 'super-strong-pass123!',
      });

      // Then
      expect(response.statusCode).toBe(409);
      expect(response.body.message).toBe('User already exists');
    });

    it('should return 404 when registration is disabled', async () => {
      // Expect & Given
      process.env.ENABLE_REGISTRATION = 'false';

      // When
      const response = await createUser();

      // Then
      expect(response.statusCode).toBe(404);
      expect(response.text).toBe('Registration is disabled');

      // cleanup other tests
      process.env.ENABLE_REGISTRATION = 'true';
    });

    it('should return 500 when db connection is lost', async () => {
      // Expect & Given
      jest.spyOn(db, 'execute').mockImplementationOnce(() => {
        throw new Error('Unexpected DB Connection Cut');
      });

      // When
      const response = await createUser();

      // Then
      expect(response.statusCode).toBe(500);
    });
  });
});

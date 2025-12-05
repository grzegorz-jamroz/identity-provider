import request from 'supertest';

import app from '../src/app.js';

export const createUser = async (userData = {}) =>
  await request(app)
    .post('/register')
    .send({
      username: userData.username || 'realuser',
      email: userData.email || 'real@test.com',
      password: userData.password || 'Password123!',
    });

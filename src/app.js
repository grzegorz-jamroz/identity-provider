import express from 'express';

import auth from './action/auth.js';
import login from './action/login.js';
import logout from './action/logout.js';
import refresh from './action/refresh.js';
import register from './action/register.js';

const app = express();
app.use(express.json());

app.post('/register', register);
app.post('/login', login);
app.post('/auth', auth);
app.get('/refresh', refresh);
app.get('/logout', logout);

export default app;

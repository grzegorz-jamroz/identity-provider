import jwt from 'jsonwebtoken';

export default function auth(req, res) {
  const token = req.headers['access_token'];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    return res.json({ valid: true, user });
  });
}

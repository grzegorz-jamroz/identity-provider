import jwt from 'jsonwebtoken';
import { stringify as uuidStringify, v7 as uuidv7 } from 'uuid';

import NotFoundError from '../error/NotFoundError.js';
import tokenRepository from '../repository/tokenRepository.js';
import userRepository from '../repository/userRepository.js';
import token from '../utility/token.js';

export default async function refresh(req, res) {
  const refreshToken = req.headers['refresh_token'];

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  try {
    const { refreshTokenUuid, userUuid } = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const currentToken = await tokenRepository.findOneByUuid(refreshTokenUuid);
    const user = await userRepository.findOneByUuid(userUuid);

    await tokenRepository.deleteOneByUuid(refreshTokenUuid);

    const accessToken = token.accessToken.create(user);
    const newRefreshToken = token.refreshToken.create(
      uuidv7(),
      uuidStringify(user.uuid),
      req.headers['user-agent'] || currentToken.device_info,
    );
    await tokenRepository.insertOne(newRefreshToken);

    return res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    // TODO - to make it stricter - I can invalidate all user tokens here (Security Alert)
    if (err instanceof NotFoundError) {
      return res.sendStatus(403);
    }

    if (err instanceof jwt.TokenExpiredError) {
      return res.sendStatus(403);
    }

    console.error(err);

    if (err instanceof jwt.JsonWebTokenError) {
      return res.sendStatus(403);
    }

    return res.sendStatus(500);
  }
}

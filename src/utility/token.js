import jwt from 'jsonwebtoken';
import { stringify as uuidStringify } from 'uuid';

const createAccessPayload = (user) => {
  const fields = process.env.ACCESS_TOKEN_PAYLOAD_USER_FIELDS.split(',');
  const payload = {};
  fields.forEach((field) => {
    if (user[field.trim()] !== undefined) {
      payload[field.trim()] = user[field.trim()];
    }
  });

  return payload;
};

const createAccessToken = (user, refreshTokenUuid) => {
  let uuid = user.uuid;

  if (typeof uuid !== 'string') {
    uuid = uuidStringify(user.uuid);
  }

  const payloadData = createAccessPayload(user);

  return jwt.sign({ ...payloadData, uuid, refreshTokenUuid }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  });
};

const createRefreshToken = (refreshTokenUuid, userUuid, deviceInfo) => {
  const refreshTokenPayload = {
    refreshTokenUuid,
    userUuid,
    deviceInfo,
  };

  return jwt.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

export default {
  accessToken: {
    create: createAccessToken,
  },
  refreshToken: {
    create: createRefreshToken,
  },
};

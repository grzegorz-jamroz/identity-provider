import { parse as uuidParse } from 'uuid';

const toBinary = (uuid) => {
  if (typeof uuid === 'string') {
    return Buffer.from(uuidParse(uuid));
  }

  return uuid;
};

export default {
  uuid: {
    toBinary,
  },
};

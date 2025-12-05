import tokenRepository from '../repository/tokenRepository.js';

export default async function lazyCleanupExpiredTokens(userUuid) {
  try {
    await tokenRepository.deleteExpiredByUserUuid(userUuid);
  } catch (cleanupErr) {
    console.error('Lazy cleanup failed:', cleanupErr);
  }
}

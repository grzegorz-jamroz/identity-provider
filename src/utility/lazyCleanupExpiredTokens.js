export class LazyCleanupExpiredTokens {
  constructor(tokenRepository) {
    this.tokenRepository = tokenRepository;
  }

  async run(userUuid) {
    try {
      await this.tokenRepository.deleteExpiredByUserUuid(userUuid);
    } catch (cleanupErr) {
      console.error('Lazy cleanup failed:', cleanupErr);
    }
  }
}

export default LazyCleanupExpiredTokens;

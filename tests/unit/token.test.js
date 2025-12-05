import tokenUtil from '../../src/utility/token.js';

process.env.ACCESS_TOKEN_PAYLOAD_USER_FIELDS = 'username,email,role';
process.env.ACCESS_TOKEN_SECRET = 'test-secret';
process.env.ACCESS_TOKEN_EXPIRES_IN = '1h';
process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
process.env.REFRESH_TOKEN_EXPIRES_IN = '1d';

describe('Token Utility (Unit)', () => {
  describe('createAccessToken', () => {
    it('should skip UUID conversion if UUID is already a string', () => {
      // Expect & Given
      const mockUser = {
        uuid: 'already-a-string-uuid',
        username: 'test',
        email: 'test@test.com',
      };

      // When
      const token = tokenUtil.accessToken.create(mockUser);

      // Then
      expect(token).toBeDefined();
    });

    it('should ignore user fields that are undefined', () => {
      // Expect & Given
      const mockUser = {
        uuid: '123',
        username: 'test',
        // email is MISSING intentionally
        // role is MISSING intentionally
      };

      // When
      const token = tokenUtil.accessToken.create(mockUser);

      // Then
      expect(token).toBeDefined();
    });
  });
});

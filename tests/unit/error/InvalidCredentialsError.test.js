import InvalidCredentialsError from '../../../src/error/InvalidCredentialsError.js';

describe('InvalidCredentialsError', () => {
  it('should use default values when instantiated with no arguments', () => {
    // When
    const error = new InvalidCredentialsError();

    // Then
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid credentials');
    expect(error.status).toBe(401);
    expect(error.type).toBe('credentials.invalid');
  });

  it('should use all custom values when arguments are provided', () => {
    // Given
    const customMsg = 'My Custom Error';
    const customOpts = { status: 403, type: 'custom.type' };

    // When
    const error = new InvalidCredentialsError(customMsg, customOpts);

    // Then
    expect(error.message).toBe(customMsg);
    expect(error.status).toBe(403);
    expect(error.type).toBe('custom.type');
  });

  it('should use default properties if options object is empty', () => {
    // When
    const error = new InvalidCredentialsError('Msg', {});

    // Then
    expect(error.status).toBe(401);
    expect(error.type).toBe('credentials.invalid');
  });
});

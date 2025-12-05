export default class InvalidCredentialsError extends Error {
  constructor(message = 'Invalid credentials', { status, type } = {}) {
    super(message);
    this.status = status || 401;
    this.type = type || 'credentials.invalid';
  }
}

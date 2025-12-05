import { jest } from '@jest/globals';

describe('Register Action Unit Tests', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // Clear cache to allow re-importing with new mocks
    process.env = { ...ORIGINAL_ENV }; // Reset Env Vars
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // Helper to mock dependencies and import the function under test
  const setupTest = async () => {
    // 1. Mock DB: First call returns empty (no user found), Second call succeeds (insert)
    const dbExecuteMock = jest
      .fn()
      .mockResolvedValueOnce([[]]) // SELECT returns empty array (no user)
      .mockResolvedValueOnce([{ insertId: 1 }]); // INSERT success

    // 2. Mock Bcrypt: We spy on hash to check the 'rounds' argument
    const bcryptHashMock = jest.fn().mockResolvedValue('hashed_password');

    // 3. Mock UUID to avoid binary conversion errors in unit test
    const uuidMock = {
      parse: () => Buffer.from('12345678123456781234567812345678', 'hex'),
      v7: () => '018d...uuid',
    };

    // 4. Setup ES Module Mocks
    jest.unstable_mockModule('../../../src/db.js', () => ({ default: { execute: dbExecuteMock } }));
    jest.unstable_mockModule('bcrypt', () => ({ default: { hash: bcryptHashMock } }));
    jest.unstable_mockModule('uuid', () => uuidMock);

    // 5. Import the file being tested
    const registerAction = (await import('../../../src/action/register.js')).default;

    return { registerAction, bcryptHashMock };
  };

  // Helper to create a fake Express Request/Response
  const createReqRes = () => {
    const req = {
      body: { username: 'unit', email: 'unit@test.com', password: 'password123' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    return { req, res };
  };

  it('should use the Environment Variable for salt rounds if defined', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    const { registerAction, bcryptHashMock } = await setupTest();
    process.env.BCRYPT_ROUNDS = '15'; // Specific value

    const { req, res } = createReqRes();

    await registerAction(req, res);

    // Verify bcrypt was called with 15
    expect(bcryptHashMock).toHaveBeenCalledWith(expect.any(String), 15);
  });

  it('should use the DEFAULT 10 rounds if Environment Variable is missing', async () => {
    process.env.ENABLE_REGISTRATION = 'true';
    const { registerAction, bcryptHashMock } = await setupTest();
    delete process.env.BCRYPT_ROUNDS; // Force it to be undefined

    const { req, res } = createReqRes();

    await registerAction(req, res);

    // Verify bcrypt was called with default 10
    expect(bcryptHashMock).toHaveBeenCalledWith(expect.any(String), 10);
  });
});

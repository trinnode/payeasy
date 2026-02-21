// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';

// Extend Jest timeout for crypto operations
jest.setTimeout(10000);

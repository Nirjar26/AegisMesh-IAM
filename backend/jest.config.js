module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/utils/logger.js',
    '!src/config/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
};

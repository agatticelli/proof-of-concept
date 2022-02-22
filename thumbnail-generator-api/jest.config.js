module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.js'],
  collectCoverageFrom: ['src/**'],
  setupFilesAfterEnv: [
    '<rootDir>/jest.env.js',
  ],
};

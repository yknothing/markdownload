const baseConfig = require('./jest.config.js');

// Hybrid test configuration for real business logic testing
module.exports = {
  ...baseConfig,
  
  // Use different setup for hybrid tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/mocks/hybridMocks.js' // Use hybrid mocks instead of full mocks
  ],

  // Test file patterns - include all tests for hybrid execution
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // Enhanced coverage settings for real code execution
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    // Include more files in coverage since we're testing real logic
    '!src/browser-polyfill.min.js',
    '!src/background/moment.min.js', 
    '!src/background/turndown.js', // Still exclude third-party turndown
    '!src/background/turndown-plugin-gfm.js', // Still exclude third-party plugin
    '!src/background/Readability.js',
    '!src/popup/lib/**/*',
    '!src/**/node_modules/**',
    '!src/web-ext-artifacts/**',
    '!src/icons/**',
    '!src/**/*.min.js',
    '!src/**/*.config.js',
    '!src/**/*.spec.js',
    '!src/**/*.test.js',
    '!src/dist/**',
    '!src/build/**',
    '!src/.tmp/**'
  ],

  // More aggressive coverage thresholds for hybrid tests
  coverageThreshold: {
    global: {
      branches: 60,  // More realistic initial target
      functions: 65,
      lines: 70,
      statements: 70
    },
    './src/shared/': {
      branches: 70,  // Shared modules should have better coverage
      functions: 80,
      lines: 85,
      statements: 85
    }
  },

  // Test timeout for real logic execution
  testTimeout: 15000,

  // Additional Jest options for real logic testing
  verbose: true,
  bail: false, // Don't stop on first failure
  
  // Transform configuration to handle ES modules properly
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Note: Environment variables are now injected via process.env
  // HYBRID_TEST environment variable should be set by npm script

  // Fix jsdom configuration for compatibility
  testEnvironmentOptions: {
    ...baseConfig.testEnvironmentOptions,
    // Remove incompatible resources setting that causes ResourceLoader errors
    resources: undefined,
    runScripts: undefined
  }
};
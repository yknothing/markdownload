const baseConfig = require('./jest.config.js');

// Hybrid test configuration for real business logic testing
module.exports = {
  ...baseConfig,
  
  // Use different setup for hybrid tests
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/mocks/hybridMocks.js' // Use hybrid mocks instead of full mocks
  ],

  // Test file patterns - include hybrid tests
  testMatch: [
    '<rootDir>/tests/unit/hybrid-*.test.js',
    '<rootDir>/tests/unit/shared-real-logic.test.js',
    '<rootDir>/tests/unit/*-real-logic.test.js'
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

  // Enable additional debugging
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.HYBRID_TEST': 'true'
  }
};
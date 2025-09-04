const path = require('path');

module.exports = {
  // Test environment configuration
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable',
    runScripts: 'dangerously'
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/mocks/browserMocks.js',
    '<rootDir>/tests/mocks/turndownServiceMocks.js'
  ],

  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@background/(.*)$': '<rootDir>/src/background/$1',
    '^@popup/(.*)$': '<rootDir>/src/popup/$1',
    '^@contentScript/(.*)$': '<rootDir>/src/contentScript/$1',
    '^@options/(.*)$': '<rootDir>/src/options/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/background/core/$1',
    '^@polyfills/(.*)$': '<rootDir>/src/background/polyfills/$1',
    '^@converters/(.*)$': '<rootDir>/src/background/converters/$1',
    '^@extractors/(.*)$': '<rootDir>/src/background/extractors/$1',
    '^@download/(.*)$': '<rootDir>/src/background/download/$1',
    '^@api/(.*)$': '<rootDir>/src/background/api/$1',
    '^@utils/(.*)$': '<rootDir>/src/background/utils/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1'
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // Transform configuration
  transformIgnorePatterns: [
    'node_modules/(?!(jest-webextension-mock|browser-polyfill)/)'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    // Exclude minified and third-party libraries
    '!src/browser-polyfill.min.js',
    '!src/background/moment.min.js',
    '!src/background/turndown.js',
    '!src/background/turndown-plugin-gfm.js',
    '!src/background/Readability.js',
    '!src/popup/lib/**/*',
    // Exclude directories and patterns
    '!src/**/node_modules/**',
    '!src/web-ext-artifacts/**',
    '!src/icons/**',
    '!src/**/*.min.js',
    '!src/**/*.config.js',
    '!src/**/*.spec.js',
    '!src/**/*.test.js',
    // Exclude build artifacts and temporary files
    '!src/dist/**',
    '!src/build/**',
    '!src/.tmp/**'
  ],

  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 90,
      statements: 90
    },
    './src/background/': {
      branches: 85,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './src/contentScript/': {
      branches: 85,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './src/shared/': {
      branches: 90,
      functions: 90,
      lines: 95,
      statements: 95
    },
    './src/popup/': {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './src/options/': {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },

  coverageReporters: [
    'text',
    'text-summary', 
    'lcov',
    'html',
    'json',
    'json-summary',
    'cobertura'
  ],
  coverageDirectory: 'coverage',
  
  // Enhanced coverage options
  collectCoverage: false, // Only collect when explicitly requested
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/.jest-cache/',
    '/dist/',
    '/build/',
    '/web-ext-artifacts/',
    '\\.min\\.js$',
    'test-utils',
    '__tests__',
    'fixtures'
  ],

  // Performance and behavior configuration
  testTimeout: 10000,
  maxWorkers: '75%',
  maxConcurrency: 12,
  clearMocks: true,
  restoreMocks: true,
  resetModules: false,
  cache: true,
  cacheDirectory: '.jest-cache',
  bail: 0,
  verbose: false,
  detectOpenHandles: false,
  forceExit: true,
  passWithNoTests: true,
  errorOnDeprecated: false,

  // Reporters configuration
  reporters: [
    'default'
  ],

  // Global test configuration
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.CI': process.env.CI || 'false'
  },

  // Test result processor for custom analysis
  testResultsProcessor: '<rootDir>/tests/utils/results-processor.js',

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/coverage/',
    '<rootDir>/node_modules/',
    '<rootDir>/.jest-cache/',
    '<rootDir>/dist/',
    '<rootDir>/src/web-ext-artifacts/'
  ],

  // Notification configuration (for local development)
  notify: false,
  notifyMode: 'failure-change',

  // Babel configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
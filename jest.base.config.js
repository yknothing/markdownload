/**
 * Jest Base Configuration - Single Source of Truth
 * 
 * This file serves as the unified configuration base for all Jest testing scenarios.
 * It eliminates configuration duplication between jest.config.js and tests/run-tests.js
 * 
 * Design principles:
 * - Minimal jsdom configuration for security and performance
 * - Optimized exit strategy for development vs CI
 * - Standardized module mapping and coverage settings
 */

const path = require('path');

module.exports = {
  // Test environment configuration with minimal jsdom setup
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
    pretendToBeVisual: true,
    // Security optimization: disable dangerous script execution by default
    // Only enable in specific test suites that require it
    // Note: Removed incompatible runScripts and resources settings for jsdom compatibility
    // runScripts: 'outside-only',
    // resources: process.env.JEST_ALLOW_EXTERNAL_RESOURCES === 'true' ? 'usable' : 'none'
  },

  // Pre-setup files for early global initialization
  setupFiles: ['<rootDir>/tests/setup.pre.js'],
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/mocks/browserMocks.js',
    '<rootDir>/tests/mocks/turndownServiceMocks.js'
  ],

  // Module name mapping for clean imports
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

  // Coverage configuration - unified source of truth
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

  // Coverage thresholds - maintain existing standards
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

  // Coverage reporters
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
  passWithNoTests: true,
  errorOnDeprecated: false,

  // Exit strategy - optimized for development vs CI
  // Development: enable leak detection, disable force exit
  // CI: maintain force exit as fallback
  detectOpenHandles: process.env.NODE_ENV !== 'test' || process.env.DEBUG === 'true',
  forceExit: process.env.CI === 'true',

  // Note: Environment variables are now injected via process.env rather than globals
  // NODE_ENV=test is set automatically by Jest
  // CI environment variable is available via process.env.CI

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
  },

  // Test environment modes for different scenarios
  projects: undefined // Will be configured by specific runners if needed
};
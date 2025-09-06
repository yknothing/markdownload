/**
 * Jest Configuration - Main Entry Point
 * 
 * This configuration extends the base configuration and adds environment-specific settings.
 * It serves as the primary configuration for standard Jest runs via npm test or direct jest commands.
 * 
 * Key changes in Phase 1:
 * - Inherits from jest.base.config.js (Single Source of Truth)
 * - Uses custom Reporter instead of deprecated testResultsProcessor
 * - Optimized jsdom strategy for security
 * - Improved exit strategy for development
 */

const baseConfig = require('./jest.base.config.js');
const path = require('path');

module.exports = {
  // Inherit all base configuration
  ...baseConfig,

  // Override specific settings for main Jest runs
  collectCoverage: false, // Only collect when explicitly requested
  
  // Use custom Reporter instead of deprecated testResultsProcessor
  reporters: [
    'default',
    ['<rootDir>/tests/utils/custom-reporter.js', {}]
  ],

  // Test environment options - optimized for security
  testEnvironmentOptions: {
    ...baseConfig.testEnvironmentOptions,
    // Special cases that need dangerous script execution can override this in specific test files
    // using docblock: @jest-environment-options {"runScripts": "dangerously"}
    // Note: Removed incompatible runScripts and resources settings for jsdom compatibility
    // runScripts: 'outside-only',
    // resources: process.env.JEST_ALLOW_EXTERNAL_RESOURCES === 'true' ? 'usable' : 'none'
  }
};
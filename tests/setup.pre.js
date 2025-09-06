/**
 * Jest Pre-Setup - Early Global Initialization
 * 
 * This file runs before all other setup to establish critical globals
 * that prevent "early evaluation → global not ready" execution sequence issues.
 * 
 * Key responsibilities:
 * - Initialize jest-webextension-mock early
 * - Establish Service Worker environment globals
 * - Provide minimal polyfills for core APIs
 */

// Initialize jest-webextension-mock as early as possible
require('jest-webextension-mock');

// Service Worker environment globals - must be available before any module loading
global.self = global.self || global;

// Minimal importScripts polyfill to prevent early evaluation errors
if (typeof global.importScripts !== 'function') {
  global.importScripts = function() {
    // Minimal no-op implementation for testing
    // Real importScripts behavior will be mocked in specific tests if needed
  };
}

// Establish minimal browser environment markers
global.IS_TEST_ENVIRONMENT = true;
global.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

/**
 * Direct unit tests for ErrorHandler functionality
 * Tests module functions without complex environment setup
 */

// Mock the Service Worker environment
global.self = {
  addEventListener: jest.fn()
};

// Load the module directly
require('../../../src/background/core/error-handling.js');

describe('ErrorHandler Module - Direct', () => {

  test('ErrorHandler should be available globally', () => {
    expect(global.self.ErrorHandler).toBeDefined();
    expect(typeof global.self.ErrorHandler).toBe('object');
  });

  test('should have all required methods', () => {
    const eh = global.self.ErrorHandler;

    expect(typeof eh.logError).toBe('function');
    expect(typeof eh.getStats).toBe('function');
    expect(typeof eh.clearLog).toBe('function');
    expect(typeof eh.exportLog).toBe('function');
    expect(typeof eh.getLog).toBe('function');
  });

  test('should have error constants', () => {
    const eh = global.self.ErrorHandler;

    expect(eh.LEVELS).toBeDefined();
    expect(eh.CATEGORIES).toBeDefined();

    expect(eh.LEVELS.ERROR).toBe('error');
    expect(eh.LEVELS.DEBUG).toBe('debug');
    expect(eh.LEVELS.INFO).toBe('info');
    expect(eh.LEVELS.WARN).toBe('warn');
    expect(eh.LEVELS.CRITICAL).toBe('critical');

    expect(eh.CATEGORIES.NETWORK).toBe('network');
    expect(eh.CATEGORIES.DOM).toBe('dom');
    expect(eh.CATEGORIES.TURNDOWN).toBe('turndown');
    expect(eh.CATEGORIES.DOWNLOAD).toBe('download');
  });

  test('logError should return error entry', () => {
    const eh = global.self.ErrorHandler;
    const testError = new Error('Test error message');

    const result = eh.logError(testError, { operation: 'test' }, eh.CATEGORIES.NETWORK, eh.LEVELS.ERROR);

    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('level', eh.LEVELS.ERROR);
    expect(result).toHaveProperty('category', eh.CATEGORIES.NETWORK);
    expect(result).toHaveProperty('message', 'Test error message');
    expect(result).toHaveProperty('context');
    expect(result.context.operation).toBe('test');
  });

  test('should handle string errors', () => {
    const eh = global.self.ErrorHandler;
    const stringError = 'String error message';

    const result = eh.logError(stringError);

    expect(result.message).toBe('String error message');
    expect(result.name).toBe('UnknownError');
    expect(result.level).toBe(eh.LEVELS.ERROR);
    expect(result.category).toBe(eh.CATEGORIES.UNKNOWN);
  });

  test('getStats should return statistics', () => {
    const eh = global.self.ErrorHandler;

    // Clear any existing errors first
    eh.clearLog();

    // Initially should have no errors
    let stats = eh.getStats();
    expect(stats.total).toBe(0);

    // Log some errors
    eh.logError(new Error('Error 1'), {}, eh.CATEGORIES.NETWORK);
    eh.logError(new Error('Error 2'), {}, eh.CATEGORIES.DOM);
    eh.logError(new Error('Error 3'), {}, eh.CATEGORIES.NETWORK);

    // Check updated stats
    stats = eh.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byCategory[eh.CATEGORIES.NETWORK]).toBe(2);
    expect(stats.byCategory[eh.CATEGORIES.DOM]).toBe(1);
    expect(stats.recent).toHaveLength(3);
  });

  test('clearLog should reset error log', () => {
    const eh = global.self.ErrorHandler;

    // Log some errors
    eh.logError(new Error('Test error 1'));
    eh.logError(new Error('Test error 2'));

    expect(eh.getLog().length).toBeGreaterThan(0);

    // Clear log
    eh.clearLog();

    expect(eh.getLog().length).toBe(0);
  });

  test('exportLog should return valid JSON', () => {
    const eh = global.self.ErrorHandler;

    eh.clearLog();
    eh.logError(new Error('Export test error'));

    const exported = eh.exportLog();
    expect(typeof exported).toBe('string');

    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toHaveProperty('message', 'Export test error');
  });

  test('getLog should return copy, not reference', () => {
    const eh = global.self.ErrorHandler;

    eh.clearLog();
    eh.logError(new Error('Test error'));

    const log1 = eh.getLog();
    const log2 = eh.getLog();

    expect(log1).not.toBe(log2); // Different references
    expect(log1).toEqual(log2); // Same content
  });

  test('specialized error handlers should work', () => {
    const eh = global.self.ErrorHandler;

    // Test network error handler
    const networkResult = eh.handleNetworkError(
      new Error('Network failure'),
      'https://api.example.com',
      'fetch-data'
    );

    expect(networkResult.category).toBe(eh.CATEGORIES.NETWORK);
    expect(networkResult.context.url).toBe('https://api.example.com');
    expect(networkResult.context.operation).toBe('fetch-data');

    // Test DOM error handler
    const domResult = eh.handleDOMError(
      new Error('DOM manipulation failed'),
      'parse-html'
    );

    expect(domResult.category).toBe(eh.CATEGORIES.DOM);
    expect(domResult.context.operation).toBe('parse-html');

    // Test Turndown error handler
    const turndownResult = eh.handleTurndownError(
      new Error('Conversion failed'),
      '<p>test</p>',
      'html-to-markdown'
    );

    expect(turndownResult.category).toBe(eh.CATEGORIES.TURNDOWN);
    expect(turndownResult.context.contentLength).toBe(11); // '<p>test</p>'.length
    expect(turndownResult.context.operation).toBe('html-to-markdown');
  });
});

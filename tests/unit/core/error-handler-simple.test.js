/**
 * Simplified unit tests for ErrorHandler module
 * Tests basic functionality without complex mocking
 */

describe('ErrorHandler Module - Simplified', () => {
  let originalSelf;

  beforeEach(() => {
    originalSelf = global.self;
    jest.resetModules();
  });

  afterEach(() => {
    global.self = originalSelf;
  });

  test('should load module successfully', () => {
    // Mock self for the module
    const mockSelf = { addEventListener: jest.fn() };
    global.self = mockSelf;

    // Also set as a global for the module to access
    global.window = {};
    global.navigator = {};

    // Load module
    require('../../../src/background/core/error-handling.js');

    expect(mockSelf.ErrorHandler).toBeDefined();
    expect(typeof mockSelf.ErrorHandler.logError).toBe('function');
    expect(typeof mockSelf.ErrorHandler.getStats).toBe('function');
  });

  test('should handle error logging', () => {
    const mockSelf = { addEventListener: jest.fn() };
    global.self = mockSelf;

    require('../../../src/background/core/error-handling.js');

    const errorHandler = mockSelf.ErrorHandler;
    const testError = new Error('Test error');

    const result = errorHandler.logError(testError);

    expect(result).toHaveProperty('message', 'Test error');
    expect(result).toHaveProperty('timestamp');
    expect(result.level).toBeDefined();
    expect(result.category).toBeDefined();
  });

  test('should provide error constants', () => {
    const mockSelf = { addEventListener: jest.fn() };
    global.self = mockSelf;

    require('../../../src/background/core/error-handling.js');

    const errorHandler = mockSelf.ErrorHandler;

    expect(errorHandler.LEVELS).toBeDefined();
    expect(errorHandler.CATEGORIES).toBeDefined();
    expect(errorHandler.LEVELS.ERROR).toBe('error');
    expect(errorHandler.CATEGORIES.NETWORK).toBe('network');
  });

  test('should manage error statistics', () => {
    const mockSelf = { addEventListener: jest.fn() };
    global.self = mockSelf;

    require('../../../src/background/core/error-handling.js');

    const errorHandler = mockSelf.ErrorHandler;

    // Initially should have no errors
    const initialStats = errorHandler.getStats();
    expect(initialStats.total).toBe(0);

    // Log an error
    errorHandler.logError(new Error('Test error'));

    // Should now have one error
    const updatedStats = errorHandler.getStats();
    expect(updatedStats.total).toBe(1);
  });

  test('should export error log', () => {
    const mockSelf = { addEventListener: jest.fn() };
    global.self = mockSelf;

    require('../../../src/background/core/error-handling.js');

    const errorHandler = mockSelf.ErrorHandler;

    errorHandler.logError(new Error('Export test'));

    const exportedLog = errorHandler.exportLog();
    expect(typeof exportedLog).toBe('string');

    // Should be valid JSON
    const parsed = JSON.parse(exportedLog);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});

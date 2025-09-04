/**
 * Unit tests for ErrorHandler module
 * Tests error logging, categorization, and recovery mechanisms
 */

describe('ErrorHandler Module', () => {
  let mockSelf;
  let originalSelf;

  beforeEach(() => {
    // Save original global self
    originalSelf = global.self;

    // Create mock self with minimal Service Worker API
    mockSelf = {
      addEventListener: jest.fn(),
      ErrorHandler: null
    };

    // Set up global self
    global.self = mockSelf;

    // Reset modules to ensure clean state
    jest.resetModules();

    // Load the module - this will set mockSelf.ErrorHandler
    require('../../../src/background/core/error-handling.js');
  });

  afterEach(() => {
    // Restore original global self
    global.self = originalSelf;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize error handler and set up event listeners', () => {
      expect(mockSelf.ErrorHandler).toBeDefined();
      expect(mockSelf.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSelf.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    test('should export correct interface', () => {
      const errorHandler = mockSelf.ErrorHandler;

      expect(errorHandler).toHaveProperty('logError');
      expect(errorHandler).toHaveProperty('handleServiceWorkerError');
      expect(errorHandler).toHaveProperty('handleNetworkError');
      expect(errorHandler).toHaveProperty('handleDOMError');
      expect(errorHandler).toHaveProperty('handleTurndownError');
      expect(errorHandler).toHaveProperty('handleDownloadError');
      expect(errorHandler).toHaveProperty('LEVELS');
      expect(errorHandler).toHaveProperty('CATEGORIES');
      expect(errorHandler).toHaveProperty('getStats');
      expect(errorHandler).toHaveProperty('clearLog');
      expect(errorHandler).toHaveProperty('exportLog');
    });
  });

  describe('Error Logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      consoleSpy.mockClear();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log error with correct structure', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Test error');
      const context = { operation: 'test', userId: 123 };
      const category = errorHandler.CATEGORIES.NETWORK;
      const level = errorHandler.LEVELS.ERROR;

      const result = errorHandler.logError(testError, context, category, level);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('level', level);
      expect(result).toHaveProperty('category', category);
      expect(result).toHaveProperty('message', 'Test error');
      expect(result).toHaveProperty('stack');
      expect(result).toHaveProperty('context', context);
    });

    test('should handle non-Error objects', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const errorString = 'String error';

      const result = errorHandler.logError(errorString);

      expect(result.message).toBe('String error');
      expect(result.name).toBe('UnknownError');
    });

    test('should use default values for optional parameters', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Test error');

      const result = errorHandler.logError(testError);

      expect(result.level).toBe(errorHandler.LEVELS.ERROR);
      expect(result.category).toBe(errorHandler.CATEGORIES.UNKNOWN);
      expect(result.context).toEqual({});
    });

    test('should limit error log size', () => {
      const errorHandler = mockSelf.ErrorHandler;

      // Log more errors than the limit (100)
      for (let i = 0; i < 110; i++) {
        errorHandler.logError(new Error(`Error ${i}`));
      }

      const log = errorHandler.getLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Specialized Error Handlers', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      consoleSpy.mockClear();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('handleNetworkError should log with correct category', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Network failure');
      const url = 'https://example.com/api';
      const operation = 'api-request';

      const result = errorHandler.handleNetworkError(testError, url, operation);

      expect(result.category).toBe(errorHandler.CATEGORIES.NETWORK);
      expect(result.context.url).toBe(url);
      expect(result.context.operation).toBe(operation);
    });

    test('handleDOMError should log with correct category', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('DOM manipulation failed');
      const operation = 'element-creation';

      const result = errorHandler.handleDOMError(testError, operation);

      expect(result.category).toBe(errorHandler.CATEGORIES.DOM);
      expect(result.context.operation).toBe(operation);
    });

    test('handleTurndownError should log with correct category and content length', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Turndown conversion failed');
      const content = '<p>Test content</p>';
      const operation = 'html-conversion';

      const result = errorHandler.handleTurndownError(testError, content, operation);

      expect(result.category).toBe(errorHandler.CATEGORIES.TURNDOWN);
      expect(result.context.contentLength).toBe(content.length);
      expect(result.context.operation).toBe(operation);
    });

    test('handleDownloadError should log with correct category', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Download failed');
      const filename = 'document.md';
      const operation = 'file-download';

      const result = errorHandler.handleDownloadError(testError, filename, operation);

      expect(result.category).toBe(errorHandler.CATEGORIES.DOWNLOAD);
      expect(result.context.filename).toBe(filename);
      expect(result.context.operation).toBe(operation);
    });
  });

  describe('Statistics and Management', () => {
    test('getStats should return correct statistics', () => {
      const errorHandler = mockSelf.ErrorHandler;

      // Log some test errors
      errorHandler.logError(new Error('Network error'), {}, errorHandler.CATEGORIES.NETWORK);
      errorHandler.logError(new Error('DOM error'), {}, errorHandler.CATEGORIES.DOM);
      errorHandler.logError(new Error('Another network error'), {}, errorHandler.CATEGORIES.NETWORK);

      const stats = errorHandler.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byCategory[errorHandler.CATEGORIES.NETWORK]).toBe(2);
      expect(stats.byCategory[errorHandler.CATEGORIES.DOM]).toBe(1);
      expect(stats.recent).toHaveLength(3);
    });

    test('clearLog should empty the error log', () => {
      const errorHandler = mockSelf.ErrorHandler;

      // Log some errors
      errorHandler.logError(new Error('Test error 1'));
      errorHandler.logError(new Error('Test error 2'));

      expect(errorHandler.getLog().length).toBe(2);

      // Clear log
      errorHandler.clearLog();

      expect(errorHandler.getLog().length).toBe(0);
    });

    test('exportLog should return JSON string', () => {
      const errorHandler = mockSelf.ErrorHandler;

      errorHandler.logError(new Error('Test error'));

      const exported = errorHandler.exportLog();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
      expect(parsed[0]).toHaveProperty('message', 'Test error');
    });

    test('getLog should return copy, not reference', () => {
      const errorHandler = mockSelf.ErrorHandler;

      errorHandler.logError(new Error('Test error'));

      const log1 = errorHandler.getLog();
      const log2 = errorHandler.getLog();

      expect(log1).not.toBe(log2); // Different references
      expect(log1).toEqual(log2); // Same content
    });
  });

  describe('Console Logging', () => {
    test('should log errors with appropriate console methods', () => {
      const errorHandler = mockSelf.ErrorHandler;
      const testError = new Error('Test error');

      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        errorHandler.logError(testError, {}, errorHandler.CATEGORIES.UNKNOWN, errorHandler.LEVELS.DEBUG);
        expect(debugSpy).toHaveBeenCalled();

        errorHandler.logError(testError, {}, errorHandler.CATEGORIES.UNKNOWN, errorHandler.LEVELS.INFO);
        expect(infoSpy).toHaveBeenCalled();

        errorHandler.logError(testError, {}, errorHandler.CATEGORIES.UNKNOWN, errorHandler.LEVELS.WARN);
        expect(warnSpy).toHaveBeenCalled();

        errorHandler.logError(testError, {}, errorHandler.CATEGORIES.UNKNOWN, errorHandler.LEVELS.ERROR);
        expect(errorSpy).toHaveBeenCalled();

        errorHandler.logError(testError, {}, errorHandler.CATEGORIES.UNKNOWN, errorHandler.LEVELS.CRITICAL);
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        debugSpy.mockRestore();
        infoSpy.mockRestore();
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });
  });
});

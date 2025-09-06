/**
 * Service Worker Coverage Boost Tests
 * Targeting uncovered lines to push coverage from 21.6% to ≥30%
 */

describe('Service Worker Coverage Boost', () => {
  let mockSelf, originalSelf, originalImportScripts, originalConsole;
  let mockBrowser, mockChrome;

  beforeEach(() => {
    // Store originals
    originalSelf = global.self;
    originalImportScripts = global.importScripts;
    originalConsole = console;

    // Mock console to capture logs
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    // Mock importScripts to prevent actual script loading
    global.importScripts = jest.fn();

    // Mock browser APIs
    mockBrowser = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        getPlatformInfo: jest.fn().mockResolvedValue({ os: 'mac' })
      },
      downloads: {
        onDeterminingFilename: { addListener: jest.fn() }
      }
    };

    mockChrome = {
      runtime: {
        onMessage: { addListener: jest.fn() },
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() }
      },
      downloads: {
        onDeterminingFilename: { addListener: jest.fn() }
      }
    };

    // Create comprehensive self mock with all required modules
    mockSelf = {
      // Core modules that service worker expects
      ErrorHandler: {
        logError: jest.fn(),
        handleServiceWorkerError: jest.fn().mockResolvedValue(),
        handleDownloadError: jest.fn(),
        CATEGORIES: { INITIALIZATION: 'init', RUNTIME: 'runtime' },
        LEVELS: { CRITICAL: 'critical', ERROR: 'error' }
      },
      SecurityValidator: jest.fn().mockImplementation(() => ({
        validateMessage: jest.fn().mockResolvedValue(true),
        validateRuntimeMessage: jest.fn().mockResolvedValue(true),
        logSecurityViolation: jest.fn(),
        logRuntimeSecurityViolation: jest.fn()
      })),
      ErrorRecoveryManager: jest.fn().mockImplementation(() => ({
        executeWithRecovery: jest.fn().mockImplementation(async (fn) => await fn())
      })),
      AsyncTaskManager: jest.fn().mockImplementation(() => ({
        scheduleTask: jest.fn(),
        getMetrics: jest.fn(() => ({ tasks: 0, completed: 0 }))
      })),
      AsyncDebouncer: jest.fn().mockImplementation(() => ({
        debounce: jest.fn().mockImplementation((fn) => fn)
      })),
      DependencyInjector: {
        register: jest.fn(),
        initializeAll: jest.fn().mockResolvedValue(),
        get: jest.fn(),
        getAvailableModules: jest.fn().mockReturnValue([])
      },
      LifecycleManager: jest.fn().mockImplementation(() => ({
        attach: jest.fn(),
        executeStartupTasks: jest.fn().mockResolvedValue()
      })),
      MessageQueueManager: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(),
        attach: jest.fn(),
        processMessage: jest.fn().mockResolvedValue({ success: true }),
        getQueueMetrics: jest.fn().mockReturnValue({ pending: 0 })
      })),
      DownloadProcessor: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(),
        attach: jest.fn(),
        processDownload: jest.fn().mockResolvedValue()
      })),
      // Runtime event mocking
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      // Browser API mocking
      browser: mockBrowser,
      chrome: mockChrome,
      // Other globals expected by service worker
      TurndownService: jest.fn().mockImplementation(() => ({
        use: jest.fn(),
        addRule: jest.fn(),
        turndown: jest.fn().mockReturnValue('# Test')
      })),
      turndownPluginGfm: { gfm: jest.fn() },
      turndown: jest.fn().mockReturnValue({ markdown: '# Test', imageList: {} }),
      convertArticleToMarkdown: jest.fn().mockResolvedValue({ markdown: '# Test', imageList: {} })
    };

    global.self = mockSelf;
    global.browser = mockBrowser;
    global.chrome = mockChrome;
  });

  afterEach(() => {
    // Restore originals
    global.self = originalSelf;
    global.importScripts = originalImportScripts;
    global.console = originalConsole;
    delete global.browser;
    delete global.chrome;
    
    // Clear module cache to allow fresh requires
    Object.keys(require.cache).forEach(key => {
      if (key.includes('service-worker.js')) {
        delete require.cache[key];
      }
    });
  });

  describe('Service Worker Module Loading and Initialization', () => {
    test('should load service worker and trigger initialization sequence', () => {
      // Mock successful initialization path
      mockSelf.DependencyInjector.getAvailableModules.mockReturnValue([
        'LifecycleManager', 'MessageQueueManager', 'DownloadProcessor'
      ]);

      // Require the service worker module, which should trigger initialization
      require('../../../src/background/service-worker.js');

      // Check that console logs were called (initialization sequence)
      expect(console.log).toHaveBeenCalledWith("🔄 MarkDownload Service Worker: Starting up...");
      
      // Check that importScripts was called for all required modules
      expect(global.importScripts).toHaveBeenCalledWith('../browser-polyfill.min.js');
      expect(global.importScripts).toHaveBeenCalledWith('turndown.js');
      expect(global.importScripts).toHaveBeenCalledWith('turndown-plugin-gfm.js');
    });

    test('should handle initialization errors gracefully', () => {
      // Mock initialization failure
      mockSelf.DependencyInjector.initializeAll.mockRejectedValueOnce(new Error('Init failed'));
      
      // Require the service worker - should not crash
      expect(() => {
        require('../../../src/background/service-worker.js');
      }).not.toThrow();

      // Check that startup log was called
      expect(console.log).toHaveBeenCalledWith("🔄 MarkDownload Service Worker: Starting up...");
    });
  });

  describe('Event Handler Registration', () => {
    test('should register runtime message listeners', () => {
      // Clear previous calls
      mockBrowser.runtime.onMessage.addListener.mockClear();
      mockChrome.runtime.onMessage.addListener.mockClear();

      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should register runtime message listeners
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should register download determination listeners', () => {
      // Clear previous calls
      mockBrowser.downloads.onDeterminingFilename.addListener.mockClear();
      mockChrome.downloads.onDeterminingFilename.addListener.mockClear();

      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should register download listeners
      expect(mockBrowser.downloads.onDeterminingFilename.addListener).toHaveBeenCalled();
    });
  });

  describe('Legacy Function Coverage', () => {
    test('should provide turndown function', () => {
      // Load service worker
      const serviceWorker = require('../../../src/background/service-worker.js');

      expect(serviceWorker.turndown).toBeDefined();
      expect(typeof serviceWorker.turndown).toBe('function');

      // Test the function
      const result = serviceWorker.turndown('<p>Test</p>', {}, { baseURI: 'https://example.com' });
      expect(result).toEqual({ markdown: '# Test', imageList: {} });
    });

    test('should provide convertArticleToMarkdown function', async () => {
      // Load service worker
      const serviceWorker = require('../../../src/background/service-worker.js');

      expect(serviceWorker.convertArticleToMarkdown).toBeDefined();
      expect(typeof serviceWorker.convertArticleToMarkdown).toBe('function');

      // Test the function
      const article = { content: '<p>Test</p>', title: 'Test' };
      const result = await serviceWorker.convertArticleToMarkdown(article, false);
      expect(result).toHaveProperty('markdown');
    });
  });

  describe('Module Registration and Management', () => {
    test('should handle module availability checks', () => {
      // Mock some modules available, some not
      mockSelf.LifecycleManager = jest.fn();
      mockSelf.MessageQueueManager = undefined; // Simulate missing module
      mockSelf.DownloadProcessor = jest.fn();

      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should handle both available and missing modules gracefully
      expect(console.log).toHaveBeenCalledWith("🔄 MarkDownload Service Worker: Starting up...");
    });
  });

  describe('Security and Error Recovery', () => {
    test('should initialize security systems', () => {
      // Mock security modules
      mockSelf.SecurityValidator = jest.fn().mockImplementation(() => ({
        validateMessage: jest.fn(),
        logSecurityViolation: jest.fn()
      }));

      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should initialize security validator
      expect(mockSelf.SecurityValidator).toHaveBeenCalled();
    });

    test('should initialize error recovery systems', () => {
      // Mock error recovery
      mockSelf.ErrorRecoveryManager = jest.fn().mockImplementation(() => ({
        executeWithRecovery: jest.fn()
      }));

      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should initialize error recovery manager
      expect(mockSelf.ErrorRecoveryManager).toHaveBeenCalled();
    });
  });

  describe('Task and Queue Management', () => {
    test('should initialize async task management', () => {
      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should initialize task manager
      expect(mockSelf.AsyncTaskManager).toHaveBeenCalled();
    });

    test('should initialize async debouncer', () => {
      // Load service worker
      require('../../../src/background/service-worker.js');

      // Should initialize debouncer
      expect(mockSelf.AsyncDebouncer).toHaveBeenCalled();
    });
  });
});

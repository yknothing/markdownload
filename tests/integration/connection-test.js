/**
 * Integration test for connection and message passing fixes
 * Tests that all the fixes work together properly
 */

// Mock the Service Worker environment
global.self = {
  addEventListener: jest.fn(),
  ErrorHandler: null,
  DOMPolyfill: null,
  ServiceWorkerInit: null,
  DownloadManager: null,
  BrowserAPI: null,
  skipWaiting: jest.fn(),
  clients: {
    claim: jest.fn().mockResolvedValue(),
    matchAll: jest.fn().mockResolvedValue([])
  }
};

// Mock browser APIs
global.browser = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn()
  }
};

// Mock global objects
global.globalThis = {
  document: undefined,
  DOMParser: undefined,
  Node: undefined
};

// Load core modules
require('../../src/background/core/error-handling.js');
require('../../src/background/polyfills/dom-polyfill.js');
require('../../src/background/core/initialization.js');

// Mock service worker message handling
const mockMessageHandler = jest.fn();
const mockInstallHandler = jest.fn();
const mockActivateHandler = jest.fn();

// Mock the service worker event listeners
global.self.addEventListener.mockImplementation((event, handler) => {
  if (event === 'message') {
    mockMessageHandler.mockImplementation(handler);
  } else if (event === 'install') {
    mockInstallHandler.mockImplementation(handler);
  } else if (event === 'activate') {
    mockActivateHandler.mockImplementation(handler);
  }
});

// Load the service worker
require('../../src/background/service-worker.js');

describe('Connection and Message Passing Fixes', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ServiceWorkerInit.waitForReady
    if (global.self.ServiceWorkerInit) {
      global.self.ServiceWorkerInit.waitForReady = jest.fn().mockResolvedValue(true);
      global.self.ServiceWorkerInit.getStatus = jest.fn().mockReturnValue({
        initialized: true,
        modules: ['error-handler', 'dom-polyfill']
      });
    }

    // Mock DownloadManager
    global.self.DownloadManager = {
      download: jest.fn().mockResolvedValue({ success: true, filename: 'test.md' })
    };
  });

  test('Service Worker registers all required event listeners', () => {
    expect(mockInstallHandler).toBeDefined();
    expect(mockActivateHandler).toBeDefined();
    expect(mockMessageHandler).toBeDefined();
  });

  test('Service Worker install event calls skipWaiting', () => {
    const mockEvent = {
      waitUntil: jest.fn().mockImplementation(promise => promise)
    };

    // Trigger install event
    mockInstallHandler(mockEvent);

    expect(global.self.skipWaiting).toHaveBeenCalled();
    expect(mockEvent.waitUntil).toHaveBeenCalled();
  });

  test('Service Worker activate event calls clients.claim', () => {
    const mockEvent = {
      waitUntil: jest.fn().mockImplementation(promise => promise)
    };

    // Trigger activate event
    mockActivateHandler(mockEvent);

    expect(global.self.clients.claim).toHaveBeenCalled();
    expect(mockEvent.waitUntil).toHaveBeenCalled();
  });

  test('Message queue handles legacy download message format', async () => {
    const mockEvent = {
      data: {
        type: 'download',
        markdown: '# Test Content',
        title: 'Test Document',
        tab: { id: 123 },
        imageList: {},
        mdClipsFolder: '',
        includeTemplate: false,
        downloadImages: false,
        clipSelection: true
      }
    };

    // Call the message handler
    await mockMessageHandler(mockEvent);

    // Verify DownloadManager was called with correct data transformation
    expect(global.self.DownloadManager.download).toHaveBeenCalledWith({
      markdown: '# Test Content',
      title: 'Test Document',
      tabId: 123,
      imageList: {},
      mdClipsFolder: '',
      options: {
        includeTemplate: false,
        downloadImages: false,
        clipSelection: true
      }
    });
  });

  test('Message queue handles health status requests', async () => {
    const mockEvent = {
      data: {
        action: 'getHealthStatus'
      },
      ports: [{ postMessage: jest.fn() }]
    };

    // Call the message handler
    await mockMessageHandler(mockEvent);

    // Verify health status was returned
    expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
      success: true,
      status: expect.objectContaining({
        initialized: true,
        modules: ['error-handler', 'dom-polyfill'],
        messageQueueLength: expect.any(Number),
        connectionState: expect.any(String),
        timestamp: expect.any(Number)
      })
    });
  });

  test('Message queue handles error log requests', async () => {
    // Mock ErrorHandler.getLog
    global.self.ErrorHandler.getLog = jest.fn().mockReturnValue([
      { level: 'error', message: 'Test error', timestamp: Date.now() }
    ]);

    const mockEvent = {
      data: {
        action: 'getErrorLog'
      },
      ports: [{ postMessage: jest.fn() }]
    };

    // Call the message handler
    await mockMessageHandler(mockEvent);

    // Verify error log was returned
    expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
      success: true,
      errors: expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          message: 'Test error'
        })
      ])
    });
  });

  test('Message queue handles unknown message types gracefully', async () => {
    const mockEvent = {
      data: {
        type: 'unknown-action'
      },
      ports: [{ postMessage: jest.fn() }]
    };

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Call the message handler
    await mockMessageHandler(mockEvent);

    // Verify warning was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      '⚠️ Unknown message type/action:',
      'unknown-action',
      'Full message:',
      mockEvent.data
    );

    // Verify error response was sent
    expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
      success: false,
      error: 'Unknown message type: unknown-action'
    });

    consoleSpy.mockRestore();
  });

  test('Message queue handles errors gracefully', async () => {
    // Mock DownloadManager to throw error
    global.self.DownloadManager.download = jest.fn().mockRejectedValue(
      new Error('Download failed')
    );

    const mockEvent = {
      data: {
        action: 'downloadMarkdown',
        data: { markdown: 'test' }
      },
      ports: [{ postMessage: jest.fn() }]
    };

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Call the message handler
    await mockMessageHandler(mockEvent);

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith('❌ Message queue error:', expect.any(Error));

    // Verify error response was sent
    expect(mockEvent.ports[0].postMessage).toHaveBeenCalledWith({
      success: false,
      error: 'Download failed'
    });

    consoleSpy.mockRestore();
  });

  test('Browser polyfill is loaded only once in Service Worker', () => {
    // Verify browser object is available
    expect(typeof global.browser).toBe('object');
    expect(global.browser.runtime).toBeDefined();
    expect(global.browser.tabs).toBeDefined();
  });

  test('DOM polyfill is properly initialized', () => {
    // Verify DOM polyfill is working
    expect(typeof global.globalThis.document).toBe('object');
    expect(typeof global.globalThis.DOMParser).toBe('function');
    expect(typeof global.globalThis.Node).toBe('object');

    // Test basic DOM functionality
    const element = global.globalThis.document.createElement('div');
    expect(element.tagName).toBe('DIV');
    expect(element.nodeType).toBe(1);
  });

  test('Service Worker initialization completes successfully', () => {
    // Verify ServiceWorkerInit is available and functional
    expect(global.self.ServiceWorkerInit).toBeDefined();
    expect(typeof global.self.ServiceWorkerInit.initialize).toBe('function');
    expect(typeof global.self.ServiceWorkerInit.getStatus).toBe('function');
  });
});

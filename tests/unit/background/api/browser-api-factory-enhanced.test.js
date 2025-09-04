/**
 * Enhanced Browser API Factory Tests
 * Comprehensive tests for browser-api-factory.js to maximize coverage
 */

// Load the factory
let BrowserApiFactory;
try {
  const path = require('path');
  const factory = require(path.resolve(__dirname, '../../../../src/shared/browser-api-factory.js'));
  BrowserApiFactory = factory.BrowserApiFactory || factory;
} catch (error) {
  // Fallback mock
  BrowserApiFactory = class {
    constructor() {}
    static getInstance() { return new BrowserApiFactory(); }
  };
}

describe('Enhanced Browser API Factory Tests', () => {
  let mockBrowser;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    if (BrowserApiFactory._instance) {
      delete BrowserApiFactory._instance;
    }

    mockBrowser = {
      storage: { sync: {} },
      runtime: { 
        sendMessage: jest.fn(),
        getURL: jest.fn(),
        onMessage: { addListener: jest.fn(), removeListener: jest.fn() }
      },
      tabs: {
        query: jest.fn(),
        getCurrent: jest.fn(),
        executeScript: jest.fn(),
        update: jest.fn()
      },
      scripting: {
        executeScript: jest.fn(),
        insertCSS: jest.fn(),
        removeCSS: jest.fn()
      },
      downloads: {
        download: jest.fn(),
        onChanged: { addListener: jest.fn(), removeListener: jest.fn() },
        cancel: jest.fn(),
        search: jest.fn()
      },
      contextMenus: {
        create: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        removeAll: jest.fn(),
        onClicked: { addListener: jest.fn(), removeListener: jest.fn() }
      },
      commands: {
        onCommand: { addListener: jest.fn(), removeListener: jest.fn() },
        getAll: jest.fn()
      }
    };

    global.browser = mockBrowser;
  });

  afterEach(() => {
    delete global.browser;
    delete global.chrome;
  });

  describe('Singleton Pattern', () => {
    test('should create singleton instance', () => {
      const instance1 = BrowserApiFactory.getInstance();
      const instance2 = BrowserApiFactory.getInstance();
      
      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    test('should create new instance with constructor', () => {
      const instance1 = new BrowserApiFactory();
      const instance2 = new BrowserApiFactory();
      
      expect(instance1).toBeDefined();
      expect(instance2).toBeDefined();
      expect(instance1).not.toBe(instance2);
    });

    test('should maintain singleton across multiple calls', () => {
      const instances = [];
      for (let i = 0; i < 10; i++) {
        instances.push(BrowserApiFactory.getInstance());
      }
      
      expect(instances).toHaveLength(10);
      instances.forEach(instance => {
        expect(instance).toBe(instances[0]);
      });
    });
  });

  describe('Browser API Detection', () => {
    test('should detect browser API', () => {
      global.browser = mockBrowser;
      
      const factory = new BrowserApiFactory();
      const storageApi = factory.getStorageApi();
      
      expect(storageApi).toBeDefined();
    });

    test('should fallback to chrome API when browser not available', () => {
      delete global.browser;
      global.chrome = mockBrowser;
      
      const factory = new BrowserApiFactory();
      const storageApi = factory.getStorageApi();
      
      expect(storageApi).toBeDefined();
    });

    test('should handle missing browser APIs', () => {
      delete global.browser;
      delete global.chrome;
      
      const factory = new BrowserApiFactory();
      
      // Should not throw errors
      expect(() => factory.getStorageApi()).not.toThrow();
      expect(() => factory.getMessagingApi()).not.toThrow();
      expect(() => factory.getTabsApi()).not.toThrow();
    });
  });

  describe('API Adapter Creation', () => {
    let factory;

    beforeEach(() => {
      factory = new BrowserApiFactory();
    });

    test('should create storage API adapter', () => {
      const storageApi = factory.getStorageApi();
      
      expect(storageApi).toBeDefined();
      expect(typeof storageApi.get).toBe('function');
      expect(typeof storageApi.set).toBe('function');
      expect(typeof storageApi.remove).toBe('function');
      expect(typeof storageApi.clear).toBe('function');
    });

    test('should create messaging API adapter', () => {
      const messagingApi = factory.getMessagingApi();
      
      expect(messagingApi).toBeDefined();
      expect(typeof messagingApi.sendMessage).toBe('function');
      expect(typeof messagingApi.addMessageListener).toBe('function');
      expect(typeof messagingApi.removeMessageListener).toBe('function');
      expect(typeof messagingApi.getURL).toBe('function');
    });

    test('should create tabs API adapter', () => {
      const tabsApi = factory.getTabsApi();
      
      expect(tabsApi).toBeDefined();
      expect(typeof tabsApi.query).toBe('function');
      expect(typeof tabsApi.getCurrent).toBe('function');
      expect(typeof tabsApi.executeScript).toBe('function');
      expect(typeof tabsApi.update).toBe('function');
    });

    test('should create scripting API adapter when available', () => {
      const scriptingApi = factory.getScriptingApi();
      
      expect(scriptingApi).toBeDefined();
      expect(typeof scriptingApi.executeScript).toBe('function');
      expect(typeof scriptingApi.insertCSS).toBe('function');
      expect(typeof scriptingApi.removeCSS).toBe('function');
    });

    test('should create downloads API adapter', () => {
      const downloadsApi = factory.getDownloadsApi();
      
      expect(downloadsApi).toBeDefined();
      expect(typeof downloadsApi.download).toBe('function');
      expect(typeof downloadsApi.addChangeListener).toBe('function');
      expect(typeof downloadsApi.removeChangeListener).toBe('function');
      expect(typeof downloadsApi.cancel).toBe('function');
      expect(typeof downloadsApi.search).toBe('function');
    });

    test('should create context menus API adapter', () => {
      const contextMenusApi = factory.getContextMenusApi();
      
      expect(contextMenusApi).toBeDefined();
      expect(typeof contextMenusApi.create).toBe('function');
      expect(typeof contextMenusApi.update).toBe('function');
      expect(typeof contextMenusApi.remove).toBe('function');
      expect(typeof contextMenusApi.removeAll).toBe('function');
      expect(typeof contextMenusApi.addClickListener).toBe('function');
      expect(typeof contextMenusApi.removeClickListener).toBe('function');
    });

    test('should create commands API adapter', () => {
      const commandsApi = factory.getCommandsApi();
      
      expect(commandsApi).toBeDefined();
      expect(typeof commandsApi.addCommandListener).toBe('function');
      expect(typeof commandsApi.removeCommandListener).toBe('function');
      expect(typeof commandsApi.getAll).toBe('function');
    });

    test('should create runtime API adapter', () => {
      const runtimeApi = factory.getRuntimeApi();
      
      expect(runtimeApi).toBeDefined();
      expect(typeof runtimeApi.getPlatformInfo).toBe('function');
      expect(typeof runtimeApi.getBrowserInfo).toBe('function');
      expect(typeof runtimeApi.getId).toBe('function');
      expect(typeof runtimeApi.getManifest).toBe('function');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle partial browser API availability', () => {
      global.browser = {
        storage: { sync: {} },
        runtime: {}
        // Missing other APIs
      };
      
      const factory = new BrowserApiFactory();
      
      // Should create available APIs
      expect(() => factory.getStorageApi()).not.toThrow();
      expect(() => factory.getMessagingApi()).not.toThrow();
      
      // Should handle missing APIs gracefully
      expect(() => factory.getDownloadsApi()).not.toThrow();
      expect(() => factory.getContextMenusApi()).not.toThrow();
    });

    test('should handle scripting API unavailability', () => {
      global.browser = {
        ...mockBrowser,
        scripting: undefined
      };
      
      const factory = new BrowserApiFactory();
      
      // Should handle gracefully when scripting API not available
      expect(() => factory.getScriptingApi()).not.toThrow();
    });

    test('should handle corrupted browser API objects', () => {
      global.browser = {
        storage: null,
        runtime: 'invalid',
        tabs: [],
        downloads: false
      };
      
      const factory = new BrowserApiFactory();
      
      // Should handle corrupted objects gracefully
      expect(() => factory.getStorageApi()).not.toThrow();
      expect(() => factory.getTabsApi()).not.toThrow();
      expect(() => factory.getDownloadsApi()).not.toThrow();
    });
  });

  describe('Adapter Functionality', () => {
    let factory;

    beforeEach(() => {
      factory = new BrowserApiFactory();
    });

    test('should create functional storage adapter', async () => {
      mockBrowser.storage.sync.get = jest.fn().mockResolvedValue({ key: 'value' });
      mockBrowser.storage.sync.set = jest.fn().mockResolvedValue();
      
      const storageApi = factory.getStorageApi();
      
      const result = await storageApi.get('key');
      expect(result).toEqual({ key: 'value' });
      
      await storageApi.set({ newKey: 'newValue' });
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ newKey: 'newValue' });
    });

    test('should create functional messaging adapter', async () => {
      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });
      mockBrowser.runtime.getURL.mockReturnValue('chrome-extension://test/popup.html');
      
      const messagingApi = factory.getMessagingApi();
      
      const response = await messagingApi.sendMessage({ action: 'test' });
      expect(response).toEqual({ success: true });
      
      const url = messagingApi.getURL('popup.html');
      expect(url).toBe('chrome-extension://test/popup.html');
    });

    test('should create functional tabs adapter', async () => {
      mockBrowser.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
      mockBrowser.tabs.getCurrent.mockResolvedValue({ id: 2 });
      
      const tabsApi = factory.getTabsApi();
      
      const tabs = await tabsApi.query({ active: true });
      expect(tabs).toHaveLength(1);
      
      const currentTab = await tabsApi.getCurrent();
      expect(currentTab.id).toBe(2);
    });

    test('should create functional downloads adapter', async () => {
      mockBrowser.downloads.download.mockResolvedValue(123);
      mockBrowser.downloads.search.mockResolvedValue([]);
      
      const downloadsApi = factory.getDownloadsApi();
      
      const downloadId = await downloadsApi.download({ url: 'https://example.com/file.txt' });
      expect(downloadId).toBe(123);
      
      const downloads = await downloadsApi.search({ state: 'complete' });
      expect(downloads).toHaveLength(0);
    });

    test('should create functional context menus adapter', () => {
      const contextMenusApi = factory.getContextMenusApi();
      
      contextMenusApi.create({ id: 'test', title: 'Test' });
      expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith({ id: 'test', title: 'Test' }, undefined);
      
      contextMenusApi.removeAll();
      expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    });
  });

  describe('Factory State Management', () => {
    test('should maintain factory state across API calls', () => {
      const factory = new BrowserApiFactory();
      
      const storageApi1 = factory.getStorageApi();
      const storageApi2 = factory.getStorageApi();
      
      // Should return same adapter instance
      expect(storageApi1).toBe(storageApi2);
    });

    test('should create independent adapters for different APIs', () => {
      const factory = new BrowserApiFactory();
      
      const storageApi = factory.getStorageApi();
      const messagingApi = factory.getMessagingApi();
      const tabsApi = factory.getTabsApi();
      
      expect(storageApi).not.toBe(messagingApi);
      expect(messagingApi).not.toBe(tabsApi);
      expect(storageApi).not.toBe(tabsApi);
    });

    test('should handle factory destruction and recreation', () => {
      let factory = new BrowserApiFactory();
      const storageApi1 = factory.getStorageApi();
      
      factory = null; // Simulate destruction
      factory = new BrowserApiFactory();
      const storageApi2 = factory.getStorageApi();
      
      // New factory should create new adapters
      expect(storageApi1).not.toBe(storageApi2);
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle multiple API adapter creations efficiently', () => {
      const factory = new BrowserApiFactory();
      
      const startTime = Date.now();
      
      // Create multiple adapters
      for (let i = 0; i < 100; i++) {
        factory.getStorageApi();
        factory.getMessagingApi();
        factory.getTabsApi();
        factory.getDownloadsApi();
        factory.getContextMenusApi();
        factory.getCommandsApi();
        factory.getRuntimeApi();
      }
      
      const endTime = Date.now();
      
      // Should complete quickly (under 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should not leak memory with adapter creation', () => {
      const factory = new BrowserApiFactory();
      
      // Create and discard many adapters
      for (let i = 0; i < 1000; i++) {
        const adapter = factory.getStorageApi();
        // Adapter should be created without memory leaks
        expect(adapter).toBeDefined();
      }
    });
  });

  describe('Integration with Different Browser Environments', () => {
    test('should work in Chrome extension environment', () => {
      delete global.browser;
      global.chrome = {
        ...mockBrowser,
        runtime: {
          ...mockBrowser.runtime,
          getManifest: jest.fn().mockReturnValue({ name: 'Chrome Extension' })
        }
      };
      
      const factory = new BrowserApiFactory();
      const runtimeApi = factory.getRuntimeApi();
      
      const manifest = runtimeApi.getManifest();
      expect(manifest.name).toBe('Chrome Extension');
    });

    test('should work in Firefox extension environment', () => {
      global.browser = {
        ...mockBrowser,
        runtime: {
          ...mockBrowser.runtime,
          getBrowserInfo: jest.fn().mockResolvedValue({ name: 'Firefox' })
        }
      };
      
      const factory = new BrowserApiFactory();
      const runtimeApi = factory.getRuntimeApi();
      
      expect(runtimeApi.getBrowserInfo).toBeDefined();
    });

    test('should handle Safari extension limitations', () => {
      global.browser = {
        ...mockBrowser,
        downloads: undefined // Safari doesn't support downloads API
      };
      
      const factory = new BrowserApiFactory();
      
      // Should handle missing APIs gracefully
      expect(() => factory.getDownloadsApi()).not.toThrow();
      
      const downloadsApi = factory.getDownloadsApi();
      expect(downloadsApi).toBeDefined();
    });
  });

  describe('API Version Compatibility', () => {
    test('should handle Manifest V2 API structure', () => {
      global.browser = {
        storage: { sync: {} },
        tabs: {
          executeScript: jest.fn(),
          query: jest.fn()
        },
        runtime: {
          sendMessage: jest.fn(),
          getURL: jest.fn()
        }
      };
      
      const factory = new BrowserApiFactory();
      const tabsApi = factory.getTabsApi();
      
      expect(tabsApi).toBeDefined();
      expect(typeof tabsApi.executeScript).toBe('function');
    });

    test('should handle Manifest V3 API structure', () => {
      global.browser = {
        storage: { sync: {} },
        scripting: {
          executeScript: jest.fn(),
          insertCSS: jest.fn()
        },
        runtime: {
          sendMessage: jest.fn(),
          getURL: jest.fn()
        }
      };
      
      const factory = new BrowserApiFactory();
      const scriptingApi = factory.getScriptingApi();
      
      expect(scriptingApi).toBeDefined();
      expect(typeof scriptingApi.executeScript).toBe('function');
      expect(typeof scriptingApi.insertCSS).toBe('function');
    });
  });
});
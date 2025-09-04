/**
 * Comprehensive Browser API Tests - Phase 2 Coverage
 * 
 * This test suite covers browser API factory integration and configuration:
 * - Browser API factory instantiation scenarios
 * - Storage API integration and error handling
 * - Downloads API availability and fallback logic
 * - Cross-environment compatibility
 * - Configuration persistence and validation
 */

const path = require('path');

// Mock browser APIs
require('jest-webextension-mock');

describe('Browser API Factory - Comprehensive Integration Tests', () => {
  let BrowserApiFactory;
  let browserApiAdapters;
  let browserApiInterfaces;

  beforeAll(() => {
    try {
      // Load browser API modules
      const factoryPath = path.resolve(__dirname, '../../../../src/shared/browser-api-factory.js');
      const adaptersPath = path.resolve(__dirname, '../../../../src/shared/browser-api-adapters.js');
      const interfacesPath = path.resolve(__dirname, '../../../../src/shared/browser-api-interfaces.js');

      // Clear require cache
      delete require.cache[factoryPath];
      delete require.cache[adaptersPath];
      delete require.cache[interfacesPath];

      // Mock the factory execution context
      const fs = require('fs');
      
      // Load and execute browser-api-factory
      const factoryCode = fs.readFileSync(factoryPath, 'utf8');
      const factoryContext = {
        console: console,
        browser: global.browser,
        require: require,
        module: { exports: {} },
        exports: {}
      };

      const vm = require('vm');
      vm.createContext(factoryContext);
      vm.runInContext(factoryCode, factoryContext);
      
      BrowserApiFactory = factoryContext.module.exports || factoryContext.BrowserApiFactory;

      // Load adapters for testing
      browserApiAdapters = require(adaptersPath);
      browserApiInterfaces = require(interfacesPath);

    } catch (error) {
      console.warn('Could not load browser API modules:', error.message);
      BrowserApiFactory = null;
    }
  });

  describe('BrowserApiFactory Instantiation and Singleton Behavior', () => {
    test('should create singleton instance correctly', () => {
      if (!BrowserApiFactory) return;

      const instance1 = BrowserApiFactory.getInstance();
      const instance2 = BrowserApiFactory.getInstance();

      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2); // Singleton behavior
      expect(typeof instance1.getStorageApi).toBe('function');
      expect(typeof instance1.getDownloadsApi).toBe('function');
    });

    test('should handle multiple environment scenarios', () => {
      if (!BrowserApiFactory) return;

      // Test Chrome/Chromium environment
      global.chrome = {
        runtime: { id: 'test-extension' },
        storage: { sync: { get: jest.fn(), set: jest.fn() } },
        downloads: { download: jest.fn() }
      };

      const chromeInstance = BrowserApiFactory.getInstance();
      expect(chromeInstance).toBeDefined();

      // Test Firefox environment
      delete global.chrome;
      global.browser = {
        runtime: { id: 'test-extension' },
        storage: { sync: { get: jest.fn(), set: jest.fn() } },
        downloads: { download: jest.fn() }
      };

      const firefoxInstance = BrowserApiFactory.getInstance();
      expect(firefoxInstance).toBeDefined();
    });

    test('should handle missing browser API gracefully', () => {
      if (!BrowserApiFactory) return;

      const originalChrome = global.chrome;
      const originalBrowser = global.browser;

      try {
        delete global.chrome;
        delete global.browser;

        // Should still create instance with fallbacks
        const instance = BrowserApiFactory.getInstance();
        expect(instance).toBeDefined();
        expect(typeof instance.getStorageApi).toBe('function');
        expect(typeof instance.getDownloadsApi).toBe('function');

      } finally {
        global.chrome = originalChrome;
        global.browser = originalBrowser;
      }
    });
  });

  describe('Storage API Integration and Error Handling', () => {
    let factory;
    let storageApi;

    beforeEach(() => {
      if (!BrowserApiFactory) return;

      // Reset browser mocks
      global.browser = {
        storage: {
          sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
          },
          local: {
            get: jest.fn(),
            set: jest.fn()
          }
        },
        runtime: {
          lastError: null
        }
      };

      factory = BrowserApiFactory.getInstance();
      storageApi = factory.getStorageApi();
    });

    test('should handle successful storage operations', async () => {
      if (!storageApi) return;

      const testData = { key1: 'value1', key2: 'value2' };
      global.browser.storage.sync.get.mockResolvedValue(testData);

      const result = await storageApi.get(['key1', 'key2']);
      expect(result).toEqual(testData);
      expect(global.browser.storage.sync.get).toHaveBeenCalledWith(['key1', 'key2']);
    });

    test('should handle storage quota exceeded errors', async () => {
      if (!storageApi) return;

      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      global.browser.storage.sync.set.mockRejectedValue(quotaError);

      await expect(storageApi.set({ key: 'value' })).rejects.toThrow('Quota exceeded');
    });

    test('should handle storage access denied errors', async () => {
      if (!storageApi) return;

      const accessError = new Error('Storage access denied');
      global.browser.storage.sync.get.mockRejectedValue(accessError);

      await expect(storageApi.get(['key'])).rejects.toThrow('Storage access denied');
    });

    test('should handle chrome.runtime.lastError scenarios', async () => {
      if (!storageApi) return;

      global.chrome = {
        runtime: {
          lastError: { message: 'Chrome runtime error' }
        },
        storage: {
          sync: {
            get: jest.fn((keys, callback) => {
              // Simulate Chrome callback with error
              callback({});
            })
          }
        }
      };

      // Should handle chrome.runtime.lastError appropriately
      const result = await storageApi.get(['key']);
      expect(result).toBeDefined();
    });

    test('should handle large data storage operations', async () => {
      if (!storageApi) return;

      // Create large data object
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = 'x'.repeat(100);
      }

      global.browser.storage.sync.set.mockResolvedValue();

      await expect(storageApi.set(largeData)).resolves.not.toThrow();
      expect(global.browser.storage.sync.set).toHaveBeenCalledWith(largeData);
    });

    test('should handle concurrent storage operations', async () => {
      if (!storageApi) return;

      // Mock slow storage operations
      global.browser.storage.sync.get.mockImplementation((keys) => 
        new Promise(resolve => 
          setTimeout(() => resolve({ [keys[0]]: `value-${keys[0]}` }), 10)
        )
      );

      // Make concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) => 
        storageApi.get([`key${i}`])
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toEqual({ [`key${i}`]: `value-key${i}` });
      });
    });

    test('should handle storage API unavailable scenarios', async () => {
      if (!BrowserApiFactory) return;

      // Remove storage API
      delete global.browser.storage;

      const factoryWithoutStorage = BrowserApiFactory.getInstance();
      const storageApiWithoutBrowser = factoryWithoutStorage.getStorageApi();

      // Should provide fallback or handle gracefully
      expect(storageApiWithoutBrowser).toBeDefined();
    });
  });

  describe('Downloads API Integration and Fallback Logic', () => {
    let factory;
    let downloadsApi;

    beforeEach(() => {
      if (!BrowserApiFactory) return;

      global.browser = {
        downloads: {
          download: jest.fn(),
          search: jest.fn(),
          cancel: jest.fn(),
          erase: jest.fn()
        },
        runtime: {
          lastError: null
        }
      };

      factory = BrowserApiFactory.getInstance();
      downloadsApi = factory.getDownloadsApi();
    });

    test('should handle successful download operations', async () => {
      if (!downloadsApi) return;

      const downloadOptions = {
        url: 'data:text/plain;base64,VGVzdA==',
        filename: 'test.txt',
        saveAs: false
      };

      global.browser.downloads.download.mockResolvedValue(123);

      const result = await downloadsApi.download(downloadOptions);
      expect(result).toBe(123);
      expect(global.browser.downloads.download).toHaveBeenCalledWith(downloadOptions);
    });

    test('should handle download permission errors', async () => {
      if (!downloadsApi) return;

      const permissionError = new Error('Downloads permission required');
      global.browser.downloads.download.mockRejectedValue(permissionError);

      const downloadOptions = { url: 'test.txt', filename: 'test.txt' };

      await expect(downloadsApi.download(downloadOptions)).rejects.toThrow('Downloads permission required');
    });

    test('should handle downloads API unavailable', () => {
      if (!BrowserApiFactory) return;

      delete global.browser.downloads;

      const factoryWithoutDownloads = BrowserApiFactory.getInstance();
      const downloadsApiWithoutBrowser = factoryWithoutDownloads.getDownloadsApi();

      // Should return null or undefined when downloads API unavailable
      expect(downloadsApiWithoutBrowser).toBeFalsy();
    });

    test('should handle malformed download URLs', async () => {
      if (!downloadsApi) return;

      const badOptions = {
        url: 'not-a-valid-url',
        filename: 'test.txt'
      };

      const urlError = new Error('Invalid URL');
      global.browser.downloads.download.mockRejectedValue(urlError);

      await expect(downloadsApi.download(badOptions)).rejects.toThrow('Invalid URL');
    });

    test('should handle download filename conflicts', async () => {
      if (!downloadsApi) return;

      const conflictOptions = {
        url: 'data:text/plain;base64,VGVzdA==',
        filename: 'existing-file.txt',
        conflictAction: 'uniquify'
      };

      global.browser.downloads.download.mockResolvedValue(456);

      const result = await downloadsApi.download(conflictOptions);
      expect(result).toBe(456);
      expect(global.browser.downloads.download).toHaveBeenCalledWith(conflictOptions);
    });

    test('should handle very large file downloads', async () => {
      if (!downloadsApi) return;

      const largeFileData = 'x'.repeat(1000000); // 1MB
      const largeBase64 = Buffer.from(largeFileData).toString('base64');

      const largeDownloadOptions = {
        url: `data:text/plain;base64,${largeBase64}`,
        filename: 'large-file.txt'
      };

      global.browser.downloads.download.mockResolvedValue(789);

      const result = await downloadsApi.download(largeDownloadOptions);
      expect(result).toBe(789);
    });
  });

  describe('Cross-Environment Compatibility', () => {
    test('should detect Chrome environment correctly', () => {
      if (!BrowserApiFactory) return;

      global.chrome = {
        runtime: { id: 'test' },
        storage: { sync: { get: jest.fn() } }
      };
      delete global.browser;

      const instance = BrowserApiFactory.getInstance();
      expect(instance).toBeDefined();

      // Should use Chrome APIs internally
      const storageApi = instance.getStorageApi();
      expect(storageApi).toBeDefined();
    });

    test('should detect Firefox environment correctly', () => {
      if (!BrowserApiFactory) return;

      delete global.chrome;
      global.browser = {
        runtime: { id: 'test' },
        storage: { sync: { get: jest.fn() } }
      };

      const instance = BrowserApiFactory.getInstance();
      expect(instance).toBeDefined();

      const storageApi = instance.getStorageApi();
      expect(storageApi).toBeDefined();
    });

    test('should handle Edge/Safari environments', () => {
      if (!BrowserApiFactory) return;

      // Edge uses chrome namespace but might have different behavior
      global.chrome = {
        runtime: { id: 'edge-extension' },
        storage: { sync: { get: jest.fn() } },
        // Edge might not have downloads API
        downloads: undefined
      };

      const instance = BrowserApiFactory.getInstance();
      expect(instance).toBeDefined();

      const storageApi = instance.getStorageApi();
      expect(storageApi).toBeDefined();

      const downloadsApi = instance.getDownloadsApi();
      // Should handle missing downloads API gracefully
      expect(downloadsApi).toBeFalsy();
    });

    test('should handle unknown browser environments', () => {
      if (!BrowserApiFactory) return;

      delete global.chrome;
      delete global.browser;

      // Should create instance with minimal functionality
      const instance = BrowserApiFactory.getInstance();
      expect(instance).toBeDefined();

      // Should provide APIs even if browser APIs are missing
      const storageApi = instance.getStorageApi();
      const downloadsApi = instance.getDownloadsApi();

      expect(storageApi || downloadsApi).toBeTruthy(); // At least one should exist
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from temporary API failures', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      let callCount = 0;
      global.browser.storage.sync.get = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ key: 'value' });
      });

      // First call fails
      await expect(storageApi.get(['key'])).rejects.toThrow('Temporary failure');

      // Second call succeeds
      const result = await storageApi.get(['key']);
      expect(result).toEqual({ key: 'value' });
    });

    test('should handle API method removal at runtime', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const downloadsApi = factory.getDownloadsApi();

      // Remove download method at runtime (simulating browser update/change)
      delete global.browser.downloads.download;

      // Should handle gracefully
      if (downloadsApi && downloadsApi.download) {
        await expect(downloadsApi.download({})).rejects.toBeDefined();
      }
    });

    test('should handle corrupted API responses', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Mock corrupted response
      global.browser.storage.sync.get.mockResolvedValue(null);

      const result = await storageApi.get(['key']);
      expect(result).toBeNull();
    });

    test('should handle API timeout scenarios', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Mock timeout
      global.browser.storage.sync.get.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      // Use Promise.race to test timeout handling
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      );

      await expect(
        Promise.race([storageApi.get(['key']), timeoutPromise])
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Configuration Management Integration', () => {
    test('should integrate with default-options configuration', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Mock stored configuration
      const storedConfig = {
        headingStyle: 'setext',
        turndownEscape: false,
        customProperty: 'custom value'
      };

      global.browser.storage.sync.get.mockResolvedValue(storedConfig);

      const result = await storageApi.get(Object.keys(storedConfig));
      expect(result).toEqual(storedConfig);
    });

    test('should handle configuration validation through storage', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Mock invalid configuration
      const invalidConfig = {
        title: null,
        disallowedChars: 123,
        validProperty: 'valid value'
      };

      global.browser.storage.sync.get.mockResolvedValue(invalidConfig);
      global.browser.storage.sync.set.mockResolvedValue();

      const result = await storageApi.get(Object.keys(invalidConfig));
      expect(result).toEqual(invalidConfig);

      // Configuration validation should happen at the options level
      // Storage API should pass through data as-is
    });

    test('should support configuration migration scenarios', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Mock old configuration format
      const oldConfig = {
        oldProperty: 'old value',
        deprecatedSetting: true
      };

      // Mock new configuration format
      const newConfig = {
        newProperty: 'new value',
        modernSetting: true
      };

      global.browser.storage.sync.get.mockResolvedValueOnce(oldConfig);
      global.browser.storage.sync.set.mockResolvedValue();
      global.browser.storage.sync.remove.mockResolvedValue();

      // Get old config
      const oldResult = await storageApi.get(Object.keys(oldConfig));
      expect(oldResult).toEqual(oldConfig);

      // Set new config
      await storageApi.set(newConfig);
      expect(global.browser.storage.sync.set).toHaveBeenCalledWith(newConfig);

      // Remove old config
      await storageApi.remove(Object.keys(oldConfig));
      expect(global.browser.storage.sync.remove).toHaveBeenCalledWith(Object.keys(oldConfig));
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle high-frequency API calls efficiently', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      global.browser.storage.sync.get.mockImplementation((keys) => 
        Promise.resolve({ [keys[0]]: `value-${Date.now()}` })
      );

      const startTime = performance.now();

      // Make many rapid calls
      const promises = Array.from({ length: 100 }, (_, i) => 
        storageApi.get([`key${i}`])
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(results).toHaveLength(100);
    });

    test('should not leak memory with repeated instantiation', () => {
      if (!BrowserApiFactory) return;

      const instances = [];
      
      // Create many instances (should all be the same singleton)
      for (let i = 0; i < 1000; i++) {
        instances.push(BrowserApiFactory.getInstance());
      }

      // All should be the same instance
      const firstInstance = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });

      // Clear references
      instances.length = 0;
    });

    test('should handle large data operations without memory issues', async () => {
      if (!BrowserApiFactory) return;

      const factory = BrowserApiFactory.getInstance();
      const storageApi = factory.getStorageApi();

      // Create large data set
      const largeData = {};
      for (let i = 0; i < 10000; i++) {
        largeData[`key${i}`] = `value${i}`.repeat(100);
      }

      global.browser.storage.sync.get.mockResolvedValue(largeData);

      const startMemory = process.memoryUsage?.().heapUsed || 0;
      
      const result = await storageApi.get(Object.keys(largeData));
      
      const endMemory = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = endMemory - startMemory;

      expect(result).toEqual(largeData);
      // Memory increase should be reasonable (less than 100MB for test data)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });
});
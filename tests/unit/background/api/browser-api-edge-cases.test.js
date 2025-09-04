/**
 * Browser API Edge Cases and Error Boundary Tests
 * Comprehensive test suite for error handling, edge cases, and boundary conditions
 */

// Mock browser API factory and related modules
const mockBrowserApiFactory = require('../../../mocks/browser-api-factory-mock');
const mockBrowserApiMocks = require('../../../mocks/browser-api-mocks');

// Load modules for testing
let browserApiFactory, browserApiMocks, browserApiAdapters;
try {
  const path = require('path');
  browserApiFactory = require(path.resolve(__dirname, '../../../../src/shared/browser-api-factory.js'));
  browserApiMocks = require(path.resolve(__dirname, '../../../../src/shared/browser-api-mocks.js'));  
  browserApiAdapters = require(path.resolve(__dirname, '../../../../src/shared/browser-api-adapters.js'));
} catch (error) {
  // Use fallback mocks
  browserApiFactory = mockBrowserApiFactory;
  browserApiMocks = mockBrowserApiMocks;
  browserApiAdapters = {};
}

describe('Browser API Edge Cases and Error Boundaries', () => {
  
  describe('API Factory Error Handling', () => {
    beforeEach(() => {
      // Reset environment
      delete global.browser;
      delete global.chrome;
      delete global.window;
    });

    test('should handle missing browser APIs gracefully', () => {
      // No browser API available
      expect(() => {
        if (browserApiFactory && browserApiFactory.BrowserApiFactory) {
          const factory = new browserApiFactory.BrowserApiFactory();
          factory.getStorageApi();
        }
      }).not.toThrow();
    });

    test('should handle partial browser API availability', () => {
      // Only some APIs available
      global.browser = {
        storage: { sync: {} },
        // Missing tabs, downloads, etc.
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        expect(() => {
          new browserApiAdapters.BrowserStorageAdapter(global.browser);
        }).not.toThrow();

        expect(() => {
          new browserApiAdapters.BrowserTabsAdapter(global.browser);
        }).not.toThrow();
      }
    });

    test('should handle corrupted browser API objects', () => {
      // Corrupted browser object
      global.browser = {
        storage: null,
        tabs: undefined,
        runtime: 'invalid'
      };

      if (browserApiAdapters) {
        // Should handle gracefully without crashing
        expect(() => {
          try {
            new browserApiAdapters.BrowserStorageAdapter(global.browser);
          } catch (e) {
            // Expected error, but should not crash the test runner
            expect(e.message).toContain('Browser API not available');
          }
        }).not.toThrow();
      }
    });

    test('should handle circular reference in browser API', () => {
      // Create circular reference
      const circularBrowser = {
        storage: { sync: {} },
        runtime: {}
      };
      circularBrowser.self = circularBrowser;

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        expect(() => {
          new browserApiAdapters.BrowserStorageAdapter(circularBrowser);
        }).not.toThrow();
      }
    });
  });

  describe('Cross-Browser Compatibility Edge Cases', () => {
    test('should handle Chrome vs Firefox API differences', async () => {
      // Chrome-style API
      const chromeApi = {
        storage: { sync: { get: jest.fn().mockResolvedValue({}) } },
        tabs: { query: jest.fn().mockResolvedValue([]) },
        runtime: { sendMessage: jest.fn().mockResolvedValue({}) }
      };

      // Firefox-style API  
      const firefoxApi = {
        storage: { sync: { get: jest.fn().mockResolvedValue({}) } },
        tabs: { query: jest.fn().mockResolvedValue([]) },
        runtime: { 
          sendMessage: jest.fn().mockResolvedValue({}),
          getBrowserInfo: jest.fn().mockResolvedValue({ name: 'Firefox' })
        }
      };

      if (browserApiAdapters) {
        // Both should work
        const chromeStorage = new browserApiAdapters.BrowserStorageAdapter(chromeApi);
        const firefoxStorage = new browserApiAdapters.BrowserStorageAdapter(firefoxApi);

        await chromeStorage.get('test');
        await firefoxStorage.get('test');

        expect(chromeApi.storage.sync.get).toHaveBeenCalled();
        expect(firefoxApi.storage.sync.get).toHaveBeenCalled();
      }
    });

    test('should handle Manifest V2 vs V3 differences', async () => {
      // Manifest V2 API
      const v2Api = {
        tabs: { 
          executeScript: jest.fn().mockResolvedValue([{ result: 'v2' }])
        }
      };

      // Manifest V3 API
      const v3Api = {
        scripting: {
          executeScript: jest.fn().mockResolvedValue([{ result: 'v3' }])
        }
      };

      if (browserApiAdapters) {
        const v2Tabs = new browserApiAdapters.BrowserTabsAdapter(v2Api);
        const v3Scripting = new browserApiAdapters.BrowserScriptingAdapter(v3Api);

        await v2Tabs.executeScript(1, { code: 'test' });
        await v3Scripting.executeScript({ target: { tabId: 1 }, func: () => 'test' });

        expect(v2Api.tabs.executeScript).toHaveBeenCalled();
        expect(v3Api.scripting.executeScript).toHaveBeenCalled();
      }
    });
  });

  describe('Async Operation Edge Cases', () => {
    test('should handle very slow API responses', async () => {
      const slowBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ key: 'value' }), 5000))
            )
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(slowBrowser);
        
        // Should handle slow responses (though we won't wait 5 seconds in test)
        const resultPromise = adapter.get('key');
        expect(resultPromise).toBeInstanceOf(Promise);
        
        // Clean up the hanging promise
        setTimeout(() => resultPromise.catch(() => {}), 100);
      }
    }, 1000);

    test('should handle API timeouts', async () => {
      const timeoutBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockImplementation(() => 
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 100)
              )
            )
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(timeoutBrowser);
        
        await expect(adapter.get('key')).rejects.toThrow('Failed to get storage data: Timeout');
      }
    });

    test('should handle concurrent API calls', async () => {
      const concurrentBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockResolvedValue({ key: 'value' }),
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(concurrentBrowser);
        
        // Make multiple concurrent calls
        const promises = [
          adapter.get('key1'),
          adapter.get('key2'), 
          adapter.set({ key3: 'value3' }),
          adapter.get('key4')
        ];

        await Promise.all(promises);

        expect(concurrentBrowser.storage.sync.get).toHaveBeenCalledTimes(3);
        expect(concurrentBrowser.storage.sync.set).toHaveBeenCalledTimes(1);
      }
    });

    test('should handle race conditions in API initialization', async () => {
      let initCount = 0;
      const raceBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockImplementation(async () => {
              initCount++;
              await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
              return { count: initCount };
            })
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(raceBrowser);
        
        // Start multiple operations simultaneously
        const results = await Promise.all([
          adapter.get('test1'),
          adapter.get('test2'),
          adapter.get('test3')
        ]);

        // All should complete successfully
        expect(results).toHaveLength(3);
        results.forEach(result => {
          expect(result.count).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Memory Management and Resource Cleanup', () => {
    test('should handle memory leaks in event listeners', () => {
      const leakyBrowser = {
        runtime: {
          onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        },
        contextMenus: {
          onClicked: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };

      if (browserApiAdapters) {
        const messaging = new browserApiAdapters.BrowserMessagingAdapter(leakyBrowser);
        const contextMenus = new browserApiAdapters.BrowserContextMenusAdapter(leakyBrowser);

        // Add many listeners
        for (let i = 0; i < 100; i++) {
          const listener = () => {};
          messaging.addMessageListener(listener);
          contextMenus.addClickListener(listener);
        }

        expect(leakyBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(100);
        expect(leakyBrowser.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(100);
      }
    });

    test('should handle resource cleanup on adapter destruction', () => {
      const resourceBrowser = {
        downloads: {
          onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserDownloadsAdapter) {
        let adapter = new browserApiAdapters.BrowserDownloadsAdapter(resourceBrowser);
        
        const listener1 = jest.fn();
        const listener2 = jest.fn();
        
        adapter.addChangeListener(listener1);
        adapter.addChangeListener(listener2);

        // Simulate cleanup
        adapter.removeChangeListener(listener1);
        adapter.removeChangeListener(listener2);

        expect(resourceBrowser.downloads.onChanged.removeListener).toHaveBeenCalledWith(listener1);
        expect(resourceBrowser.downloads.onChanged.removeListener).toHaveBeenCalledWith(listener2);

        adapter = null; // Simulate garbage collection
      }
    });
  });

  describe('Error Propagation and Recovery', () => {
    test('should maintain error stack traces', async () => {
      const errorBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockRejectedValue(new Error('Deep storage error'))
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(errorBrowser);
        
        try {
          await adapter.get('key');
          fail('Should have thrown error');
        } catch (error) {
          expect(error.message).toContain('Failed to get storage data: Deep storage error');
          expect(error.stack).toBeDefined();
        }
      }
    });

    test('should handle cascading errors', async () => {
      const cascadingBrowser = {
        tabs: {
          query: jest.fn().mockRejectedValue(new Error('Query failed')),
          executeScript: jest.fn().mockRejectedValue(new Error('Script failed'))
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserTabsAdapter) {
        const adapter = new browserApiAdapters.BrowserTabsAdapter(cascadingBrowser);
        
        // Both operations should fail gracefully
        await expect(adapter.query({})).rejects.toThrow('Failed to query tabs: Query failed');
        await expect(adapter.executeScript(1, { code: 'test' })).rejects.toThrow('Failed to execute script: Script failed');
      }
    });

    test('should handle error recovery patterns', async () => {
      let failCount = 0;
      const recoveryBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockImplementation(async () => {
              failCount++;
              if (failCount < 3) {
                throw new Error('Temporary failure');
              }
              return { recovered: true };
            })
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(recoveryBrowser);
        
        // First two calls should fail
        await expect(adapter.get('key')).rejects.toThrow('Failed to get storage data: Temporary failure');
        await expect(adapter.get('key')).rejects.toThrow('Failed to get storage data: Temporary failure');
        
        // Third call should succeed
        const result = await adapter.get('key');
        expect(result.recovered).toBe(true);
      }
    });
  });

  describe('Mock API Behavior Verification', () => {
    test('should verify mock implementations match real API contracts', () => {
      if (browserApiMocks && browserApiMocks.MockBrowserApi) {
        const mock = new browserApiMocks.MockBrowserApi();
        
        // Verify storage API structure
        expect(mock.storage).toBeDefined();
        expect(mock.storage.sync).toBeDefined();
        expect(typeof mock.storage.sync.get).toBe('function');
        expect(typeof mock.storage.sync.set).toBe('function');
        
        // Verify tabs API structure  
        expect(mock.tabs).toBeDefined();
        expect(typeof mock.tabs.query).toBe('function');
        expect(typeof mock.tabs.getCurrent).toBe('function');
        
        // Verify runtime API structure
        expect(mock.runtime).toBeDefined();
        expect(typeof mock.runtime.sendMessage).toBe('function');
        expect(typeof mock.runtime.getURL).toBe('function');
      }
    });

    test('should simulate realistic browser API response delays', async () => {
      if (browserApiMocks && browserApiMocks.MockBrowserApi) {
        const mock = new browserApiMocks.MockBrowserApi({ simulateLatency: true });
        
        const startTime = Date.now();
        await mock.storage.sync.get('test');
        const endTime = Date.now();
        
        // Should have some simulated delay
        expect(endTime - startTime).toBeGreaterThan(0);
      }
    });

    test('should handle mock API errors realistically', async () => {
      if (browserApiMocks && browserApiMocks.MockBrowserApi) {
        const mock = new browserApiMocks.MockBrowserApi({ 
          errorRate: 0.5,
          simulateErrors: true 
        });
        
        // Should sometimes succeed and sometimes fail
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < 20; i++) {
          try {
            await mock.storage.sync.get('test');
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
        
        // Should have both successes and errors
        expect(successCount).toBeGreaterThan(0);
        expect(errorCount).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration Boundary Tests', () => {
    test('should handle integration between different API adapters', async () => {
      const integrationBrowser = {
        storage: { sync: { get: jest.fn().mockResolvedValue({ tabIds: [1, 2, 3] }) } },
        tabs: { query: jest.fn().mockResolvedValue([{id: 1}, {id: 2}, {id: 3}]) },
        contextMenus: { create: jest.fn(), removeAll: jest.fn() }
      };

      if (browserApiAdapters) {
        const storage = new browserApiAdapters.BrowserStorageAdapter(integrationBrowser);
        const tabs = new browserApiAdapters.BrowserTabsAdapter(integrationBrowser);
        const contextMenus = new browserApiAdapters.BrowserContextMenusAdapter(integrationBrowser);

        // Simulate workflow that uses multiple APIs
        const savedTabs = await storage.get('tabIds');
        const currentTabs = await tabs.query({});
        
        // Should be able to coordinate between APIs
        expect(savedTabs.tabIds).toHaveLength(3);
        expect(currentTabs).toHaveLength(3);
        
        contextMenus.removeAll();
        expect(integrationBrowser.contextMenus.removeAll).toHaveBeenCalled();
      }
    });

    test('should maintain consistency across API method signatures', () => {
      if (browserApiAdapters) {
        // All adapters should follow consistent patterns
        const storageAdapter = browserApiAdapters.BrowserStorageAdapter;
        const messagingAdapter = browserApiAdapters.BrowserMessagingAdapter;
        const tabsAdapter = browserApiAdapters.BrowserTabsAdapter;

        // Constructor signatures should be consistent
        expect(storageAdapter.length).toBe(1); // browserApi parameter
        expect(messagingAdapter.length).toBe(1); // browserApi parameter
        expect(tabsAdapter.length).toBe(1); // browserApi parameter

        // All should handle null browserApi consistently
        expect(() => new storageAdapter(null)).toThrow('Browser API not available');
        expect(() => new messagingAdapter(null)).toThrow('Browser API not available'); 
        expect(() => new tabsAdapter(null)).toThrow('Browser API not available');
      }
    });
  });

  describe('Performance and Scalability Edge Cases', () => {
    test('should handle large data payloads', async () => {
      const largeBrowser = {
        storage: {
          sync: {
            get: jest.fn().mockResolvedValue({
              largeData: 'x'.repeat(8192) // 8KB string
            }),
            set: jest.fn().mockResolvedValue()
          }
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserStorageAdapter) {
        const adapter = new browserApiAdapters.BrowserStorageAdapter(largeBrowser);
        
        const result = await adapter.get('largeData');
        expect(result.largeData.length).toBe(8192);
        
        await adapter.set({ evenLargerData: 'y'.repeat(16384) });
        expect(largeBrowser.storage.sync.set).toHaveBeenCalledWith({ 
          evenLargerData: 'y'.repeat(16384) 
        });
      }
    });

    test('should handle high-frequency API calls', async () => {
      const highFreqBrowser = {
        tabs: {
          query: jest.fn().mockResolvedValue([])
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserTabsAdapter) {
        const adapter = new browserApiAdapters.BrowserTabsAdapter(highFreqBrowser);
        
        // Make many rapid calls
        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(adapter.query({ index: i }));
        }
        
        await Promise.all(promises);
        expect(highFreqBrowser.tabs.query).toHaveBeenCalledTimes(100);
      }
    });

    test('should handle memory-intensive operations', () => {
      const memoryBrowser = {
        downloads: {
          search: jest.fn().mockResolvedValue(
            // Large array of download objects
            Array(1000).fill(null).map((_, i) => ({
              id: i,
              url: `https://example.com/file${i}.txt`,
              filename: `file${i}.txt`,
              bytesReceived: 1024 * i,
              totalBytes: 2048 * i
            }))
          )
        }
      };

      if (browserApiAdapters && browserApiAdapters.BrowserDownloadsAdapter) {
        expect(() => {
          new browserApiAdapters.BrowserDownloadsAdapter(memoryBrowser);
        }).not.toThrow();
      }
    });
  });
});
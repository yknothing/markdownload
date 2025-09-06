/**
 * Focused Browser API Coverage Test
 * Simplified approach to maximize branch coverage for browser-api.js
 */

const path = require('path');

describe('Browser API Focused Coverage', () => {
  let mockSelf;
  let originalGlobal;

  beforeEach(() => {
    // Store original global state
    originalGlobal = {
      browser: global.browser,
      chrome: global.chrome,
      self: global.self
    };

    // Setup mock self
    mockSelf = {
      ErrorHandler: {
        handleServiceWorkerError: jest.fn(),
        handleDownloadError: jest.fn(),
        logError: jest.fn(),
        CATEGORIES: { INITIALIZATION: 'init' },
        LEVELS: { CRITICAL: 'critical' }
      }
    };

    global.self = mockSelf;
    global.console = { 
      log: jest.fn(), 
      error: jest.fn(), 
      warn: jest.fn() 
    };

    // Clear module cache
    const modulePath = path.resolve(__dirname, '../../../../src/background/api/browser-api.js');
    delete require.cache[modulePath];
  });

  afterEach(() => {
    // Restore original globals
    global.browser = originalGlobal.browser;
    global.chrome = originalGlobal.chrome;
    global.self = originalGlobal.self;
    
    jest.clearAllMocks();
    
    // Clear module cache again
    const modulePath = path.resolve(__dirname, '../../../../src/background/api/browser-api.js');
    delete require.cache[modulePath];
  });

  describe('Initialization Branches', () => {
    test('should initialize with full browser API available', () => {
      global.browser = {
        downloads: { download: jest.fn() },
        scripting: { executeScript: jest.fn() },
        tabs: { query: jest.fn() },
        storage: { sync: { get: jest.fn() } },
        runtime: { onMessage: { addListener: jest.fn() } }
      };

      require('../../../../src/background/api/browser-api.js');
      
      const BrowserAPI = global.self.BrowserAPI;
      expect(BrowserAPI).toBeDefined();
      expect(BrowserAPI.isAvailable('downloads')).toBe(true);
      expect(BrowserAPI.isAvailable('scripting')).toBe(true);
      expect(BrowserAPI.isAvailable('tabs')).toBe(true);
      expect(BrowserAPI.isAvailable('storage')).toBe(true);
      expect(BrowserAPI.isAvailable('runtime')).toBe(true);
    });

    test('should handle browser undefined at initialization', () => {
      global.browser = undefined;

      require('../../../../src/background/api/browser-api.js');
      
      const BrowserAPI = global.self.BrowserAPI;
      expect(BrowserAPI).toBeDefined();
      expect(BrowserAPI.isAvailable('downloads')).toBe(false);
    });

    test('should apply Chrome scripting polyfill', () => {
      global.browser = {}; // No scripting API
      global.chrome = {
        scripting: { executeScript: jest.fn() }
      };

      require('../../../../src/background/api/browser-api.js');
      
      const BrowserAPI = global.self.BrowserAPI;
      expect(BrowserAPI.isAvailable('scripting')).toBe(true);
      expect(global.browser.scripting).toBe(global.chrome.scripting);
    });

    test('should handle delayed browser initialization', (done) => {
      global.browser = undefined;

      require('../../../../src/background/api/browser-api.js');
      
      // Simulate browser becoming available
      setTimeout(() => {
        global.browser = {
          downloads: { download: jest.fn() },
          scripting: { executeScript: jest.fn() }
        };
      }, 50);

      // Check after initialization delay
      setTimeout(() => {
        const BrowserAPI = global.self.BrowserAPI;
        expect(BrowserAPI.isAvailable('downloads')).toBe(true);
        done();
      }, 150);
    });

    test('should handle permanent browser unavailability', (done) => {
      global.browser = undefined;

      require('../../../../src/background/api/browser-api.js');
      
      // Check after both initialization attempts
      setTimeout(() => {
        const BrowserAPI = global.self.BrowserAPI;
        expect(BrowserAPI.isAvailable('downloads')).toBe(false);
        
        // Should log error to ErrorHandler
        expect(mockSelf.ErrorHandler.logError).toHaveBeenCalled();
        done();
      }, 250);
    });
  });

  describe('Downloads API Branches', () => {
    beforeEach(() => {
      global.browser = {
        downloads: {
          download: jest.fn(),
          search: jest.fn(),
          onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };
    });

    test('should handle downloadFile success and error paths', async () => {
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Success path
      global.browser.downloads.download.mockResolvedValue('download-123');
      const result = await BrowserAPI.downloadFile({ url: 'test.com/file.pdf' });
      expect(result).toBe('download-123');

      // Error path
      const downloadError = new Error('Download failed');
      global.browser.downloads.download.mockRejectedValue(downloadError);
      
      await expect(BrowserAPI.downloadFile({ url: 'test.com/file.pdf' }))
        .rejects.toThrow('File download failed: Download failed');

      expect(mockSelf.ErrorHandler.handleDownloadError).toHaveBeenCalledWith(
        downloadError, 'unknown', 'downloadFile'
      );
    });

    test('should handle API unavailable branches', async () => {
      delete global.browser.downloads;
      
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      expect(BrowserAPI.isAvailable('downloads')).toBe(false);

      await expect(BrowserAPI.downloadFile({ url: 'test.com' }))
        .rejects.toThrow('Downloads API not available');

      expect(mockSelf.ErrorHandler.handleServiceWorkerError).toHaveBeenCalled();
    });

    test('should handle listener management', () => {
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const testListener = jest.fn();
      
      // Add listener
      const cleanup = BrowserAPI.onDownloadChanged(testListener);
      expect(global.browser.downloads.onChanged.addListener).toHaveBeenCalledWith(testListener);
      
      // Remove listener
      cleanup();
      expect(global.browser.downloads.onChanged.removeListener).toHaveBeenCalledWith(testListener);

      // Test error in remove listener
      global.browser.downloads.onChanged.removeListener.mockImplementation(() => {
        throw new Error('Remove listener failed');
      });
      
      const cleanup2 = BrowserAPI.onDownloadChanged(jest.fn());
      expect(() => cleanup2()).not.toThrow();
    });

    test('should handle downloads API unavailable for listeners', () => {
      delete global.browser.downloads;
      
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const cleanup = BrowserAPI.onDownloadChanged(jest.fn());
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Storage API Branches', () => {
    test('should handle getOptions with merged defaults', async () => {
      global.browser = {
        storage: {
          sync: {
            get: jest.fn().mockResolvedValue({ downloadImages: false })
          }
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const options = await BrowserAPI.getOptions();
      
      expect(options.downloadImages).toBe(false);
      expect(options.downloadMode).toBe('downloadsApi'); // Default value
    });

    test('should handle storage error fallback', async () => {
      global.browser = {
        storage: {
          sync: {
            get: jest.fn().mockRejectedValue(new Error('Storage failed'))
          }
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const options = await BrowserAPI.getOptions();
      expect(options.downloadMode).toBe('downloadsApi'); // Should return defaults
    });

    test('should handle storage API unavailable', async () => {
      global.browser = {}; // No storage API

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const options = await BrowserAPI.getOptions();
      expect(options.downloadMode).toBe('downloadsApi'); // Should return defaults

      const saveResult = await BrowserAPI.saveOptions({ test: 'value' });
      expect(saveResult).toBe(false);
    });

    test('should handle saveOptions success and error paths', async () => {
      global.browser = {
        storage: {
          sync: {
            set: jest.fn()
          }
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Success path
      global.browser.storage.sync.set.mockResolvedValue();
      const result = await BrowserAPI.saveOptions({ test: 'value' });
      expect(result).toBe(true);

      // Error path
      global.browser.storage.sync.set.mockRejectedValue(new Error('Save failed'));
      await expect(BrowserAPI.saveOptions({ test: 'value' }))
        .rejects.toThrow('Save options failed: Save failed');
    });
  });

  describe('Runtime API Branches', () => {
    test('should handle message listener management', () => {
      global.browser = {
        runtime: {
          onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const testListener = jest.fn();
      const cleanup = BrowserAPI.onMessage(testListener);
      
      expect(global.browser.runtime.onMessage.addListener).toHaveBeenCalledWith(testListener);
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(global.browser.runtime.onMessage.removeListener).toHaveBeenCalledWith(testListener);
    });

    test('should handle runtime API unavailable', () => {
      global.browser = {}; // No runtime API

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const cleanup = BrowserAPI.onMessage(jest.fn());
      expect(cleanup).toBeUndefined();
    });

    test('should handle platform info branches', async () => {
      global.browser = {
        runtime: {
          getPlatformInfo: jest.fn()
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Success path
      global.browser.runtime.getPlatformInfo.mockResolvedValue({ os: 'mac', arch: 'x86-64' });
      let info = await BrowserAPI.getPlatformInfo();
      expect(info).toEqual({ os: 'mac', arch: 'x86-64' });

      // Error path
      global.browser.runtime.getPlatformInfo.mockRejectedValue(new Error('Platform failed'));
      info = await BrowserAPI.getPlatformInfo();
      expect(info).toEqual({ os: 'unknown', arch: 'unknown' });
    });

    test('should handle browser info branches', async () => {
      global.browser = {
        runtime: {
          getBrowserInfo: jest.fn()
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Success path
      global.browser.runtime.getBrowserInfo.mockResolvedValue({ name: 'Firefox', version: '100.0' });
      let info = await BrowserAPI.getBrowserInfo();
      expect(info).toEqual({ name: 'Firefox', version: '100.0' });

      // Method not available
      delete global.browser.runtime.getBrowserInfo;
      info = await BrowserAPI.getBrowserInfo();
      expect(info).toBe('Browser info not available');
    });
  });

  describe('Notifications API Branches', () => {
    test('should handle createNotification success and error paths', async () => {
      global.browser = {
        runtime: {},
        notifications: {
          create: jest.fn()
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Success path
      global.browser.notifications.create.mockResolvedValue('notification-123');
      const result = await BrowserAPI.createNotification({ title: 'Test' });
      expect(result).toBe('notification-123');

      // Error path
      global.browser.notifications.create.mockRejectedValue(new Error('Notification failed'));
      await expect(BrowserAPI.createNotification({ title: 'Test' }))
        .rejects.toThrow('Create notification failed: Notification failed');
    });

    test('should handle notifications API unavailable', async () => {
      global.browser = {
        runtime: {} // Runtime available but no notifications
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const result = await BrowserAPI.createNotification({ title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('Error Handler Integration', () => {
    test('should handle missing ErrorHandler gracefully', async () => {
      delete mockSelf.ErrorHandler;
      
      global.browser = {
        downloads: {
          download: jest.fn().mockRejectedValue(new Error('Download failed'))
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Should not throw even without ErrorHandler
      await expect(BrowserAPI.downloadFile({ url: 'test.com' }))
        .rejects.toThrow('File download failed: Download failed');
    });
  });

  describe('Utility Functions Coverage', () => {
    test('should provide default options', () => {
      global.browser = {};
      
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const defaults = BrowserAPI.getDefaultOptions();
      
      expect(defaults).toMatchObject({
        downloadMode: 'downloadsApi',
        saveAs: false,
        downloadImages: true,
        frontmatter: '',
        backmatter: '',
        turndownEscape: true
      });
    });

    test('should track message listener count', () => {
      global.browser = {
        runtime: {
          onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      expect(BrowserAPI.getMessageListenerCount()).toBe(0);

      const cleanup1 = BrowserAPI.onMessage(jest.fn());
      expect(BrowserAPI.getMessageListenerCount()).toBe(1);

      const cleanup2 = BrowserAPI.onMessage(jest.fn());
      expect(BrowserAPI.getMessageListenerCount()).toBe(2);

      cleanup1();
      expect(BrowserAPI.getMessageListenerCount()).toBe(1);

      cleanup2();
      expect(BrowserAPI.getMessageListenerCount()).toBe(0);
    });

    test('should get API status', () => {
      global.browser = {
        downloads: { download: jest.fn() },
        tabs: { query: jest.fn() }
        // Missing scripting, storage, runtime
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const status = BrowserAPI.getStatus();
      
      expect(status.downloads).toBe(true);
      expect(status.tabs).toBe(true);
      expect(status.scripting).toBe(false);
      expect(status.storage).toBe(false);
      expect(status.runtime).toBe(false);
    });
  });

  describe('Tabs and Scripting API Coverage', () => {
    test('should handle tabs API methods', async () => {
      global.browser = {
        tabs: {
          query: jest.fn().mockResolvedValue([{ id: 123 }]),
          get: jest.fn().mockResolvedValue({ id: 456 }),
          sendMessage: jest.fn().mockResolvedValue({ success: true })
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // getActiveTab
      const activeTab = await BrowserAPI.getActiveTab();
      expect(activeTab).toEqual({ id: 123 });

      // getTab
      const tab = await BrowserAPI.getTab(456);
      expect(tab).toEqual({ id: 456 });

      // sendMessageToTab
      const response = await BrowserAPI.sendMessageToTab(123, { action: 'test' });
      expect(response).toEqual({ success: true });
    });

    test('should handle scripting API', async () => {
      global.browser = {
        scripting: {
          executeScript: jest.fn().mockResolvedValue([{ result: 'success' }])
        }
      };

      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const result = await BrowserAPI.executeScriptInTab(123, { func: () => 'test' });
      expect(result).toEqual([{ result: 'success' }]);
    });
  });
});
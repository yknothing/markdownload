/**
 * Comprehensive Browser API Test Suite
 * Targets 85%+ branch coverage for src/background/api/browser-api.js
 * 
 * Coverage Strategy:
 * 1. API availability checks (true/false branches) 
 * 2. Error handling paths (success/failure branches)
 * 3. Timeout and retry scenarios
 * 4. Browser polyfill scenarios
 * 5. Security validation branches
 */

describe('Browser API Comprehensive Coverage', () => {
  let browserAPIModule;
  let mockBrowser;
  let mockChrome;
  let originalBrowser;
  let originalChrome;

  beforeEach(() => {
    // Store originals
    originalBrowser = global.browser;
    originalChrome = global.chrome;
    
    // Create comprehensive mocks
    mockBrowser = {
      downloads: {
        download: jest.fn(),
        search: jest.fn(), 
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      scripting: {
        executeScript: jest.fn()
      },
      tabs: {
        query: jest.fn(),
        get: jest.fn(),
        sendMessage: jest.fn()
      },
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        },
        sendMessage: jest.fn(),
        getPlatformInfo: jest.fn(),
        getBrowserInfo: jest.fn(),
        openOptionsPage: jest.fn(),
        reload: jest.fn()
      },
      notifications: {
        create: jest.fn()
      }
    };

    mockChrome = {
      scripting: {
        executeScript: jest.fn()
      }
    };

    // Initialize mock error handler
    global.self = {
      ErrorHandler: {
        handleServiceWorkerError: jest.fn(),
        handleDownloadError: jest.fn()
      }
    };
  });

  afterEach(() => {
    // Restore originals
    global.browser = originalBrowser;
    global.chrome = originalChrome;
    
    // Clear all mocks
    jest.clearAllMocks();
    delete global.self;
  });

  describe('API Availability Detection Branches', () => {
    test('should handle browser object undefined at initialization', async () => {
      global.browser = undefined;
      
      // Import module when browser is undefined
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      
      // Should not throw when browser is undefined
      expect(() => {
        require('../../../../src/background/api/browser-api.js');
      }).not.toThrow();
    });

    test('should detect all API availability states', () => {
      global.browser = mockBrowser;
      
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Test all API availability branches
      expect(BrowserAPI.isAvailable('downloads')).toBe(true);
      expect(BrowserAPI.isAvailable('scripting')).toBe(true);
      expect(BrowserAPI.isAvailable('tabs')).toBe(true);
      expect(BrowserAPI.isAvailable('storage')).toBe(true);
      expect(BrowserAPI.isAvailable('runtime')).toBe(true);
      expect(BrowserAPI.isAvailable('nonexistent')).toBe(false);
    });

    test('should handle missing API branches', () => {
      global.browser = {
        // Only partial APIs available
        downloads: mockBrowser.downloads,
        // Missing scripting, tabs, storage, runtime
      };
      
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      expect(BrowserAPI.isAvailable('downloads')).toBe(true);
      expect(BrowserAPI.isAvailable('scripting')).toBe(false);
      expect(BrowserAPI.isAvailable('tabs')).toBe(false);
      expect(BrowserAPI.isAvailable('storage')).toBe(false);
      expect(BrowserAPI.isAvailable('runtime')).toBe(false);
    });

    test('should apply Chrome scripting polyfill branch', () => {
      global.browser = {
        // Browser object exists but no scripting
      };
      global.chrome = mockChrome;
      
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // Should apply polyfill and make scripting available
      expect(BrowserAPI.isAvailable('scripting')).toBe(true);
    });
  });

  describe('Downloads API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover downloadFile success path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.downloads.download.mockResolvedValue('download-id-123');

      const result = await BrowserAPI.downloadFile({ 
        url: 'https://test.com/file.pdf', 
        filename: 'test.pdf' 
      });

      expect(result).toBe('download-id-123');
      expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
        url: 'https://test.com/file.pdf',
        filename: 'test.pdf'
      });
    });

    test('should cover downloadFile error path with ErrorHandler', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const downloadError = new Error('Download failed');
      mockBrowser.downloads.download.mockRejectedValue(downloadError);

      await expect(BrowserAPI.downloadFile({ 
        url: 'https://test.com/file.pdf', 
        filename: 'test.pdf' 
      })).rejects.toThrow('File download failed: Download failed');

      expect(global.self.ErrorHandler.handleDownloadError).toHaveBeenCalledWith(
        downloadError, 
        'test.pdf', 
        'downloadFile'
      );
    });

    test('should cover downloadFile API unavailable branch', async () => {
      // Remove downloads API
      delete global.browser.downloads;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      await expect(BrowserAPI.downloadFile({ 
        url: 'https://test.com/file.pdf' 
      })).rejects.toThrow('Downloads API not available');

      expect(global.self.ErrorHandler.handleServiceWorkerError).toHaveBeenCalled();
    });

    test('should cover searchDownloads success and error paths', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.downloads.search.mockResolvedValue([{id: 1}, {id: 2}]);
      const results = await BrowserAPI.searchDownloads({ state: 'complete' });
      expect(results).toEqual([{id: 1}, {id: 2}]);

      // Error path
      const searchError = new Error('Search failed');
      mockBrowser.downloads.search.mockRejectedValue(searchError);
      await expect(BrowserAPI.searchDownloads()).rejects.toThrow('Download search failed: Search failed');
    });

    test('should cover onDownloadChanged listener branches', () => {
      const BrowserAPI = global.self.BrowserAPI;
      const testListener = jest.fn();

      // Success path - add listener
      const cleanup = BrowserAPI.onDownloadChanged(testListener);
      expect(mockBrowser.downloads.onChanged.addListener).toHaveBeenCalledWith(testListener);

      // Success path - cleanup function
      cleanup();
      expect(mockBrowser.downloads.onChanged.removeListener).toHaveBeenCalledWith(testListener);

      // Error path - cleanup function fails
      mockBrowser.downloads.onChanged.removeListener.mockImplementation(() => {
        throw new Error('Remove listener failed');
      });
      
      // Should not throw error
      const cleanup2 = BrowserAPI.onDownloadChanged(jest.fn());
      expect(() => cleanup2()).not.toThrow();
    });

    test('should cover onDownloadChanged API unavailable branch', () => {
      delete global.browser.downloads;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const cleanup = BrowserAPI.onDownloadChanged(jest.fn());
      // Should return no-op cleanup function
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Scripting API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover executeScriptInTab success path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.scripting.executeScript.mockResolvedValue([{ result: 'success' }]);

      const result = await BrowserAPI.executeScriptInTab(123, {
        func: () => 'test'
      });

      expect(result).toEqual([{ result: 'success' }]);
      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        func: expect.any(Function)
      });
    });

    test('should cover executeScriptInTab error path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const scriptError = new Error('Script execution failed');
      mockBrowser.scripting.executeScript.mockRejectedValue(scriptError);

      await expect(BrowserAPI.executeScriptInTab(123, { func: () => 'test' }))
        .rejects.toThrow('Script execution failed: Script execution failed');

      expect(global.self.ErrorHandler.handleServiceWorkerError).toHaveBeenCalledWith(
        scriptError,
        'executeScriptInTab'
      );
    });

    test('should cover executeScriptInTab API unavailable branch', async () => {
      delete global.browser.scripting;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      await expect(BrowserAPI.executeScriptInTab(123, { func: () => 'test' }))
        .rejects.toThrow('Scripting API not available');
    });
  });

  describe('Tabs API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover getActiveTab success path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.tabs.query.mockResolvedValue([{ id: 123, url: 'https://test.com' }]);

      const tab = await BrowserAPI.getActiveTab();
      
      expect(tab).toEqual({ id: 123, url: 'https://test.com' });
      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({ 
        active: true, 
        currentWindow: true 
      });
    });

    test('should cover getActiveTab error path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const tabError = new Error('Tab query failed');
      mockBrowser.tabs.query.mockRejectedValue(tabError);

      await expect(BrowserAPI.getActiveTab()).rejects.toThrow('Get active tab failed: Tab query failed');
    });

    test('should cover getTab success and error paths', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.tabs.get.mockResolvedValue({ id: 456, title: 'Test Tab' });
      const tab = await BrowserAPI.getTab(456);
      expect(tab).toEqual({ id: 456, title: 'Test Tab' });

      // Error path
      const getError = new Error('Tab not found');
      mockBrowser.tabs.get.mockRejectedValue(getError);
      await expect(BrowserAPI.getTab(999)).rejects.toThrow('Get tab failed: Tab not found');
    });

    test('should cover sendMessageToTab success and error paths', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.tabs.sendMessage.mockResolvedValue({ success: true });
      const response = await BrowserAPI.sendMessageToTab(123, { action: 'test' });
      expect(response).toEqual({ success: true });

      // Error path
      const messageError = new Error('Message send failed');
      mockBrowser.tabs.sendMessage.mockRejectedValue(messageError);
      await expect(BrowserAPI.sendMessageToTab(123, { action: 'test' }))
        .rejects.toThrow('Send message to tab failed: Message send failed');
    });

    test('should cover tabs API unavailable branches', async () => {
      delete global.browser.tabs;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      await expect(BrowserAPI.getActiveTab()).rejects.toThrow('Tabs API not available');
      await expect(BrowserAPI.getTab(123)).rejects.toThrow('Tabs API not available');
      await expect(BrowserAPI.sendMessageToTab(123, {})).rejects.toThrow('Tabs API not available');
    });
  });

  describe('Storage API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover getOptions success path with stored data', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const storedOptions = { downloadImages: false, saveAs: true };
      mockBrowser.storage.sync.get.mockResolvedValue(storedOptions);

      const options = await BrowserAPI.getOptions();
      
      // Should merge with defaults
      expect(options).toMatchObject(storedOptions);
      expect(options.downloadMode).toBe('downloadsApi'); // Default value
    });

    test('should cover getOptions error path - fallback to defaults', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.storage.sync.get.mockRejectedValue(new Error('Storage access failed'));

      const options = await BrowserAPI.getOptions();
      
      // Should return default options
      expect(options.downloadMode).toBe('downloadsApi');
      expect(options.downloadImages).toBe(true);
    });

    test('should cover getOptions API unavailable branch', async () => {
      delete global.browser.storage;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const options = await BrowserAPI.getOptions();
      
      // Should return default options
      expect(options.downloadMode).toBe('downloadsApi');
    });

    test('should cover saveOptions success path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.storage.sync.set.mockResolvedValue();

      const result = await BrowserAPI.saveOptions({ downloadImages: false });
      
      expect(result).toBe(true);
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ downloadImages: false });
    });

    test('should cover saveOptions error path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const saveError = new Error('Storage save failed');
      mockBrowser.storage.sync.set.mockRejectedValue(saveError);

      await expect(BrowserAPI.saveOptions({ test: 'value' }))
        .rejects.toThrow('Save options failed: Storage save failed');
    });

    test('should cover saveOptions API unavailable branch', async () => {
      delete global.browser.storage;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const result = await BrowserAPI.saveOptions({ test: 'value' });
      expect(result).toBe(false);
    });
  });

  describe('Runtime API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover onMessage success path with cleanup', () => {
      const BrowserAPI = global.self.BrowserAPI;
      const testListener = jest.fn();

      const cleanup = BrowserAPI.onMessage(testListener);
      
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledWith(testListener);
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledWith(testListener);
    });

    test('should cover onMessage API unavailable branch', () => {
      delete global.browser.runtime;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const cleanup = BrowserAPI.onMessage(jest.fn());
      expect(cleanup).toBeUndefined();
    });

    test('should cover sendRuntimeMessage success and error paths', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });
      const response = await BrowserAPI.sendRuntimeMessage({ action: 'test' });
      expect(response).toEqual({ success: true });

      // Error path
      const messageError = new Error('Runtime message failed');
      mockBrowser.runtime.sendMessage.mockRejectedValue(messageError);
      await expect(BrowserAPI.sendRuntimeMessage({ action: 'test' }))
        .rejects.toThrow('Send runtime message failed: Runtime message failed');
    });

    test('should cover sendRuntimeMessage API unavailable branch', async () => {
      delete global.browser.runtime;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      await expect(BrowserAPI.sendRuntimeMessage({ action: 'test' }))
        .rejects.toThrow('Runtime API not available');
    });

    test('should cover getPlatformInfo success, error, and unavailable paths', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.runtime.getPlatformInfo.mockResolvedValue({ os: 'mac', arch: 'x86-64' });
      let info = await BrowserAPI.getPlatformInfo();
      expect(info).toEqual({ os: 'mac', arch: 'x86-64' });

      // Error path
      mockBrowser.runtime.getPlatformInfo.mockRejectedValue(new Error('Platform info failed'));
      info = await BrowserAPI.getPlatformInfo();
      expect(info).toEqual({ os: 'unknown', arch: 'unknown' });

      // API unavailable path
      delete global.browser.runtime;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI2 = global.self.BrowserAPI;
      
      info = await BrowserAPI2.getPlatformInfo();
      expect(info).toEqual({ os: 'unknown', arch: 'unknown' });
    });

    test('should cover getBrowserInfo branches', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // Success path
      mockBrowser.runtime.getBrowserInfo = jest.fn().mockResolvedValue({
        name: 'Firefox',
        version: '100.0'
      });
      let info = await BrowserAPI.getBrowserInfo();
      expect(info).toEqual({ name: 'Firefox', version: '100.0' });

      // Error path
      mockBrowser.runtime.getBrowserInfo.mockRejectedValue(new Error('Browser info failed'));
      info = await BrowserAPI.getBrowserInfo();
      expect(info).toBe('Browser info not available');

      // API unavailable path
      delete mockBrowser.runtime.getBrowserInfo;
      info = await BrowserAPI.getBrowserInfo();
      expect(info).toBe('Browser info not available');
    });

    test('should cover management API branches', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      
      // openOptionsPage success
      mockBrowser.runtime.openOptionsPage.mockResolvedValue();
      let result = await BrowserAPI.openOptionsPage();
      expect(result).toBe(true);

      // openOptionsPage error
      mockBrowser.runtime.openOptionsPage.mockRejectedValue(new Error('Options page failed'));
      await expect(BrowserAPI.openOptionsPage()).rejects.toThrow('Open options page failed: Options page failed');

      // reloadExtension success
      mockBrowser.runtime.reload.mockReturnValue();
      result = await BrowserAPI.reloadExtension();
      expect(result).toBe(true);

      // reloadExtension error
      mockBrowser.runtime.reload.mockImplementation(() => {
        throw new Error('Reload failed');
      });
      await expect(BrowserAPI.reloadExtension()).rejects.toThrow('Reload extension failed: Reload failed');
    });
  });

  describe('Notifications API Branch Coverage', () => {
    beforeEach(() => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
    });

    test('should cover createNotification success path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      mockBrowser.notifications.create.mockResolvedValue('notification-id-123');

      const result = await BrowserAPI.createNotification({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Test',
        message: 'Test message'
      });

      expect(result).toBe('notification-id-123');
    });

    test('should cover createNotification error path', async () => {
      const BrowserAPI = global.self.BrowserAPI;
      const notificationError = new Error('Notification creation failed');
      mockBrowser.notifications.create.mockRejectedValue(notificationError);

      await expect(BrowserAPI.createNotification({ title: 'Test' }))
        .rejects.toThrow('Create notification failed: Notification creation failed');
    });

    test('should cover createNotification API unavailable branches', async () => {
      // Runtime available but notifications not available
      delete mockBrowser.notifications;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const result = await BrowserAPI.createNotification({ title: 'Test' });
      expect(result).toBeNull();

      // Runtime not available
      delete global.browser.runtime;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI2 = global.self.BrowserAPI;

      const result2 = await BrowserAPI2.createNotification({ title: 'Test' });
      expect(result2).toBeNull();
    });
  });

  describe('Error Handler Integration Branches', () => {
    test('should handle missing ErrorHandler gracefully', async () => {
      global.browser = mockBrowser;
      delete global.self.ErrorHandler; // Remove error handler
      
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      mockBrowser.downloads.download.mockRejectedValue(new Error('Download failed'));

      // Should not throw even without ErrorHandler
      await expect(BrowserAPI.downloadFile({ url: 'test.com' }))
        .rejects.toThrow('File download failed: Download failed');
    });
  });

  describe('Initialization Delay Branches', () => {
    test('should handle delayed browser initialization', (done) => {
      global.browser = undefined;
      
      // Load module without browser
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');

      // Set browser after delay
      setTimeout(() => {
        global.browser = mockBrowser;
        
        // Check that APIs become available
        setTimeout(() => {
          try {
            const BrowserAPI = global.self.BrowserAPI;
            expect(BrowserAPI.isAvailable('downloads')).toBe(true);
            done();
          } catch (error) {
            done(error);
          }
        }, 150); // After initialization delay
      }, 50);
    });

    test('should handle permanent browser unavailability', (done) => {
      global.browser = undefined;
      
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');

      // Keep browser undefined
      setTimeout(() => {
        try {
          const BrowserAPI = global.self.BrowserAPI;
          expect(BrowserAPI.isAvailable('downloads')).toBe(false);
          done();
        } catch (error) {
          done(error);
        }
      }, 250); // After both initialization attempts
    });
  });

  describe('Message Listener Management', () => {
    test('should track message listener count', () => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
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
  });

  describe('Default Options Coverage', () => {
    test('should return complete default options object', () => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      const defaults = BrowserAPI.getDefaultOptions();
      
      expect(defaults).toMatchObject({
        downloadMode: 'downloadsApi',
        saveAs: false,
        downloadImages: true,
        imageStyle: 'markdown',
        imageRefStyle: 'inline',
        imagePrefix: '',
        frontmatter: '',
        backmatter: '',
        turndownEscape: true,
        linkStyle: 'keep',
        codeBlockStyle: 'fenced',
        fence: '```',
        disallowedChars: [],
        mdClipsFolder: '',
        includeTemplate: false,
        template: ''
      });
    });
  });

  describe('Module Export Coverage', () => {
    test('should expose all expected API methods', () => {
      global.browser = mockBrowser;
      delete require.cache[require.resolve('../../../../src/background/api/browser-api.js')];
      require('../../../../src/background/api/browser-api.js');
      const BrowserAPI = global.self.BrowserAPI;

      // API availability methods
      expect(typeof BrowserAPI.isAvailable).toBe('function');
      expect(typeof BrowserAPI.getStatus).toBe('function');

      // Downloads API methods
      expect(typeof BrowserAPI.downloadFile).toBe('function');
      expect(typeof BrowserAPI.searchDownloads).toBe('function');
      expect(typeof BrowserAPI.onDownloadChanged).toBe('function');

      // Tabs API methods
      expect(typeof BrowserAPI.getActiveTab).toBe('function');
      expect(typeof BrowserAPI.getTab).toBe('function');
      expect(typeof BrowserAPI.sendMessageToTab).toBe('function');

      // Scripting API methods
      expect(typeof BrowserAPI.executeScriptInTab).toBe('function');

      // Storage API methods
      expect(typeof BrowserAPI.getOptions).toBe('function');
      expect(typeof BrowserAPI.saveOptions).toBe('function');
      expect(typeof BrowserAPI.getDefaultOptions).toBe('function');

      // Runtime API methods
      expect(typeof BrowserAPI.onMessage).toBe('function');
      expect(typeof BrowserAPI.sendRuntimeMessage).toBe('function');

      // Notifications API methods
      expect(typeof BrowserAPI.createNotification).toBe('function');

      // Platform/Browser info methods
      expect(typeof BrowserAPI.getPlatformInfo).toBe('function');
      expect(typeof BrowserAPI.getBrowserInfo).toBe('function');

      // Management methods
      expect(typeof BrowserAPI.openOptionsPage).toBe('function');
      expect(typeof BrowserAPI.reloadExtension).toBe('function');

      // Utility methods
      expect(typeof BrowserAPI.getMessageListenerCount).toBe('function');
    });
  });
});
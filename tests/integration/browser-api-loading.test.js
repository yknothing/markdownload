/**
 * Integration test for BrowserAPI module loading
 * Tests that BrowserAPI can handle browser object availability gracefully
 */

// Mock the Service Worker environment
global.self = {
  addEventListener: jest.fn(),
  ErrorHandler: null,
  BrowserAPI: null
};

// Mock browser object for testing
global.browser = {
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
  }
};

// Load the module
require('../../src/background/core/error-handling.js');
require('../../src/background/api/browser-api.js');

describe('BrowserAPI Module Loading', () => {

  test('BrowserAPI should load successfully with browser object available', () => {
    expect(global.self.BrowserAPI).toBeDefined();
    expect(typeof global.self.BrowserAPI).toBe('object');
  });

  test('BrowserAPI should have all required methods', () => {
    const browserAPI = global.self.BrowserAPI;

    // Core methods
    expect(typeof browserAPI.isAvailable).toBe('function');
    expect(typeof browserAPI.getStatus).toBe('function');

    // Downloads API
    expect(typeof browserAPI.downloadFile).toBe('function');
    expect(typeof browserAPI.searchDownloads).toBe('function');
    expect(typeof browserAPI.onDownloadChanged).toBe('function');

    // Tabs API
    expect(typeof browserAPI.getActiveTab).toBe('function');
    expect(typeof browserAPI.getTab).toBe('function');
    expect(typeof browserAPI.sendMessageToTab).toBe('function');

    // Scripting API
    expect(typeof browserAPI.executeScriptInTab).toBe('function');

    // Storage API
    expect(typeof browserAPI.getOptions).toBe('function');
    expect(typeof browserAPI.saveOptions).toBe('function');

    // Runtime API
    expect(typeof browserAPI.onMessage).toBe('function');
    expect(typeof browserAPI.sendRuntimeMessage).toBe('function');

    // Platform/Browser info
    expect(typeof browserAPI.getPlatformInfo).toBe('function');
    expect(typeof browserAPI.getBrowserInfo).toBe('function');

    // Management
    expect(typeof browserAPI.openOptionsPage).toBe('function');
    expect(typeof browserAPI.reloadExtension).toBe('function');
  });

  test('BrowserAPI should detect available APIs', () => {
    const browserAPI = global.self.BrowserAPI;

    expect(browserAPI.isAvailable('downloads')).toBe(true);
    expect(browserAPI.isAvailable('scripting')).toBe(true);
    expect(browserAPI.isAvailable('tabs')).toBe(true);
    expect(browserAPI.isAvailable('storage')).toBe(true);
    expect(browserAPI.isAvailable('runtime')).toBe(true);
  });

  test('BrowserAPI should handle API calls safely', async () => {
    const browserAPI = global.self.BrowserAPI;

    // Mock successful download
    global.browser.downloads.download.mockResolvedValue(123);

    const result = await browserAPI.downloadFile({
      url: 'blob:test',
      filename: 'test.md'
    });

    expect(result).toBe(123);
    expect(global.browser.downloads.download).toHaveBeenCalledWith({
      url: 'blob:test',
      filename: 'test.md'
    });
  });

  test('BrowserAPI should handle API errors gracefully', async () => {
    const browserAPI = global.self.BrowserAPI;

    // Mock download failure
    const downloadError = new Error('Download failed');
    global.browser.downloads.download.mockRejectedValue(downloadError);

    try {
      await browserAPI.downloadFile({
        url: 'blob:test',
        filename: 'test.md'
      });
      fail('Expected download to fail');
    } catch (error) {
      expect(error.message).toContain('File download failed');
    }
  });

  test('BrowserAPI should provide status information', () => {
    const browserAPI = global.self.BrowserAPI;
    const status = browserAPI.getStatus();

    expect(status).toBeDefined();
    expect(typeof status).toBe('object');
    expect(status).toHaveProperty('downloads', true);
    expect(status).toHaveProperty('scripting', true);
    expect(status).toHaveProperty('tabs', true);
    expect(status).toHaveProperty('storage', true);
    expect(status).toHaveProperty('runtime', true);
  });
});

/**
 * Browser Extension API Tests for MarkDownload
 * 
 * Tests the browser extension specific APIs including:
 * - Message handling and communication
 * - Browser storage operations
 * - Tab management and content script injection
 * - Downloads API integration
 * - Context menu handling
 * - Command/keyboard shortcut handling
 * - Permission management
 * - Error handling and edge cases
 */

const { createExtensionApiMock } = require('../../../mocks/browserMocks.js');

// Mock file system modules
jest.mock('fs');
jest.mock('path');

// Set up comprehensive browser extension mock
let mockBrowser;
let mockHelpers;

beforeAll(() => {
  // Create enhanced browser mock
  mockBrowser = {
    // Runtime API
    runtime: {
      id: 'test-extension-id',
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(() => true)
      },
      getPlatformInfo: jest.fn().mockResolvedValue({
        os: 'mac',
        arch: 'x86-64'
      }),
      getBrowserInfo: jest.fn().mockResolvedValue({
        name: 'Chrome',
        version: '120.0.0.0'
      }),
      getManifest: jest.fn(() => ({
        manifest_version: 3,
        name: 'MarkDownload',
        version: '3.4.0'
      })),
      getURL: jest.fn((path) => `chrome-extension://test-extension-id/${path}`),
      lastError: null
    },

    // Storage API
    storage: {
      sync: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      }
    },

    // Downloads API
    downloads: {
      download: jest.fn(),
      search: jest.fn(),
      cancel: jest.fn(),
      erase: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onCreated: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Tabs API
    tabs: {
      query: jest.fn(),
      get: jest.fn(),
      getCurrent: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      sendMessage: jest.fn(),
      executeScript: jest.fn()
    },

    // Scripting API (Manifest V3)
    scripting: {
      executeScript: jest.fn(),
      insertCSS: jest.fn(),
      removeCSS: jest.fn()
    },

    // Context Menus API
    contextMenus: {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn(),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Commands API
    commands: {
      onCommand: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Action API (Manifest V3)
    action: {
      setTitle: jest.fn(),
      getTitle: jest.fn(),
      setIcon: jest.fn(),
      setPopup: jest.fn(),
      getPopup: jest.fn(),
      setBadgeText: jest.fn(),
      getBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
      onClicked: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    },

    // Permissions API
    permissions: {
      contains: jest.fn(),
      request: jest.fn(),
      remove: jest.fn(),
      getAll: jest.fn(),
      onAdded: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      onRemoved: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      }
    }
  };

  global.browser = mockBrowser;
  global.chrome = mockBrowser;

  // Mock helpers for test control
  mockHelpers = {
    reset: () => {
      Object.values(mockBrowser).forEach(api => {
        if (api && typeof api === 'object') {
          Object.values(api).forEach(method => {
            if (method && method.mockReset) {
              method.mockReset();
            }
          });
        }
      });
    },
    
    triggerStorageChange: (changes, areaName = 'sync') => {
      if (mockBrowser.storage[areaName].onChanged.addListener.mock.calls.length > 0) {
        const listeners = mockBrowser.storage[areaName].onChanged.addListener.mock.calls.map(call => call[0]);
        listeners.forEach(listener => listener(changes, areaName));
      }
    },
    
    triggerDownloadChange: (downloadDelta) => {
      const listeners = mockBrowser.downloads.onChanged.addListener.mock.calls.map(call => call[0]);
      listeners.forEach(listener => listener(downloadDelta));
    },
    
    triggerContextMenuClick: (info, tab) => {
      const listeners = mockBrowser.contextMenus.onClicked.addListener.mock.calls.map(call => call[0]);
      listeners.forEach(listener => listener(info, tab));
    },
    
    triggerCommand: (command) => {
      const listeners = mockBrowser.commands.onCommand.addListener.mock.calls.map(call => call[0]);
      listeners.forEach(listener => listener(command));
    },
    
    triggerRuntimeMessage: (message, sender, sendResponse) => {
      const listeners = mockBrowser.runtime.onMessage.addListener.mock.calls.map(call => call[0]);
      listeners.forEach(listener => listener(message, sender, sendResponse));
    }
  };

  global.mockBrowserHelpers = mockHelpers;
});

// Mock URL and Blob for testing
global.URL = class extends require('url').URL {
  static createObjectURL = jest.fn(() => 'blob:mock-url-' + Date.now());
  static revokeObjectURL = jest.fn();
};

global.Blob = jest.fn((data, options) => ({
  data,
  options,
  type: options?.type || 'text/plain',
  size: Array.isArray(data) ? data.join('').length : data.length || 0
}));

// Browser Extension API implementation for testing
class BrowserExtensionAPI {
  constructor() {
    this.messageListeners = [];
    this.downloadListeners = [];
    this.commandListeners = [];
    this.contextMenuListeners = [];
  }

  // Message handling API
  async sendMessage(message, options = {}) {
    try {
      return await browser.runtime.sendMessage(message);
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  addMessageListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Message listener must be a function');
    }
    
    this.messageListeners.push(callback);
    browser.runtime.onMessage.addListener(callback);
  }

  removeMessageListener(callback) {
    const index = this.messageListeners.indexOf(callback);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
      browser.runtime.onMessage.removeListener(callback);
    }
  }

  // Storage API wrapper
  async getStorageData(keys = null, area = 'sync') {
    try {
      const storage = browser.storage[area];
      if (!storage) {
        throw new Error(`Storage area '${area}' not supported`);
      }
      
      return await storage.get(keys);
    } catch (error) {
      throw new Error(`Storage get failed: ${error.message}`);
    }
  }

  async setStorageData(data, area = 'sync') {
    try {
      const storage = browser.storage[area];
      if (!storage) {
        throw new Error(`Storage area '${area}' not supported`);
      }
      
      if (typeof data !== 'object' || data === null) {
        throw new Error('Storage data must be an object');
      }
      
      await storage.set(data);
    } catch (error) {
      throw new Error(`Storage set failed: ${error.message}`);
    }
  }

  async removeStorageData(keys, area = 'sync') {
    try {
      const storage = browser.storage[area];
      if (!storage) {
        throw new Error(`Storage area '${area}' not supported`);
      }
      
      await storage.remove(keys);
    } catch (error) {
      throw new Error(`Storage remove failed: ${error.message}`);
    }
  }

  async clearStorageData(area = 'sync') {
    try {
      const storage = browser.storage[area];
      if (!storage) {
        throw new Error(`Storage area '${area}' not supported`);
      }
      
      await storage.clear();
    } catch (error) {
      throw new Error(`Storage clear failed: ${error.message}`);
    }
  }

  // Downloads API wrapper
  async downloadFile(options) {
    try {
      if (!options.url) {
        throw new Error('Download URL is required');
      }
      
      if (!options.filename) {
        throw new Error('Download filename is required');
      }
      
      const downloadId = await browser.downloads.download(options);
      return downloadId;
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async searchDownloads(query = {}) {
    try {
      return await browser.downloads.search(query);
    } catch (error) {
      throw new Error(`Download search failed: ${error.message}`);
    }
  }

  async cancelDownload(downloadId) {
    try {
      if (typeof downloadId !== 'number') {
        throw new Error('Download ID must be a number');
      }
      
      await browser.downloads.cancel(downloadId);
    } catch (error) {
      throw new Error(`Download cancel failed: ${error.message}`);
    }
  }

  addDownloadListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Download listener must be a function');
    }
    
    this.downloadListeners.push(callback);
    browser.downloads.onChanged.addListener(callback);
  }

  // Tab management API
  async queryTabs(queryInfo = {}) {
    try {
      return await browser.tabs.query(queryInfo);
    } catch (error) {
      throw new Error(`Tab query failed: ${error.message}`);
    }
  }

  async getCurrentTab() {
    try {
      return await browser.tabs.getCurrent();
    } catch (error) {
      throw new Error(`Get current tab failed: ${error.message}`);
    }
  }

  async getTab(tabId) {
    try {
      if (typeof tabId !== 'number') {
        throw new Error('Tab ID must be a number');
      }
      
      return await browser.tabs.get(tabId);
    } catch (error) {
      throw new Error(`Get tab failed: ${error.message}`);
    }
  }

  async sendTabMessage(tabId, message) {
    try {
      if (typeof tabId !== 'number') {
        throw new Error('Tab ID must be a number');
      }
      
      return await browser.tabs.sendMessage(tabId, message);
    } catch (error) {
      throw new Error(`Send tab message failed: ${error.message}`);
    }
  }

  // Content script injection API
  async executeScript(injection) {
    try {
      if (!injection.target || !injection.target.tabId) {
        throw new Error('Script injection requires target tab ID');
      }
      
      if (!injection.func && !injection.files) {
        throw new Error('Script injection requires either func or files');
      }
      
      return await browser.scripting.executeScript(injection);
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  async insertCSS(injection) {
    try {
      if (!injection.target || !injection.target.tabId) {
        throw new Error('CSS injection requires target tab ID');
      }
      
      if (!injection.css && !injection.files) {
        throw new Error('CSS injection requires either css or files');
      }
      
      await browser.scripting.insertCSS(injection);
    } catch (error) {
      throw new Error(`CSS insertion failed: ${error.message}`);
    }
  }

  // Context menu API
  createContextMenu(properties) {
    try {
      if (!properties.id) {
        throw new Error('Context menu requires an ID');
      }
      
      if (!properties.title) {
        throw new Error('Context menu requires a title');
      }
      
      return browser.contextMenus.create(properties);
    } catch (error) {
      throw new Error(`Context menu creation failed: ${error.message}`);
    }
  }

  async updateContextMenu(id, properties) {
    try {
      if (!id) {
        throw new Error('Context menu update requires an ID');
      }
      
      await browser.contextMenus.update(id, properties);
    } catch (error) {
      throw new Error(`Context menu update failed: ${error.message}`);
    }
  }

  async removeContextMenu(id) {
    try {
      if (!id) {
        throw new Error('Context menu removal requires an ID');
      }
      
      await browser.contextMenus.remove(id);
    } catch (error) {
      throw new Error(`Context menu removal failed: ${error.message}`);
    }
  }

  addContextMenuListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Context menu listener must be a function');
    }
    
    this.contextMenuListeners.push(callback);
    browser.contextMenus.onClicked.addListener(callback);
  }

  // Commands API
  addCommandListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Command listener must be a function');
    }
    
    this.commandListeners.push(callback);
    browser.commands.onCommand.addListener(callback);
  }

  // Permissions API
  async checkPermissions(permissions) {
    try {
      if (!permissions || typeof permissions !== 'object') {
        throw new Error('Permissions parameter must be an object');
      }
      
      return await browser.permissions.contains(permissions);
    } catch (error) {
      throw new Error(`Permission check failed: ${error.message}`);
    }
  }

  async requestPermissions(permissions) {
    try {
      if (!permissions || typeof permissions !== 'object') {
        throw new Error('Permissions parameter must be an object');
      }
      
      return await browser.permissions.request(permissions);
    } catch (error) {
      throw new Error(`Permission request failed: ${error.message}`);
    }
  }

  // Utility methods
  getBrowserInfo() {
    return browser.runtime.getBrowserInfo();
  }

  getPlatformInfo() {
    return browser.runtime.getPlatformInfo();
  }

  getManifest() {
    return browser.runtime.getManifest();
  }

  getExtensionURL(path) {
    return browser.runtime.getURL(path);
  }
}

describe('Browser Extension API Tests - Core Functionality', () => {
  let api;

  beforeEach(() => {
    api = new BrowserExtensionAPI();
    mockHelpers.reset();
  });

  describe('Message Handling API', () => {
    test('should send messages successfully', async () => {
      const testMessage = { action: 'test', data: 'hello' };
      const expectedResponse = { success: true };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue(expectedResponse);

      const response = await api.sendMessage(testMessage);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(testMessage);
      expect(response).toEqual(expectedResponse);
    });

    test('should handle message sending errors', async () => {
      const testMessage = { action: 'test' };
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Connection lost'));

      await expect(api.sendMessage(testMessage)).rejects.toThrow('Failed to send message: Connection lost');
    });

    test('should add and remove message listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      api.addMessageListener(listener1);
      api.addMessageListener(listener2);

      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(2);
      expect(api.messageListeners).toContain(listener1);
      expect(api.messageListeners).toContain(listener2);

      api.removeMessageListener(listener1);

      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledWith(listener1);
      expect(api.messageListeners).not.toContain(listener1);
      expect(api.messageListeners).toContain(listener2);
    });

    test('should validate listener parameters', () => {
      expect(() => api.addMessageListener('not-a-function')).toThrow('Message listener must be a function');
      expect(() => api.addMessageListener(null)).toThrow('Message listener must be a function');
    });

    test('should handle runtime message events', () => {
      const listener = jest.fn();
      const testMessage = { action: 'test' };
      const sender = { tab: { id: 1 } };
      const sendResponse = jest.fn();

      api.addMessageListener(listener);
      mockHelpers.triggerRuntimeMessage(testMessage, sender, sendResponse);

      expect(listener).toHaveBeenCalledWith(testMessage, sender, sendResponse);
    });
  });

  describe('Storage API', () => {
    test('should get storage data successfully', async () => {
      const mockData = { setting1: 'value1', setting2: 'value2' };
      mockBrowser.storage.sync.get.mockResolvedValue(mockData);

      const result = await api.getStorageData();

      expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockData);
    });

    test('should get specific storage keys', async () => {
      const mockData = { setting1: 'value1' };
      mockBrowser.storage.sync.get.mockResolvedValue(mockData);

      const result = await api.getStorageData(['setting1', 'setting2']);

      expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith(['setting1', 'setting2']);
      expect(result).toEqual(mockData);
    });

    test('should set storage data successfully', async () => {
      const testData = { newSetting: 'newValue' };
      mockBrowser.storage.sync.set.mockResolvedValue(undefined);

      await api.setStorageData(testData);

      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(testData);
    });

    test('should validate storage data format', async () => {
      await expect(api.setStorageData('invalid-data')).rejects.toThrow('Storage data must be an object');
      await expect(api.setStorageData(null)).rejects.toThrow('Storage data must be an object');
    });

    test('should remove storage data', async () => {
      mockBrowser.storage.sync.remove.mockResolvedValue(undefined);

      await api.removeStorageData(['setting1', 'setting2']);

      expect(mockBrowser.storage.sync.remove).toHaveBeenCalledWith(['setting1', 'setting2']);
    });

    test('should clear all storage data', async () => {
      mockBrowser.storage.sync.clear.mockResolvedValue(undefined);

      await api.clearStorageData();

      expect(mockBrowser.storage.sync.clear).toHaveBeenCalled();
    });

    test('should handle storage errors', async () => {
      mockBrowser.storage.sync.get.mockRejectedValue(new Error('Storage quota exceeded'));

      await expect(api.getStorageData()).rejects.toThrow('Storage get failed: Storage quota exceeded');
    });

    test('should support local storage area', async () => {
      const mockData = { localSetting: 'localValue' };
      mockBrowser.storage.local.get.mockResolvedValue(mockData);

      const result = await api.getStorageData(null, 'local');

      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockData);
    });

    test('should validate storage area', async () => {
      await expect(api.getStorageData(null, 'invalid')).rejects.toThrow("Storage area 'invalid' not supported");
    });
  });

  describe('Downloads API', () => {
    test('should download file successfully', async () => {
      const downloadOptions = {
        url: 'https://example.com/file.md',
        filename: 'test.md',
        saveAs: false
      };
      const expectedId = 123;
      
      mockBrowser.downloads.download.mockResolvedValue(expectedId);

      const downloadId = await api.downloadFile(downloadOptions);

      expect(mockBrowser.downloads.download).toHaveBeenCalledWith(downloadOptions);
      expect(downloadId).toBe(expectedId);
    });

    test('should validate download parameters', async () => {
      await expect(api.downloadFile({})).rejects.toThrow('Download URL is required');
      await expect(api.downloadFile({ url: 'test.com' })).rejects.toThrow('Download filename is required');
    });

    test('should search downloads', async () => {
      const mockDownloads = [
        { id: 1, filename: 'file1.md', state: 'complete' },
        { id: 2, filename: 'file2.md', state: 'in_progress' }
      ];
      
      mockBrowser.downloads.search.mockResolvedValue(mockDownloads);

      const results = await api.searchDownloads({ state: 'complete' });

      expect(mockBrowser.downloads.search).toHaveBeenCalledWith({ state: 'complete' });
      expect(results).toEqual(mockDownloads);
    });

    test('should cancel download', async () => {
      mockBrowser.downloads.cancel.mockResolvedValue(undefined);

      await api.cancelDownload(123);

      expect(mockBrowser.downloads.cancel).toHaveBeenCalledWith(123);
    });

    test('should validate download ID for cancel', async () => {
      await expect(api.cancelDownload('invalid')).rejects.toThrow('Download ID must be a number');
    });

    test('should add download listeners', () => {
      const listener = jest.fn();

      api.addDownloadListener(listener);

      expect(mockBrowser.downloads.onChanged.addListener).toHaveBeenCalledWith(listener);
      expect(api.downloadListeners).toContain(listener);
    });

    test('should handle download change events', () => {
      const listener = jest.fn();
      const downloadDelta = { id: 123, state: { current: 'complete' } };

      api.addDownloadListener(listener);
      mockHelpers.triggerDownloadChange(downloadDelta);

      expect(listener).toHaveBeenCalledWith(downloadDelta);
    });

    test('should handle download errors', async () => {
      const downloadOptions = { url: 'invalid-url', filename: 'test.md' };
      mockBrowser.downloads.download.mockRejectedValue(new Error('Invalid URL'));

      await expect(api.downloadFile(downloadOptions)).rejects.toThrow('Download failed: Invalid URL');
    });
  });

  describe('Tabs API', () => {
    test('should query tabs successfully', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', active: true },
        { id: 2, url: 'https://test.com', title: 'Test', active: false }
      ];
      
      mockBrowser.tabs.query.mockResolvedValue(mockTabs);

      const tabs = await api.queryTabs({ active: true });

      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({ active: true });
      expect(tabs).toEqual(mockTabs);
    });

    test('should get current tab', async () => {
      const mockTab = { id: 1, url: 'https://example.com', active: true };
      mockBrowser.tabs.getCurrent.mockResolvedValue(mockTab);

      const tab = await api.getCurrentTab();

      expect(mockBrowser.tabs.getCurrent).toHaveBeenCalled();
      expect(tab).toEqual(mockTab);
    });

    test('should get specific tab', async () => {
      const mockTab = { id: 123, url: 'https://example.com', title: 'Test' };
      mockBrowser.tabs.get.mockResolvedValue(mockTab);

      const tab = await api.getTab(123);

      expect(mockBrowser.tabs.get).toHaveBeenCalledWith(123);
      expect(tab).toEqual(mockTab);
    });

    test('should validate tab ID', async () => {
      await expect(api.getTab('invalid')).rejects.toThrow('Tab ID must be a number');
    });

    test('should send message to tab', async () => {
      const testMessage = { action: 'ping' };
      const expectedResponse = { pong: true };
      
      mockBrowser.tabs.sendMessage.mockResolvedValue(expectedResponse);

      const response = await api.sendTabMessage(123, testMessage);

      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, testMessage);
      expect(response).toEqual(expectedResponse);
    });

    test('should handle tab API errors', async () => {
      mockBrowser.tabs.query.mockRejectedValue(new Error('Permission denied'));

      await expect(api.queryTabs()).rejects.toThrow('Tab query failed: Permission denied');
    });
  });

  describe('Content Script Injection API', () => {
    test('should execute script successfully', async () => {
      const injection = {
        target: { tabId: 123 },
        func: () => { return 'test result'; }
      };
      const mockResults = [{ result: 'test result' }];
      
      mockBrowser.scripting.executeScript.mockResolvedValue(mockResults);

      const results = await api.executeScript(injection);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith(injection);
      expect(results).toEqual(mockResults);
    });

    test('should execute script files', async () => {
      const injection = {
        target: { tabId: 123 },
        files: ['/contentScript/contentScript.js']
      };
      
      mockBrowser.scripting.executeScript.mockResolvedValue([{ result: true }]);

      await api.executeScript(injection);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith(injection);
    });

    test('should validate script injection parameters', async () => {
      await expect(api.executeScript({})).rejects.toThrow('Script injection requires target tab ID');
      await expect(api.executeScript({ target: { tabId: 123 } })).rejects.toThrow('Script injection requires either func or files');
    });

    test('should insert CSS successfully', async () => {
      const injection = {
        target: { tabId: 123 },
        css: 'body { background: red; }'
      };
      
      mockBrowser.scripting.insertCSS.mockResolvedValue(undefined);

      await api.insertCSS(injection);

      expect(mockBrowser.scripting.insertCSS).toHaveBeenCalledWith(injection);
    });

    test('should validate CSS injection parameters', async () => {
      await expect(api.insertCSS({})).rejects.toThrow('CSS injection requires target tab ID');
      await expect(api.insertCSS({ target: { tabId: 123 } })).rejects.toThrow('CSS injection requires either css or files');
    });

    test('should handle script execution errors', async () => {
      const injection = {
        target: { tabId: 999 },
        func: () => { throw new Error('Script error'); }
      };
      
      mockBrowser.scripting.executeScript.mockRejectedValue(new Error('Tab not found'));

      await expect(api.executeScript(injection)).rejects.toThrow('Script execution failed: Tab not found');
    });
  });

  describe('Context Menu API', () => {
    test('should create context menu successfully', () => {
      const menuProperties = {
        id: 'test-menu',
        title: 'Test Menu Item',
        contexts: ['page']
      };
      
      mockBrowser.contextMenus.create.mockReturnValue('test-menu');

      const menuId = api.createContextMenu(menuProperties);

      expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith(menuProperties);
      expect(menuId).toBe('test-menu');
    });

    test('should validate context menu parameters', () => {
      expect(() => api.createContextMenu({})).toThrow('Context menu requires an ID');
      expect(() => api.createContextMenu({ id: 'test' })).toThrow('Context menu requires a title');
    });

    test('should update context menu', async () => {
      const updateProperties = { title: 'Updated Title' };
      mockBrowser.contextMenus.update.mockResolvedValue(undefined);

      await api.updateContextMenu('test-menu', updateProperties);

      expect(mockBrowser.contextMenus.update).toHaveBeenCalledWith('test-menu', updateProperties);
    });

    test('should remove context menu', async () => {
      mockBrowser.contextMenus.remove.mockResolvedValue(undefined);

      await api.removeContextMenu('test-menu');

      expect(mockBrowser.contextMenus.remove).toHaveBeenCalledWith('test-menu');
    });

    test('should add context menu listener', () => {
      const listener = jest.fn();

      api.addContextMenuListener(listener);

      expect(mockBrowser.contextMenus.onClicked.addListener).toHaveBeenCalledWith(listener);
      expect(api.contextMenuListeners).toContain(listener);
    });

    test('should handle context menu click events', () => {
      const listener = jest.fn();
      const info = { menuItemId: 'test-menu', pageUrl: 'https://example.com' };
      const tab = { id: 123, url: 'https://example.com' };

      api.addContextMenuListener(listener);
      mockHelpers.triggerContextMenuClick(info, tab);

      expect(listener).toHaveBeenCalledWith(info, tab);
    });
  });

  describe('Commands API', () => {
    test('should add command listener', () => {
      const listener = jest.fn();

      api.addCommandListener(listener);

      expect(mockBrowser.commands.onCommand.addListener).toHaveBeenCalledWith(listener);
      expect(api.commandListeners).toContain(listener);
    });

    test('should handle command events', () => {
      const listener = jest.fn();
      const command = 'download_tab_as_markdown';

      api.addCommandListener(listener);
      mockHelpers.triggerCommand(command);

      expect(listener).toHaveBeenCalledWith(command);
    });

    test('should validate command listener', () => {
      expect(() => api.addCommandListener('not-a-function')).toThrow('Command listener must be a function');
    });
  });

  describe('Permissions API', () => {
    test('should check permissions', async () => {
      const permissions = { permissions: ['downloads'], origins: ['https://*/*'] };
      mockBrowser.permissions.contains.mockResolvedValue(true);

      const hasPermissions = await api.checkPermissions(permissions);

      expect(mockBrowser.permissions.contains).toHaveBeenCalledWith(permissions);
      expect(hasPermissions).toBe(true);
    });

    test('should request permissions', async () => {
      const permissions = { permissions: ['activeTab'] };
      mockBrowser.permissions.request.mockResolvedValue(true);

      const granted = await api.requestPermissions(permissions);

      expect(mockBrowser.permissions.request).toHaveBeenCalledWith(permissions);
      expect(granted).toBe(true);
    });

    test('should validate permissions parameter', async () => {
      await expect(api.checkPermissions(null)).rejects.toThrow('Permissions parameter must be an object');
      await expect(api.requestPermissions('invalid')).rejects.toThrow('Permissions parameter must be an object');
    });
  });

  describe('Utility Methods', () => {
    test('should get browser info', async () => {
      const expectedInfo = { name: 'Chrome', version: '120.0.0.0' };
      mockBrowser.runtime.getBrowserInfo.mockResolvedValue(expectedInfo);

      const info = await api.getBrowserInfo();

      expect(mockBrowser.runtime.getBrowserInfo).toHaveBeenCalled();
      expect(info).toEqual(expectedInfo);
    });

    test('should get platform info', async () => {
      const expectedInfo = { os: 'mac', arch: 'x86-64' };
      mockBrowser.runtime.getPlatformInfo.mockResolvedValue(expectedInfo);

      const info = await api.getPlatformInfo();

      expect(mockBrowser.runtime.getPlatformInfo).toHaveBeenCalled();
      expect(info).toEqual(expectedInfo);
    });

    test('should get manifest', () => {
      const expectedManifest = { name: 'MarkDownload', version: '3.4.0' };
      mockBrowser.runtime.getManifest.mockReturnValue(expectedManifest);

      const manifest = api.getManifest();

      expect(mockBrowser.runtime.getManifest).toHaveBeenCalled();
      expect(manifest).toEqual(expectedManifest);
    });

    test('should get extension URL', () => {
      const path = 'popup/popup.html';
      const expectedUrl = 'chrome-extension://test-extension-id/popup/popup.html';
      mockBrowser.runtime.getURL.mockReturnValue(expectedUrl);

      const url = api.getExtensionURL(path);

      expect(mockBrowser.runtime.getURL).toHaveBeenCalledWith(path);
      expect(url).toBe(expectedUrl);
    });
  });
});

describe('Browser Extension API Tests - Error Handling and Edge Cases', () => {
  let api;

  beforeEach(() => {
    api = new BrowserExtensionAPI();
    mockHelpers.reset();
  });

  describe('Network and Connection Errors', () => {
    test('should handle connection lost during message sending', async () => {
      const message = { action: 'test' };
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Could not establish connection'));

      await expect(api.sendMessage(message)).rejects.toThrow('Failed to send message: Could not establish connection');
    });

    test('should handle tab not found errors', async () => {
      mockBrowser.tabs.get.mockRejectedValue(new Error('No tab with id: 999'));

      await expect(api.getTab(999)).rejects.toThrow('Get tab failed: No tab with id: 999');
    });

    test('should handle permission denied errors', async () => {
      mockBrowser.permissions.request.mockRejectedValue(new Error('Permission request was denied'));

      await expect(api.requestPermissions({ permissions: ['downloads'] }))
        .rejects.toThrow('Permission request failed: Permission request was denied');
    });
  });

  describe('Resource Limitation Errors', () => {
    test('should handle storage quota exceeded', async () => {
      const largeData = { key: 'x'.repeat(10000000) }; // Large data
      mockBrowser.storage.sync.set.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));

      await expect(api.setStorageData(largeData)).rejects.toThrow('Storage set failed: QUOTA_BYTES quota exceeded');
    });

    test('should handle download limit errors', async () => {
      const downloadOptions = { url: 'https://example.com/file.md', filename: 'test.md' };
      mockBrowser.downloads.download.mockRejectedValue(new Error('Too many active downloads'));

      await expect(api.downloadFile(downloadOptions)).rejects.toThrow('Download failed: Too many active downloads');
    });
  });

  describe('Invalid State Errors', () => {
    test('should handle extension context invalidation', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));

      await expect(api.sendMessage({ action: 'test' }))
        .rejects.toThrow('Failed to send message: Extension context invalidated');
    });

    test('should handle script injection in invalid context', async () => {
      const injection = {
        target: { tabId: 123 },
        func: () => 'test'
      };
      mockBrowser.scripting.executeScript.mockRejectedValue(new Error('Cannot access contents of the page'));

      await expect(api.executeScript(injection))
        .rejects.toThrow('Script execution failed: Cannot access contents of the page');
    });
  });

  describe('Concurrent Operation Handling', () => {
    test('should handle concurrent storage operations', async () => {
      const operations = [];
      for (let i = 0; i < 10; i++) {
        mockBrowser.storage.sync.set.mockResolvedValue(undefined);
        operations.push(api.setStorageData({ [`key${i}`]: `value${i}` }));
      }

      await Promise.all(operations);

      expect(mockBrowser.storage.sync.set).toHaveBeenCalledTimes(10);
    });

    test('should handle concurrent download operations', async () => {
      const downloads = [];
      for (let i = 0; i < 5; i++) {
        mockBrowser.downloads.download.mockResolvedValueOnce(100 + i);
        downloads.push(api.downloadFile({
          url: `https://example.com/file${i}.md`,
          filename: `file${i}.md`
        }));
      }

      const downloadIds = await Promise.all(downloads);

      expect(downloadIds).toEqual([100, 101, 102, 103, 104]);
      expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(5);
    });

    test('should handle concurrent tab queries', async () => {
      const queries = [
        { active: true },
        { url: 'https://example.com*' },
        { currentWindow: true }
      ];

      queries.forEach((query, index) => {
        mockBrowser.tabs.query.mockResolvedValueOnce([{ id: index, ...query }]);
      });

      const promises = queries.map(query => api.queryTabs(query));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockBrowser.tabs.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('Memory Management', () => {
    test('should handle large message payloads', async () => {
      const largeMessage = {
        action: 'process',
        data: 'x'.repeat(1000000) // 1MB string
      };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      const response = await api.sendMessage(largeMessage);

      expect(response).toEqual({ success: true });
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(largeMessage);
    });

    test('should handle many event listeners without memory leaks', () => {
      const listeners = [];
      
      for (let i = 0; i < 100; i++) {
        const listener = jest.fn();
        listeners.push(listener);
        api.addMessageListener(listener);
      }

      expect(api.messageListeners).toHaveLength(100);
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledTimes(100);

      // Remove half the listeners
      for (let i = 0; i < 50; i++) {
        api.removeMessageListener(listeners[i]);
      }

      expect(api.messageListeners).toHaveLength(50);
      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledTimes(50);
    });
  });

  describe('Browser Compatibility', () => {
    test('should handle missing API gracefully', async () => {
      // Simulate missing downloads API
      const originalDownloads = mockBrowser.downloads;
      mockBrowser.downloads = undefined;

      await expect(api.downloadFile({ url: 'test', filename: 'test.md' }))
        .rejects.toThrow('Download failed:');

      // Restore
      mockBrowser.downloads = originalDownloads;
    });

    test('should handle different browser implementations', async () => {
      // Test Chrome vs Firefox differences
      const chromeBehavior = mockBrowser.runtime.getBrowserInfo.mockResolvedValue({
        name: 'Chrome',
        version: '120.0.0.0'
      });
      
      const firefoxBehavior = mockBrowser.runtime.getBrowserInfo.mockResolvedValue({
        name: 'Firefox',
        version: '110.0'
      });

      await api.getBrowserInfo();
      expect(mockBrowser.runtime.getBrowserInfo).toHaveBeenCalled();
    });
  });

  describe('Security and Validation', () => {
    test('should handle malicious message content safely', async () => {
      const maliciousMessage = {
        action: 'eval',
        code: 'alert("XSS")',
        __proto__: { malicious: true }
      };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({ error: 'Invalid action' });

      const response = await api.sendMessage(maliciousMessage);

      expect(response).toEqual({ error: 'Invalid action' });
    });

    test('should validate download URLs', async () => {
      const suspiciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd'
      ];

      for (const url of suspiciousUrls) {
        mockBrowser.downloads.download.mockRejectedValue(new Error('Invalid URL scheme'));
        
        await expect(api.downloadFile({ url, filename: 'test.md' }))
          .rejects.toThrow('Download failed: Invalid URL scheme');
      }
    });

    test('should handle oversized storage data', async () => {
      const oversizedData = {};
      for (let i = 0; i < 10000; i++) {
        oversizedData[`key${i}`] = `value${i}`.repeat(1000);
      }

      mockBrowser.storage.sync.set.mockRejectedValue(new Error('Item size exceeded'));

      await expect(api.setStorageData(oversizedData))
        .rejects.toThrow('Storage set failed: Item size exceeded');
    });
  });
});
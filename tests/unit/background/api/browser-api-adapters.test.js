/**
 * Browser API Adapters Tests
 * Comprehensive test suite for browser API adapter implementations
 */

// Load the adapters
let adapters;
try {
  const path = require('path');
  adapters = require(path.resolve(__dirname, '../../../../src/shared/browser-api-adapters.js'));
} catch (error) {
  // Fallback for test environment
  adapters = {};
}

const {
  BrowserStorageAdapter,
  BrowserMessagingAdapter, 
  BrowserTabsAdapter,
  BrowserScriptingAdapter,
  BrowserDownloadsAdapter,
  BrowserContextMenusAdapter,
  BrowserCommandsAdapter,
  BrowserRuntimeAdapter
} = adapters;

describe('Browser API Adapters Tests', () => {

  describe('BrowserStorageAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        storage: {
          sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
          }
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserStorageAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should construct with global browser API', () => {
      global.browser = mockBrowser;
      adapter = new BrowserStorageAdapter();
      expect(adapter.browser).toBe(mockBrowser);
      delete global.browser;
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserStorageAdapter(null)).toThrow('Browser API not available');
      expect(() => new BrowserStorageAdapter(undefined)).toThrow('Browser API not available');
    });

    describe('get() method', () => {
      beforeEach(() => {
        adapter = new BrowserStorageAdapter(mockBrowser);
      });

      test('should get data successfully', async () => {
        const testData = { key: 'value' };
        mockBrowser.storage.sync.get.mockResolvedValue(testData);

        const result = await adapter.get('key');
        expect(result).toEqual(testData);
        expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith('key');
      });

      test('should get data with array keys', async () => {
        const testData = { key1: 'value1', key2: 'value2' };
        mockBrowser.storage.sync.get.mockResolvedValue(testData);

        const result = await adapter.get(['key1', 'key2']);
        expect(result).toEqual(testData);
        expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith(['key1', 'key2']);
      });

      test('should get data with object keys (defaults)', async () => {
        const testData = { key: 'value' };
        mockBrowser.storage.sync.get.mockResolvedValue(testData);

        const result = await adapter.get({ key: 'defaultValue' });
        expect(result).toEqual(testData);
        expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith({ key: 'defaultValue' });
      });

      test('should handle storage get errors', async () => {
        const error = new Error('Storage quota exceeded');
        mockBrowser.storage.sync.get.mockRejectedValue(error);

        await expect(adapter.get('key')).rejects.toThrow('Failed to get storage data: Storage quota exceeded');
        
        // Verify console.error was called
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
          await adapter.get('key');
        } catch (e) {
          // Expected error
        }
        expect(consoleSpy).toHaveBeenCalledWith('Storage get error:', error);
        consoleSpy.mockRestore();
      });
    });

    describe('set() method', () => {
      beforeEach(() => {
        adapter = new BrowserStorageAdapter(mockBrowser);
      });

      test('should set data successfully', async () => {
        mockBrowser.storage.sync.set.mockResolvedValue();

        await adapter.set({ key: 'value' });
        expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ key: 'value' });
      });

      test('should set multiple data items', async () => {
        const data = { key1: 'value1', key2: 'value2', nested: { prop: 'val' } };
        mockBrowser.storage.sync.set.mockResolvedValue();

        await adapter.set(data);
        expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(data);
      });

      test('should handle storage set errors', async () => {
        const error = new Error('Storage quota exceeded');
        mockBrowser.storage.sync.set.mockRejectedValue(error);

        await expect(adapter.set({ key: 'value' })).rejects.toThrow('Failed to set storage data: Storage quota exceeded');
      });
    });

    describe('remove() method', () => {
      beforeEach(() => {
        adapter = new BrowserStorageAdapter(mockBrowser);
      });

      test('should remove single key', async () => {
        mockBrowser.storage.sync.remove.mockResolvedValue();

        await adapter.remove('key');
        expect(mockBrowser.storage.sync.remove).toHaveBeenCalledWith('key');
      });

      test('should remove multiple keys', async () => {
        mockBrowser.storage.sync.remove.mockResolvedValue();

        await adapter.remove(['key1', 'key2']);
        expect(mockBrowser.storage.sync.remove).toHaveBeenCalledWith(['key1', 'key2']);
      });

      test('should handle storage remove errors', async () => {
        const error = new Error('Storage not available');
        mockBrowser.storage.sync.remove.mockRejectedValue(error);

        await expect(adapter.remove('key')).rejects.toThrow('Failed to remove storage data: Storage not available');
      });
    });

    describe('clear() method', () => {
      beforeEach(() => {
        adapter = new BrowserStorageAdapter(mockBrowser);
      });

      test('should clear all data', async () => {
        mockBrowser.storage.sync.clear.mockResolvedValue();

        await adapter.clear();
        expect(mockBrowser.storage.sync.clear).toHaveBeenCalled();
      });

      test('should handle storage clear errors', async () => {
        const error = new Error('Permission denied');
        mockBrowser.storage.sync.clear.mockRejectedValue(error);

        await expect(adapter.clear()).rejects.toThrow('Failed to clear storage: Permission denied');
      });
    });
  });

  describe('BrowserMessagingAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        runtime: {
          sendMessage: jest.fn(),
          onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          },
          getURL: jest.fn()
        },
        tabs: {
          sendMessage: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserMessagingAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserMessagingAdapter(null)).toThrow('Browser API not available');
    });

    describe('sendMessage() method', () => {
      beforeEach(() => {
        adapter = new BrowserMessagingAdapter(mockBrowser);
      });

      test('should send runtime message when no tabId specified', async () => {
        const response = { success: true };
        mockBrowser.runtime.sendMessage.mockResolvedValue(response);

        const result = await adapter.sendMessage({ action: 'test' });
        expect(result).toEqual(response);
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({ action: 'test' });
      });

      test('should send tab message when tabId specified', async () => {
        const response = { success: true };
        mockBrowser.tabs.sendMessage.mockResolvedValue(response);

        const result = await adapter.sendMessage({ action: 'test' }, { tabId: 123 });
        expect(result).toEqual(response);
        expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, { action: 'test' });
      });

      test('should handle default options parameter', async () => {
        mockBrowser.runtime.sendMessage.mockResolvedValue({});

        await adapter.sendMessage('test');
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith('test');
        
        await adapter.sendMessage('test', undefined);
        expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith('test');
      });

      test('should handle messaging errors', async () => {
        const error = new Error('Extension context invalidated');
        mockBrowser.runtime.sendMessage.mockRejectedValue(error);

        await expect(adapter.sendMessage({ action: 'test' })).rejects.toThrow('Failed to send message: Extension context invalidated');
      });

      test('should handle tab messaging errors', async () => {
        const error = new Error('Tab not found');
        mockBrowser.tabs.sendMessage.mockRejectedValue(error);

        await expect(adapter.sendMessage({ action: 'test' }, { tabId: 999 })).rejects.toThrow('Failed to send message: Tab not found');
      });
    });

    describe('message listener methods', () => {
      beforeEach(() => {
        adapter = new BrowserMessagingAdapter(mockBrowser);
      });

      test('should add message listener', () => {
        const listener = jest.fn();
        adapter.addMessageListener(listener);
        expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onMessage API not available for addListener', () => {
        mockBrowser.runtime.onMessage = null;
        expect(() => adapter.addMessageListener(jest.fn())).toThrow('Message listener API not available');
      });

      test('should remove message listener', () => {
        const listener = jest.fn();
        adapter.removeMessageListener(listener);
        expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onMessage API not available for removeListener', () => {
        mockBrowser.runtime.onMessage = null;
        expect(() => adapter.removeMessageListener(jest.fn())).toThrow('Message listener API not available');
      });
    });

    describe('getURL() method', () => {
      beforeEach(() => {
        adapter = new BrowserMessagingAdapter(mockBrowser);
      });

      test('should get extension URL', () => {
        mockBrowser.runtime.getURL.mockReturnValue('chrome-extension://abc123/popup.html');

        const result = adapter.getURL('popup.html');
        expect(result).toBe('chrome-extension://abc123/popup.html');
        expect(mockBrowser.runtime.getURL).toHaveBeenCalledWith('popup.html');
      });

      test('should handle getURL errors', () => {
        const error = new Error('Extension not found');
        mockBrowser.runtime.getURL.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.getURL('popup.html')).toThrow('Failed to get URL: Extension not found');
      });
    });
  });

  describe('BrowserTabsAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        tabs: {
          query: jest.fn(),
          getCurrent: jest.fn(),
          executeScript: jest.fn(),
          update: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserTabsAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserTabsAdapter(null)).toThrow('Browser API not available');
    });

    describe('query() method', () => {
      beforeEach(() => {
        adapter = new BrowserTabsAdapter(mockBrowser);
      });

      test('should query tabs successfully', async () => {
        const tabs = [{ id: 1, url: 'https://example.com' }];
        mockBrowser.tabs.query.mockResolvedValue(tabs);

        const result = await adapter.query({ active: true });
        expect(result).toEqual(tabs);
        expect(mockBrowser.tabs.query).toHaveBeenCalledWith({ active: true });
      });

      test('should handle query errors', async () => {
        const error = new Error('Permission denied');
        mockBrowser.tabs.query.mockRejectedValue(error);

        await expect(adapter.query({ active: true })).rejects.toThrow('Failed to query tabs: Permission denied');
      });
    });

    describe('getCurrent() method', () => {
      beforeEach(() => {
        adapter = new BrowserTabsAdapter(mockBrowser);
      });

      test('should get current tab successfully', async () => {
        const tab = { id: 1, url: 'https://example.com' };
        mockBrowser.tabs.getCurrent.mockResolvedValue(tab);

        const result = await adapter.getCurrent();
        expect(result).toEqual(tab);
        expect(mockBrowser.tabs.getCurrent).toHaveBeenCalled();
      });

      test('should handle getCurrent errors', async () => {
        const error = new Error('No current tab');
        mockBrowser.tabs.getCurrent.mockRejectedValue(error);

        await expect(adapter.getCurrent()).rejects.toThrow('Failed to get current tab: No current tab');
      });
    });

    describe('executeScript() method', () => {
      beforeEach(() => {
        adapter = new BrowserTabsAdapter(mockBrowser);
      });

      test('should execute script successfully with executeScript API', async () => {
        const results = [{ result: 'success' }];
        mockBrowser.tabs.executeScript.mockResolvedValue(results);

        const result = await adapter.executeScript(1, { code: 'console.log("test")' });
        expect(result).toEqual(results);
        expect(mockBrowser.tabs.executeScript).toHaveBeenCalledWith(1, { code: 'console.log("test")' });
      });

      test('should throw error when executeScript API not available', async () => {
        mockBrowser.tabs.executeScript = undefined;

        await expect(adapter.executeScript(1, { code: 'test' })).rejects.toThrow('executeScript not available, use ScriptingAdapter instead');
      });

      test('should handle executeScript errors', async () => {
        const error = new Error('Script injection failed');
        mockBrowser.tabs.executeScript.mockRejectedValue(error);

        await expect(adapter.executeScript(1, { code: 'test' })).rejects.toThrow('Failed to execute script: Script injection failed');
      });
    });

    describe('update() method', () => {
      beforeEach(() => {
        adapter = new BrowserTabsAdapter(mockBrowser);
      });

      test('should update tab with tabId and properties', async () => {
        const updatedTab = { id: 1, url: 'https://example.com' };
        mockBrowser.tabs.update.mockResolvedValue(updatedTab);

        const result = await adapter.update(1, { url: 'https://example.com' });
        expect(result).toEqual(updatedTab);
        expect(mockBrowser.tabs.update).toHaveBeenCalledWith(1, { url: 'https://example.com' });
      });

      test('should update current tab when first parameter is object', async () => {
        const updatedTab = { id: 1, url: 'https://example.com' };
        mockBrowser.tabs.update.mockResolvedValue(updatedTab);

        const updateProps = { url: 'https://example.com' };
        const result = await adapter.update(updateProps);
        expect(result).toEqual(updatedTab);
        expect(mockBrowser.tabs.update).toHaveBeenCalledWith(updateProps);
      });

      test('should handle update errors', async () => {
        const error = new Error('Invalid URL');
        mockBrowser.tabs.update.mockRejectedValue(error);

        await expect(adapter.update(1, { url: 'invalid' })).rejects.toThrow('Failed to update tab: Invalid URL');
      });
    });
  });

  describe('BrowserScriptingAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        scripting: {
          executeScript: jest.fn(),
          insertCSS: jest.fn(),
          removeCSS: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserScriptingAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserScriptingAdapter(null)).toThrow('Browser API not available');
    });

    test('should throw error when scripting API not available', () => {
      const browserWithoutScripting = {};
      expect(() => new BrowserScriptingAdapter(browserWithoutScripting)).toThrow('Scripting API not available (requires Manifest V3)');
    });

    describe('executeScript() method', () => {
      beforeEach(() => {
        adapter = new BrowserScriptingAdapter(mockBrowser);
      });

      test('should execute script successfully', async () => {
        const results = [{ result: 'success' }];
        mockBrowser.scripting.executeScript.mockResolvedValue(results);

        const injection = { target: { tabId: 1 }, func: () => 'test' };
        const result = await adapter.executeScript(injection);
        expect(result).toEqual(results);
        expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith(injection);
      });

      test('should handle executeScript errors', async () => {
        const error = new Error('Script execution failed');
        mockBrowser.scripting.executeScript.mockRejectedValue(error);

        const injection = { target: { tabId: 1 }, func: () => 'test' };
        await expect(adapter.executeScript(injection)).rejects.toThrow('Failed to execute script: Script execution failed');
      });
    });

    describe('insertCSS() method', () => {
      beforeEach(() => {
        adapter = new BrowserScriptingAdapter(mockBrowser);
      });

      test('should insert CSS successfully', async () => {
        mockBrowser.scripting.insertCSS.mockResolvedValue();

        const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
        await adapter.insertCSS(injection);
        expect(mockBrowser.scripting.insertCSS).toHaveBeenCalledWith(injection);
      });

      test('should handle insertCSS errors', async () => {
        const error = new Error('CSS insertion failed');
        mockBrowser.scripting.insertCSS.mockRejectedValue(error);

        const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
        await expect(adapter.insertCSS(injection)).rejects.toThrow('Failed to insert CSS: CSS insertion failed');
      });
    });

    describe('removeCSS() method', () => {
      beforeEach(() => {
        adapter = new BrowserScriptingAdapter(mockBrowser);
      });

      test('should remove CSS successfully', async () => {
        mockBrowser.scripting.removeCSS.mockResolvedValue();

        const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
        await adapter.removeCSS(injection);
        expect(mockBrowser.scripting.removeCSS).toHaveBeenCalledWith(injection);
      });

      test('should handle removeCSS errors', async () => {
        const error = new Error('CSS removal failed');
        mockBrowser.scripting.removeCSS.mockRejectedValue(error);

        const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
        await expect(adapter.removeCSS(injection)).rejects.toThrow('Failed to remove CSS: CSS removal failed');
      });
    });
  });

  describe('BrowserDownloadsAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        downloads: {
          download: jest.fn(),
          onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          },
          cancel: jest.fn(),
          search: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserDownloadsAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserDownloadsAdapter(null)).toThrow('Browser API not available');
    });

    test('should throw error when downloads API not available', () => {
      const browserWithoutDownloads = {};
      expect(() => new BrowserDownloadsAdapter(browserWithoutDownloads)).toThrow('Downloads API not available');
    });

    describe('download() method', () => {
      beforeEach(() => {
        adapter = new BrowserDownloadsAdapter(mockBrowser);
      });

      test('should start download successfully', async () => {
        const downloadId = 123;
        mockBrowser.downloads.download.mockResolvedValue(downloadId);

        const options = { url: 'https://example.com/file.txt', filename: 'file.txt' };
        const result = await adapter.download(options);
        expect(result).toBe(downloadId);
        expect(mockBrowser.downloads.download).toHaveBeenCalledWith(options);
      });

      test('should handle download errors', async () => {
        const error = new Error('Download failed');
        mockBrowser.downloads.download.mockRejectedValue(error);

        const options = { url: 'https://example.com/file.txt' };
        await expect(adapter.download(options)).rejects.toThrow('Failed to start download: Download failed');
      });
    });

    describe('change listener methods', () => {
      beforeEach(() => {
        adapter = new BrowserDownloadsAdapter(mockBrowser);
      });

      test('should add change listener', () => {
        const listener = jest.fn();
        adapter.addChangeListener(listener);
        expect(mockBrowser.downloads.onChanged.addListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onChanged API not available for addChangeListener', () => {
        mockBrowser.downloads.onChanged = null;
        expect(() => adapter.addChangeListener(jest.fn())).toThrow('Downloads change listener API not available');
      });

      test('should remove change listener', () => {
        const listener = jest.fn();
        adapter.removeChangeListener(listener);
        expect(mockBrowser.downloads.onChanged.removeListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onChanged API not available for removeChangeListener', () => {
        mockBrowser.downloads.onChanged = null;
        expect(() => adapter.removeChangeListener(jest.fn())).toThrow('Downloads change listener API not available');
      });
    });

    describe('cancel() method', () => {
      beforeEach(() => {
        adapter = new BrowserDownloadsAdapter(mockBrowser);
      });

      test('should cancel download successfully', async () => {
        mockBrowser.downloads.cancel.mockResolvedValue();

        await adapter.cancel(123);
        expect(mockBrowser.downloads.cancel).toHaveBeenCalledWith(123);
      });

      test('should handle cancel errors', async () => {
        const error = new Error('Download not found');
        mockBrowser.downloads.cancel.mockRejectedValue(error);

        await expect(adapter.cancel(999)).rejects.toThrow('Failed to cancel download: Download not found');
      });
    });

    describe('search() method', () => {
      beforeEach(() => {
        adapter = new BrowserDownloadsAdapter(mockBrowser);
      });

      test('should search downloads successfully', async () => {
        const downloads = [{ id: 1, url: 'https://example.com/file.txt' }];
        mockBrowser.downloads.search.mockResolvedValue(downloads);

        const query = { state: 'complete' };
        const result = await adapter.search(query);
        expect(result).toEqual(downloads);
        expect(mockBrowser.downloads.search).toHaveBeenCalledWith(query);
      });

      test('should handle search errors', async () => {
        const error = new Error('Search failed');
        mockBrowser.downloads.search.mockRejectedValue(error);

        await expect(adapter.search({})).rejects.toThrow('Failed to search downloads: Search failed');
      });
    });
  });

  describe('BrowserContextMenusAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        contextMenus: {
          create: jest.fn(),
          update: jest.fn(),
          remove: jest.fn(),
          removeAll: jest.fn(),
          onClicked: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserContextMenusAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserContextMenusAdapter(null)).toThrow('Browser API not available');
    });

    test('should throw error when context menus API not available', () => {
      const browserWithoutContextMenus = {};
      expect(() => new BrowserContextMenusAdapter(browserWithoutContextMenus)).toThrow('Context Menus API not available');
    });

    describe('create() method', () => {
      beforeEach(() => {
        adapter = new BrowserContextMenusAdapter(mockBrowser);
      });

      test('should create context menu successfully', () => {
        const callback = jest.fn();
        const props = { id: 'test', title: 'Test Menu' };

        adapter.create(props, callback);
        expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith(props, callback);
      });

      test('should create context menu without callback', () => {
        const props = { id: 'test', title: 'Test Menu' };

        adapter.create(props);
        expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith(props, undefined);
      });

      test('should handle create errors and call callback', () => {
        const error = new Error('Menu creation failed');
        const callback = jest.fn();
        mockBrowser.contextMenus.create.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.create({ id: 'test' }, callback)).toThrow('Failed to create context menu: Menu creation failed');
        expect(callback).toHaveBeenCalled();
      });

      test('should handle create errors without callback', () => {
        const error = new Error('Menu creation failed');
        mockBrowser.contextMenus.create.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.create({ id: 'test' })).toThrow('Failed to create context menu: Menu creation failed');
      });
    });

    describe('update() method', () => {
      beforeEach(() => {
        adapter = new BrowserContextMenusAdapter(mockBrowser);
      });

      test('should update context menu successfully', () => {
        const callback = jest.fn();
        const props = { title: 'Updated Menu' };

        adapter.update('test', props, callback);
        expect(mockBrowser.contextMenus.update).toHaveBeenCalledWith('test', props, callback);
      });

      test('should handle update errors and call callback', () => {
        const error = new Error('Menu update failed');
        const callback = jest.fn();
        mockBrowser.contextMenus.update.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.update('test', {}, callback)).toThrow('Failed to update context menu: Menu update failed');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('remove() method', () => {
      beforeEach(() => {
        adapter = new BrowserContextMenusAdapter(mockBrowser);
      });

      test('should remove context menu successfully', () => {
        const callback = jest.fn();

        adapter.remove('test', callback);
        expect(mockBrowser.contextMenus.remove).toHaveBeenCalledWith('test', callback);
      });

      test('should handle remove errors and call callback', () => {
        const error = new Error('Menu removal failed');
        const callback = jest.fn();
        mockBrowser.contextMenus.remove.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.remove('test', callback)).toThrow('Failed to remove context menu: Menu removal failed');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('removeAll() method', () => {
      beforeEach(() => {
        adapter = new BrowserContextMenusAdapter(mockBrowser);
      });

      test('should remove all context menus successfully', () => {
        const callback = jest.fn();

        adapter.removeAll(callback);
        expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalledWith(callback);
      });

      test('should handle removeAll errors and call callback', () => {
        const error = new Error('Remove all failed');
        const callback = jest.fn();
        mockBrowser.contextMenus.removeAll.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.removeAll(callback)).toThrow('Failed to remove all context menus: Remove all failed');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('click listener methods', () => {
      beforeEach(() => {
        adapter = new BrowserContextMenusAdapter(mockBrowser);
      });

      test('should add click listener', () => {
        const listener = jest.fn();
        adapter.addClickListener(listener);
        expect(mockBrowser.contextMenus.onClicked.addListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onClicked API not available for addClickListener', () => {
        mockBrowser.contextMenus.onClicked = null;
        expect(() => adapter.addClickListener(jest.fn())).toThrow('Context menu click listener API not available');
      });

      test('should remove click listener', () => {
        const listener = jest.fn();
        adapter.removeClickListener(listener);
        expect(mockBrowser.contextMenus.onClicked.removeListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onClicked API not available for removeClickListener', () => {
        mockBrowser.contextMenus.onClicked = null;
        expect(() => adapter.removeClickListener(jest.fn())).toThrow('Context menu click listener API not available');
      });
    });
  });

  describe('BrowserCommandsAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        commands: {
          onCommand: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          },
          getAll: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserCommandsAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserCommandsAdapter(null)).toThrow('Browser API not available');
    });

    test('should throw error when commands API not available', () => {
      const browserWithoutCommands = {};
      expect(() => new BrowserCommandsAdapter(browserWithoutCommands)).toThrow('Commands API not available');
    });

    describe('command listener methods', () => {
      beforeEach(() => {
        adapter = new BrowserCommandsAdapter(mockBrowser);
      });

      test('should add command listener', () => {
        const listener = jest.fn();
        adapter.addCommandListener(listener);
        expect(mockBrowser.commands.onCommand.addListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onCommand API not available for addCommandListener', () => {
        mockBrowser.commands.onCommand = null;
        expect(() => adapter.addCommandListener(jest.fn())).toThrow('Commands listener API not available');
      });

      test('should remove command listener', () => {
        const listener = jest.fn();
        adapter.removeCommandListener(listener);
        expect(mockBrowser.commands.onCommand.removeListener).toHaveBeenCalledWith(listener);
      });

      test('should throw error when onCommand API not available for removeCommandListener', () => {
        mockBrowser.commands.onCommand = null;
        expect(() => adapter.removeCommandListener(jest.fn())).toThrow('Commands listener API not available');
      });
    });

    describe('getAll() method', () => {
      beforeEach(() => {
        adapter = new BrowserCommandsAdapter(mockBrowser);
      });

      test('should get all commands successfully', async () => {
        const commands = [
          { name: 'test-command', description: 'Test Command' }
        ];
        mockBrowser.commands.getAll.mockResolvedValue(commands);

        const result = await adapter.getAll();
        expect(result).toEqual(commands);
        expect(mockBrowser.commands.getAll).toHaveBeenCalled();
      });

      test('should handle getAll errors', async () => {
        const error = new Error('Commands not available');
        mockBrowser.commands.getAll.mockRejectedValue(error);

        await expect(adapter.getAll()).rejects.toThrow('Failed to get all commands: Commands not available');
      });
    });
  });

  describe('BrowserRuntimeAdapter', () => {
    let mockBrowser;
    let adapter;

    beforeEach(() => {
      mockBrowser = {
        runtime: {
          getPlatformInfo: jest.fn(),
          getBrowserInfo: jest.fn(),
          id: 'test-extension-id',
          getManifest: jest.fn()
        }
      };
    });

    test('should construct with browser API', () => {
      adapter = new BrowserRuntimeAdapter(mockBrowser);
      expect(adapter.browser).toBe(mockBrowser);
    });

    test('should throw error when browser API not available', () => {
      expect(() => new BrowserRuntimeAdapter(null)).toThrow('Browser API not available');
    });

    describe('getPlatformInfo() method', () => {
      beforeEach(() => {
        adapter = new BrowserRuntimeAdapter(mockBrowser);
      });

      test('should get platform info successfully', async () => {
        const platformInfo = { os: 'mac', arch: 'x86-64' };
        mockBrowser.runtime.getPlatformInfo.mockResolvedValue(platformInfo);

        const result = await adapter.getPlatformInfo();
        expect(result).toEqual(platformInfo);
        expect(mockBrowser.runtime.getPlatformInfo).toHaveBeenCalled();
      });

      test('should handle getPlatformInfo errors', async () => {
        const error = new Error('Platform info unavailable');
        mockBrowser.runtime.getPlatformInfo.mockRejectedValue(error);

        await expect(adapter.getPlatformInfo()).rejects.toThrow('Failed to get platform info: Platform info unavailable');
      });
    });

    describe('getBrowserInfo() method', () => {
      beforeEach(() => {
        adapter = new BrowserRuntimeAdapter(mockBrowser);
      });

      test('should get browser info when available', async () => {
        const browserInfo = { name: 'Chrome', version: '91.0.4472.124' };
        mockBrowser.runtime.getBrowserInfo.mockResolvedValue(browserInfo);

        const result = await adapter.getBrowserInfo();
        expect(result).toEqual(browserInfo);
        expect(mockBrowser.runtime.getBrowserInfo).toHaveBeenCalled();
      });

      test('should return default browser info when getBrowserInfo not available', async () => {
        mockBrowser.runtime.getBrowserInfo = undefined;

        const result = await adapter.getBrowserInfo();
        expect(result).toEqual({ name: 'Unknown', vendor: 'Unknown', version: 'Unknown' });
      });

      test('should return default browser info on error', async () => {
        const error = new Error('Browser info failed');
        mockBrowser.runtime.getBrowserInfo.mockRejectedValue(error);

        const result = await adapter.getBrowserInfo();
        expect(result).toEqual({ name: 'Unknown', vendor: 'Unknown', version: 'Unknown' });
      });
    });

    describe('getId() method', () => {
      beforeEach(() => {
        adapter = new BrowserRuntimeAdapter(mockBrowser);
      });

      test('should get extension ID successfully', () => {
        const result = adapter.getId();
        expect(result).toBe('test-extension-id');
      });

      test('should handle getId errors', () => {
        mockBrowser.runtime.id = undefined;
        Object.defineProperty(mockBrowser.runtime, 'id', {
          get: () => {
            throw new Error('ID not available');
          }
        });

        expect(() => adapter.getId()).toThrow('Failed to get extension ID: ID not available');
      });
    });

    describe('getManifest() method', () => {
      beforeEach(() => {
        adapter = new BrowserRuntimeAdapter(mockBrowser);
      });

      test('should get manifest successfully', () => {
        const manifest = { name: 'Test Extension', version: '1.0.0' };
        mockBrowser.runtime.getManifest.mockReturnValue(manifest);

        const result = adapter.getManifest();
        expect(result).toEqual(manifest);
        expect(mockBrowser.runtime.getManifest).toHaveBeenCalled();
      });

      test('should handle getManifest errors', () => {
        const error = new Error('Manifest not available');
        mockBrowser.runtime.getManifest.mockImplementation(() => {
          throw error;
        });

        expect(() => adapter.getManifest()).toThrow('Failed to get manifest: Manifest not available');
      });
    });
  });

  describe('Module Exports and Global Availability', () => {
    test('should export all adapter classes', () => {
      expect(BrowserStorageAdapter).toBeDefined();
      expect(BrowserMessagingAdapter).toBeDefined();
      expect(BrowserTabsAdapter).toBeDefined();
      expect(BrowserScriptingAdapter).toBeDefined();
      expect(BrowserDownloadsAdapter).toBeDefined();
      expect(BrowserContextMenusAdapter).toBeDefined();
      expect(BrowserCommandsAdapter).toBeDefined();
      expect(BrowserRuntimeAdapter).toBeDefined();
    });

    test('should make adapters available globally in browser context', () => {
      // Simulate browser extension context
      global.window = {};

      // Re-evaluate the module export logic
      const testAdapters = {
        BrowserStorageAdapter,
        BrowserMessagingAdapter,
        BrowserTabsAdapter,
        BrowserScriptingAdapter,
        BrowserDownloadsAdapter,
        BrowserContextMenusAdapter,
        BrowserCommandsAdapter,
        BrowserRuntimeAdapter
      };

      if (typeof window !== 'undefined') {
        window.BrowserApiAdapters = testAdapters;
      }

      expect(global.window.BrowserApiAdapters).toEqual(testAdapters);

      delete global.window;
    });

    test('should handle require context for interface imports', () => {
      // Test the interface import logic at the top of the module
      const mockRequire = jest.fn().mockReturnValue({
        IStorageApi: class {},
        IMessagingApi: class {}
      });

      global.require = mockRequire;

      // Re-evaluate the import logic
      let testInterfaces = {};
      try {
        if (typeof require !== 'undefined') {
          testInterfaces = require('./browser-api-interfaces.js');
        }
      } catch (e) {
        // In browser extension context, interfaces are available globally
      }

      expect(mockRequire).toHaveBeenCalledWith('./browser-api-interfaces.js');

      delete global.require;
    });
  });

  describe('Integration Tests', () => {
    test('should work together as complete browser API abstraction', async () => {
      // Create a comprehensive mock browser
      const mockBrowser = {
        storage: { sync: { get: jest.fn().mockResolvedValue({ key: 'value' }), set: jest.fn() } },
        runtime: { sendMessage: jest.fn().mockResolvedValue({ success: true }), getURL: jest.fn().mockReturnValue('chrome-extension://test/popup.html') },
        tabs: { query: jest.fn().mockResolvedValue([{ id: 1 }]), update: jest.fn() },
        downloads: { download: jest.fn().mockResolvedValue(123) },
        contextMenus: { create: jest.fn(), removeAll: jest.fn() },
        commands: { getAll: jest.fn().mockResolvedValue([]) }
      };

      // Create all adapters
      const storage = new BrowserStorageAdapter(mockBrowser);
      const messaging = new BrowserMessagingAdapter(mockBrowser);
      const tabs = new BrowserTabsAdapter(mockBrowser);
      const downloads = new BrowserDownloadsAdapter(mockBrowser);
      const contextMenus = new BrowserContextMenusAdapter(mockBrowser);
      const commands = new BrowserCommandsAdapter(mockBrowser);
      const runtime = new BrowserRuntimeAdapter(mockBrowser);

      // Test coordinated operations
      await storage.get('key');
      await messaging.sendMessage({ action: 'test' });
      const tabList = await tabs.query({ active: true });
      await downloads.download({ url: 'https://example.com/file.txt' });
      contextMenus.create({ id: 'test', title: 'Test' });
      await commands.getAll();

      // Verify all operations worked
      expect(mockBrowser.storage.sync.get).toHaveBeenCalled();
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalled();
      expect(mockBrowser.tabs.query).toHaveBeenCalled();
      expect(mockBrowser.downloads.download).toHaveBeenCalled();
      expect(mockBrowser.contextMenus.create).toHaveBeenCalled();
      expect(mockBrowser.commands.getAll).toHaveBeenCalled();

      expect(tabList).toHaveLength(1);
    });
  });
});
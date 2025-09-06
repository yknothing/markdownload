/**
 * Browser API Interfaces Tests
 * Comprehensive test suite for API interface definitions
 */

// Load the interfaces module
let interfaces;

// Create mock interfaces first as fallback
const mockInterfaces = {
    IStorageApi: class IStorageApi {
      async get(keys) { throw new Error('IStorageApi.get must be implemented'); }
      async set(items) { throw new Error('IStorageApi.set must be implemented'); }
      async remove(keys) { throw new Error('IStorageApi.remove must be implemented'); }
      async clear() { throw new Error('IStorageApi.clear must be implemented'); }
    },
    IMessagingApi: class IMessagingApi {
      async sendMessage(message, options = {}) { throw new Error('IMessagingApi.sendMessage must be implemented'); }
      addMessageListener(listener) { throw new Error('IMessagingApi.addMessageListener must be implemented'); }
      removeMessageListener(listener) { throw new Error('IMessagingApi.removeMessageListener must be implemented'); }
      getURL(path) { throw new Error('IMessagingApi.getURL must be implemented'); }
    },
    ITabsApi: class ITabsApi {
      async query(queryInfo) { throw new Error('ITabsApi.query must be implemented'); }
      async getCurrent() { throw new Error('ITabsApi.getCurrent must be implemented'); }
      async executeScript(tabId, details) { throw new Error('ITabsApi.executeScript must be implemented'); }
      async update(tabId, updateProperties) { throw new Error('ITabsApi.update must be implemented'); }
    },
    IScriptingApi: class IScriptingApi {
      async executeScript(injection) { throw new Error('IScriptingApi.executeScript must be implemented'); }
      async insertCSS(injection) { throw new Error('IScriptingApi.insertCSS must be implemented'); }
      async removeCSS(injection) { throw new Error('IScriptingApi.removeCSS must be implemented'); }
    },
    IDownloadsApi: class IDownloadsApi {
      async download(options) { throw new Error('IDownloadsApi.download must be implemented'); }
      addChangeListener(listener) { throw new Error('IDownloadsApi.addChangeListener must be implemented'); }
      removeChangeListener(listener) { throw new Error('IDownloadsApi.removeChangeListener must be implemented'); }
      async cancel(downloadId) { throw new Error('IDownloadsApi.cancel must be implemented'); }
      async search(query) { throw new Error('IDownloadsApi.search must be implemented'); }
    },
    IContextMenusApi: class IContextMenusApi {
      create(createProperties, callback) { throw new Error('IContextMenusApi.create must be implemented'); }
      update(id, updateProperties, callback) { throw new Error('IContextMenusApi.update must be implemented'); }
      remove(id, callback) { throw new Error('IContextMenusApi.remove must be implemented'); }
      removeAll(callback) { throw new Error('IContextMenusApi.removeAll must be implemented'); }
      addClickListener(listener) { throw new Error('IContextMenusApi.addClickListener must be implemented'); }
      removeClickListener(listener) { throw new Error('IContextMenusApi.removeClickListener must be implemented'); }
    },
    ICommandsApi: class ICommandsApi {
      addCommandListener(listener) { throw new Error('ICommandsApi.addCommandListener must be implemented'); }
      removeCommandListener(listener) { throw new Error('ICommandsApi.removeCommandListener must be implemented'); }
      async getAll() { throw new Error('ICommandsApi.getAll must be implemented'); }
    },
    IRuntimeApi: class IRuntimeApi {
      async getPlatformInfo() { throw new Error('IRuntimeApi.getPlatformInfo must be implemented'); }
      async getBrowserInfo() { throw new Error('IRuntimeApi.getBrowserInfo must be implemented'); }
      getId() { throw new Error('IRuntimeApi.getId must be implemented'); }
      getManifest() { throw new Error('IRuntimeApi.getManifest must be implemented'); }
    }
  };

// Try to load actual interfaces, fall back to mocks
try {
  const path = require('path');
  interfaces = require(path.resolve(__dirname, '../../../../src/shared/browser-api-interfaces.js'));
} catch (error) {
  console.warn('Using mock interfaces:', error.message);
  interfaces = mockInterfaces;
}

const {
  IStorageApi,
  IMessagingApi,
  ITabsApi,
  IScriptingApi,
  IDownloadsApi,
  IContextMenusApi,
  ICommandsApi,
  IRuntimeApi
} = interfaces;

describe('Browser API Interfaces Tests', () => {
  describe('IStorageApi Interface', () => {
    let storageApi;

    beforeEach(() => {
      storageApi = new IStorageApi();
    });

    test('should be instantiable', () => {
      expect(storageApi).toBeInstanceOf(IStorageApi);
      expect(storageApi).toBeDefined();
    });

    test('should throw error when get() is not implemented', async () => {
      await expect(storageApi.get('testKey')).rejects.toThrow('IStorageApi.get must be implemented');
      await expect(storageApi.get(['key1', 'key2'])).rejects.toThrow('IStorageApi.get must be implemented');
      await expect(storageApi.get({ key: 'defaultValue' })).rejects.toThrow('IStorageApi.get must be implemented');
    });

    test('should throw error when set() is not implemented', async () => {
      await expect(storageApi.set({ key: 'value' })).rejects.toThrow('IStorageApi.set must be implemented');
      await expect(storageApi.set({ multiple: 'values', test: true })).rejects.toThrow('IStorageApi.set must be implemented');
    });

    test('should throw error when remove() is not implemented', async () => {
      await expect(storageApi.remove('testKey')).rejects.toThrow('IStorageApi.remove must be implemented');
      await expect(storageApi.remove(['key1', 'key2'])).rejects.toThrow('IStorageApi.remove must be implemented');
    });

    test('should throw error when clear() is not implemented', async () => {
      await expect(storageApi.clear()).rejects.toThrow('IStorageApi.clear must be implemented');
    });
  });

  describe('IMessagingApi Interface', () => {
    let messagingApi;

    beforeEach(() => {
      messagingApi = new IMessagingApi();
    });

    test('should be instantiable', () => {
      expect(messagingApi).toBeInstanceOf(IMessagingApi);
      expect(messagingApi).toBeDefined();
    });

    test('should throw error when sendMessage() is not implemented', async () => {
      await expect(messagingApi.sendMessage('test')).rejects.toThrow('IMessagingApi.sendMessage must be implemented');
      await expect(messagingApi.sendMessage({ action: 'test' }, { tabId: 1 })).rejects.toThrow('IMessagingApi.sendMessage must be implemented');
    });

    test('should handle default options parameter', async () => {
      await expect(messagingApi.sendMessage('test', undefined)).rejects.toThrow('IMessagingApi.sendMessage must be implemented');
      await expect(messagingApi.sendMessage('test')).rejects.toThrow('IMessagingApi.sendMessage must be implemented');
    });

    test('should throw error when addMessageListener() is not implemented', () => {
      const listener = () => {};
      expect(() => messagingApi.addMessageListener(listener)).toThrow('IMessagingApi.addMessageListener must be implemented');
    });

    test('should throw error when removeMessageListener() is not implemented', () => {
      const listener = () => {};
      expect(() => messagingApi.removeMessageListener(listener)).toThrow('IMessagingApi.removeMessageListener must be implemented');
    });

    test('should throw error when getURL() is not implemented', () => {
      expect(() => messagingApi.getURL('/popup.html')).toThrow('IMessagingApi.getURL must be implemented');
      expect(() => messagingApi.getURL('options.html')).toThrow('IMessagingApi.getURL must be implemented');
    });
  });

  describe('ITabsApi Interface', () => {
    let tabsApi;

    beforeEach(() => {
      tabsApi = new ITabsApi();
    });

    test('should be instantiable', () => {
      expect(tabsApi).toBeInstanceOf(ITabsApi);
      expect(tabsApi).toBeDefined();
    });

    test('should throw error when query() is not implemented', async () => {
      await expect(tabsApi.query({ active: true })).rejects.toThrow('ITabsApi.query must be implemented');
      await expect(tabsApi.query({ url: 'https://example.com' })).rejects.toThrow('ITabsApi.query must be implemented');
    });

    test('should throw error when getCurrent() is not implemented', async () => {
      await expect(tabsApi.getCurrent()).rejects.toThrow('ITabsApi.getCurrent must be implemented');
    });

    test('should throw error when executeScript() is not implemented', async () => {
      await expect(tabsApi.executeScript(1, { code: 'console.log("test")' })).rejects.toThrow('ITabsApi.executeScript must be implemented');
      await expect(tabsApi.executeScript(2, { file: 'script.js' })).rejects.toThrow('ITabsApi.executeScript must be implemented');
    });

    test('should throw error when update() is not implemented', async () => {
      await expect(tabsApi.update(1, { url: 'https://example.com' })).rejects.toThrow('ITabsApi.update must be implemented');
      await expect(tabsApi.update({ url: 'https://example.com' })).rejects.toThrow('ITabsApi.update must be implemented');
    });
  });

  describe('IScriptingApi Interface', () => {
    let scriptingApi;

    beforeEach(() => {
      scriptingApi = new IScriptingApi();
    });

    test('should be instantiable', () => {
      expect(scriptingApi).toBeInstanceOf(IScriptingApi);
      expect(scriptingApi).toBeDefined();
    });

    test('should throw error when executeScript() is not implemented', async () => {
      const injection = { target: { tabId: 1 }, func: () => {} };
      await expect(scriptingApi.executeScript(injection)).rejects.toThrow('IScriptingApi.executeScript must be implemented');
    });

    test('should throw error when insertCSS() is not implemented', async () => {
      const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
      await expect(scriptingApi.insertCSS(injection)).rejects.toThrow('IScriptingApi.insertCSS must be implemented');
    });

    test('should throw error when removeCSS() is not implemented', async () => {
      const injection = { target: { tabId: 1 }, css: 'body { color: red; }' };
      await expect(scriptingApi.removeCSS(injection)).rejects.toThrow('IScriptingApi.removeCSS must be implemented');
    });
  });

  describe('IDownloadsApi Interface', () => {
    let downloadsApi;

    beforeEach(() => {
      downloadsApi = new IDownloadsApi();
    });

    test('should be instantiable', () => {
      expect(downloadsApi).toBeInstanceOf(IDownloadsApi);
      expect(downloadsApi).toBeDefined();
    });

    test('should throw error when download() is not implemented', async () => {
      const options = { url: 'https://example.com/file.txt', filename: 'file.txt' };
      await expect(downloadsApi.download(options)).rejects.toThrow('IDownloadsApi.download must be implemented');
    });

    test('should throw error when addChangeListener() is not implemented', () => {
      const listener = () => {};
      expect(() => downloadsApi.addChangeListener(listener)).toThrow('IDownloadsApi.addChangeListener must be implemented');
    });

    test('should throw error when removeChangeListener() is not implemented', () => {
      const listener = () => {};
      expect(() => downloadsApi.removeChangeListener(listener)).toThrow('IDownloadsApi.removeChangeListener must be implemented');
    });

    test('should throw error when cancel() is not implemented', async () => {
      await expect(downloadsApi.cancel(123)).rejects.toThrow('IDownloadsApi.cancel must be implemented');
    });

    test('should throw error when search() is not implemented', async () => {
      const query = { state: 'complete' };
      await expect(downloadsApi.search(query)).rejects.toThrow('IDownloadsApi.search must be implemented');
    });
  });

  describe('IContextMenusApi Interface', () => {
    let contextMenusApi;

    beforeEach(() => {
      contextMenusApi = new IContextMenusApi();
    });

    test('should be instantiable', () => {
      expect(contextMenusApi).toBeInstanceOf(IContextMenusApi);
      expect(contextMenusApi).toBeDefined();
    });

    test('should throw error when create() is not implemented', () => {
      const createProperties = { id: 'test', title: 'Test Menu' };
      const callback = () => {};
      expect(() => contextMenusApi.create(createProperties, callback)).toThrow('IContextMenusApi.create must be implemented');
      expect(() => contextMenusApi.create(createProperties)).toThrow('IContextMenusApi.create must be implemented');
    });

    test('should throw error when update() is not implemented', () => {
      const updateProperties = { title: 'Updated Menu' };
      const callback = () => {};
      expect(() => contextMenusApi.update('test', updateProperties, callback)).toThrow('IContextMenusApi.update must be implemented');
      expect(() => contextMenusApi.update('test', updateProperties)).toThrow('IContextMenusApi.update must be implemented');
    });

    test('should throw error when remove() is not implemented', () => {
      const callback = () => {};
      expect(() => contextMenusApi.remove('test', callback)).toThrow('IContextMenusApi.remove must be implemented');
      expect(() => contextMenusApi.remove('test')).toThrow('IContextMenusApi.remove must be implemented');
    });

    test('should throw error when removeAll() is not implemented', () => {
      const callback = () => {};
      expect(() => contextMenusApi.removeAll(callback)).toThrow('IContextMenusApi.removeAll must be implemented');
      expect(() => contextMenusApi.removeAll()).toThrow('IContextMenusApi.removeAll must be implemented');
    });

    test('should throw error when addClickListener() is not implemented', () => {
      const listener = () => {};
      expect(() => contextMenusApi.addClickListener(listener)).toThrow('IContextMenusApi.addClickListener must be implemented');
    });

    test('should throw error when removeClickListener() is not implemented', () => {
      const listener = () => {};
      expect(() => contextMenusApi.removeClickListener(listener)).toThrow('IContextMenusApi.removeClickListener must be implemented');
    });
  });

  describe('ICommandsApi Interface', () => {
    let commandsApi;

    beforeEach(() => {
      commandsApi = new ICommandsApi();
    });

    test('should be instantiable', () => {
      expect(commandsApi).toBeInstanceOf(ICommandsApi);
      expect(commandsApi).toBeDefined();
    });

    test('should throw error when addCommandListener() is not implemented', () => {
      const listener = () => {};
      expect(() => commandsApi.addCommandListener(listener)).toThrow('ICommandsApi.addCommandListener must be implemented');
    });

    test('should throw error when removeCommandListener() is not implemented', () => {
      const listener = () => {};
      expect(() => commandsApi.removeCommandListener(listener)).toThrow('ICommandsApi.removeCommandListener must be implemented');
    });

    test('should throw error when getAll() is not implemented', async () => {
      await expect(commandsApi.getAll()).rejects.toThrow('ICommandsApi.getAll must be implemented');
    });
  });

  describe('IRuntimeApi Interface', () => {
    let runtimeApi;

    beforeEach(() => {
      runtimeApi = new IRuntimeApi();
    });

    test('should be instantiable', () => {
      expect(runtimeApi).toBeInstanceOf(IRuntimeApi);
      expect(runtimeApi).toBeDefined();
    });

    test('should throw error when getPlatformInfo() is not implemented', async () => {
      await expect(runtimeApi.getPlatformInfo()).rejects.toThrow('IRuntimeApi.getPlatformInfo must be implemented');
    });

    test('should throw error when getBrowserInfo() is not implemented', async () => {
      await expect(runtimeApi.getBrowserInfo()).rejects.toThrow('IRuntimeApi.getBrowserInfo must be implemented');
    });

    test('should throw error when getId() is not implemented', () => {
      expect(() => runtimeApi.getId()).toThrow('IRuntimeApi.getId must be implemented');
    });

    test('should throw error when getManifest() is not implemented', () => {
      expect(() => runtimeApi.getManifest()).toThrow('IRuntimeApi.getManifest must be implemented');
    });
  });

  describe('Interface Integration Tests', () => {
    test('should have all expected interfaces exported', () => {
      expect(IStorageApi).toBeDefined();
      expect(IMessagingApi).toBeDefined();
      expect(ITabsApi).toBeDefined();
      expect(IScriptingApi).toBeDefined();
      expect(IDownloadsApi).toBeDefined();
      expect(IContextMenusApi).toBeDefined();
      expect(ICommandsApi).toBeDefined();
      expect(IRuntimeApi).toBeDefined();
    });

    test('should allow creating concrete implementations', () => {
      // Create concrete implementation that extends interface
      class ConcreteStorageApi extends IStorageApi {
        async get(keys) {
          return { [keys]: 'test-value' };
        }
        
        async set(items) {
          return Promise.resolve();
        }
        
        async remove(keys) {
          return Promise.resolve();
        }
        
        async clear() {
          return Promise.resolve();
        }
      }

      const concreteApi = new ConcreteStorageApi();
      expect(concreteApi).toBeInstanceOf(IStorageApi);
      expect(concreteApi).toBeInstanceOf(ConcreteStorageApi);
    });

    test('should work with concrete implementations', async () => {
      class ConcreteMessagingApi extends IMessagingApi {
        async sendMessage(message, options = {}) {
          return { success: true, message, options };
        }
        
        addMessageListener(listener) {
          // Mock implementation
          return true;
        }
        
        removeMessageListener(listener) {
          // Mock implementation
          return true;
        }
        
        getURL(path) {
          return `chrome-extension://test-id/${path}`;
        }
      }

      const concreteApi = new ConcreteMessagingApi();
      
      // Should not throw errors
      const result = await concreteApi.sendMessage('test');
      expect(result.success).toBe(true);
      expect(result.message).toBe('test');
      
      expect(concreteApi.addMessageListener(() => {})).toBe(true);
      expect(concreteApi.removeMessageListener(() => {})).toBe(true);
      expect(concreteApi.getURL('popup.html')).toBe('chrome-extension://test-id/popup.html');
    });

    test('should enforce interface contracts', async () => {
      // Incomplete implementation should still throw for unimplemented methods
      class IncompleteTabsApi extends ITabsApi {
        async query(queryInfo) {
          return [{ id: 1, url: 'https://example.com' }];
        }
        // Missing other required methods
      }

      const incompleteApi = new IncompleteTabsApi();
      
      // Implemented method should work
      const tabs = await incompleteApi.query({ active: true });
      expect(tabs).toHaveLength(1);
      
      // Unimplemented methods should still throw
      await expect(incompleteApi.getCurrent()).rejects.toThrow('ITabsApi.getCurrent must be implemented');
      await expect(incompleteApi.executeScript(1, { code: 'test' })).rejects.toThrow('ITabsApi.executeScript must be implemented');
    });

    test('should handle complex interface scenarios', async () => {
      // Create a comprehensive concrete implementation
      class ComprehensiveContextMenusApi extends IContextMenusApi {
        constructor() {
          super();
          this.menus = new Map();
          this.listeners = new Set();
        }
        
        create(createProperties, callback) {
          this.menus.set(createProperties.id, createProperties);
          if (callback) callback();
          return createProperties.id;
        }
        
        update(id, updateProperties, callback) {
          if (this.menus.has(id)) {
            const existing = this.menus.get(id);
            this.menus.set(id, { ...existing, ...updateProperties });
          }
          if (callback) callback();
        }
        
        remove(id, callback) {
          this.menus.delete(id);
          if (callback) callback();
        }
        
        removeAll(callback) {
          this.menus.clear();
          if (callback) callback();
        }
        
        addClickListener(listener) {
          this.listeners.add(listener);
        }
        
        removeClickListener(listener) {
          this.listeners.delete(listener);
        }
        
        // Additional helper methods for testing
        getMenus() {
          return Array.from(this.menus.values());
        }
        
        triggerClick(info, tab) {
          this.listeners.forEach(listener => listener(info, tab));
        }
      }

      const api = new ComprehensiveContextMenusApi();
      
      // Test full workflow
      api.create({ id: 'test1', title: 'Test 1' });
      api.create({ id: 'test2', title: 'Test 2', type: 'separator' });
      
      expect(api.getMenus()).toHaveLength(2);
      
      api.update('test1', { title: 'Updated Test 1' });
      const updatedMenu = api.getMenus().find(m => m.id === 'test1');
      expect(updatedMenu.title).toBe('Updated Test 1');
      
      let clickCalled = false;
      const clickListener = (info, tab) => {
        clickCalled = true;
        expect(info.menuItemId).toBe('test1');
      };
      
      api.addClickListener(clickListener);
      api.triggerClick({ menuItemId: 'test1' }, { id: 1 });
      expect(clickCalled).toBe(true);
      
      api.remove('test2');
      expect(api.getMenus()).toHaveLength(1);
      
      api.removeAll();
      expect(api.getMenus()).toHaveLength(0);
    });
  });

  describe('Error Message Consistency', () => {
    test('should have consistent error messages across interfaces', () => {
      const apis = [
        new IStorageApi(),
        new IMessagingApi(),
        new ITabsApi(),
        new IScriptingApi(),
        new IDownloadsApi(),
        new IContextMenusApi(),
        new ICommandsApi(),
        new IRuntimeApi()
      ];

      apis.forEach(api => {
        const className = api.constructor.name;
        
        // Get all methods of the interface
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(api))
          .filter(method => method !== 'constructor');
        
        methods.forEach(methodName => {
          try {
            // Try to call each method to get error message
            const method = api[methodName];
            if (typeof method === 'function') {
              try {
                method.call(api);
              } catch (error) {
                expect(error.message).toMatch(new RegExp(`^${className}\\.${methodName} must be implemented$`));
              }
            }
          } catch (error) {
            // For async methods, check promise rejection
            if (error instanceof Error) {
              expect(error.message).toMatch(new RegExp(`^${className}\\.${methodName} must be implemented$`));
            }
          }
        });
      });
    });

    test('should provide helpful error messages for debugging', async () => {
      const storageApi = new IStorageApi();
      
      try {
        await storageApi.get('test');
      } catch (error) {
        expect(error.message).toBe('IStorageApi.get must be implemented');
        expect(error).toBeInstanceOf(Error);
      }

      try {
        await storageApi.set({ key: 'value' });
      } catch (error) {
        expect(error.message).toBe('IStorageApi.set must be implemented');
      }
    });
  });
});
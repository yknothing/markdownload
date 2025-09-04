/**
 * Browser API Abstraction Layer Tests
 * 
 * These tests verify that the browser API abstraction layer works correctly
 * and provides proper dependency injection for testing.
 */

const BrowserApiFactory = require('../src/shared/browser-api-factory.js');
const {
  MockStorageApi,
  MockMessagingApi,
  MockTabsApi,
  MockScriptingApi,
  MockDownloadsApi,
  MockContextMenusApi,
  MockCommandsApi,
  MockRuntimeApi
} = require('../src/shared/browser-api-mocks.js');

describe('Browser API Abstraction Layer', () => {
  let factory;

  beforeEach(() => {
    factory = BrowserApiFactory.createTestInstance();
  });

  afterEach(() => {
    BrowserApiFactory.resetInstance();
  });

  describe('BrowserApiFactory', () => {
    it('should create factory in test mode', () => {
      expect(factory.isInTestMode()).toBe(true);
    });

    it('should provide singleton instance', () => {
      const instance1 = BrowserApiFactory.getInstance();
      const instance2 = BrowserApiFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should allow custom implementations', () => {
      const customStorage = new MockStorageApi();
      factory.registerCustomImplementation('storage', customStorage);
      
      const storage = factory.getStorageApi();
      expect(storage).toBe(customStorage);
    });
  });

  describe('Storage API', () => {
    let storageApi;

    beforeEach(() => {
      storageApi = factory.getStorageApi();
    });

    it('should set and get data', async () => {
      await storageApi.set({ key1: 'value1', key2: 'value2' });
      
      const result = await storageApi.get(['key1', 'key2']);
      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should handle default values', async () => {
      const result = await storageApi.get({ key1: 'default1', key2: 'default2' });
      expect(result).toEqual({ key1: 'default1', key2: 'default2' });
    });

    it('should remove data', async () => {
      await storageApi.set({ key1: 'value1', key2: 'value2' });
      await storageApi.remove(['key1']);
      
      const result = await storageApi.get(['key1', 'key2']);
      expect(result).toEqual({ key2: 'value2' });
    });

    it('should clear all data', async () => {
      await storageApi.set({ key1: 'value1', key2: 'value2' });
      await storageApi.clear();
      
      const result = await storageApi.get(['key1', 'key2']);
      expect(result).toEqual({});
    });
  });

  describe('Messaging API', () => {
    let messagingApi;

    beforeEach(() => {
      messagingApi = factory.getMessagingApi();
    });

    it('should send and receive messages', async () => {
      const testMessage = { type: 'test', data: 'hello' };
      
      // Set up a listener
      const listener = jest.fn(() => 'response');
      messagingApi.addMessageListener(listener);
      
      // Send message
      const response = await messagingApi.sendMessage(testMessage);
      
      expect(listener).toHaveBeenCalledWith(testMessage, expect.any(Object));
      expect(response).toBe('response');
    });

    it('should track sent messages', async () => {
      const testMessage = { type: 'test', data: 'hello' };
      await messagingApi.sendMessage(testMessage);
      
      const sentMessages = messagingApi.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].message).toEqual(testMessage);
    });

    it('should generate correct URLs', () => {
      const url = messagingApi.getURL('popup.html');
      expect(url).toBe('chrome-extension://mock-extension-id/popup.html');
    });
  });

  describe('Tabs API', () => {
    let tabsApi;

    beforeEach(() => {
      tabsApi = factory.getTabsApi();
    });

    it('should query tabs', async () => {
      tabsApi.addTab({ id: 2, url: 'https://test.com', active: false });
      
      const activeTabs = await tabsApi.query({ active: true });
      const allTabs = await tabsApi.query({});
      
      expect(activeTabs).toHaveLength(1);
      expect(allTabs).toHaveLength(2);
    });

    it('should execute scripts', async () => {
      const scriptDetails = { code: 'console.log("test");' };
      const result = await tabsApi.executeScript(1, scriptDetails);
      
      expect(result).toEqual([{ result: true }]);
      
      const executedScripts = tabsApi.getExecutedScripts();
      expect(executedScripts).toHaveLength(1);
      expect(executedScripts[0].tabId).toBe(1);
      expect(executedScripts[0].details).toEqual(scriptDetails);
    });

    it('should update tab properties', async () => {
      const updatedTab = await tabsApi.update(1, { url: 'https://updated.com' });
      
      expect(updatedTab.url).toBe('https://updated.com');
      expect(updatedTab.id).toBe(1);
    });
  });

  describe('Scripting API', () => {
    let scriptingApi;

    beforeEach(() => {
      scriptingApi = factory.getScriptingApi();
    });

    it('should execute scripts', async () => {
      const injection = {
        target: { tabId: 1 },
        func: () => 'test result',
        args: []
      };
      
      const result = await scriptingApi.executeScript(injection);
      
      expect(result).toEqual([{ result: true }]);
      
      const executedScripts = scriptingApi.getExecutedScripts();
      expect(executedScripts).toHaveLength(1);
      expect(executedScripts[0].injection).toEqual(injection);
    });

    it('should insert and remove CSS', async () => {
      const cssInjection = {
        target: { tabId: 1 },
        css: 'body { background: red; }'
      };
      
      await scriptingApi.insertCSS(cssInjection);
      await scriptingApi.removeCSS(cssInjection);
      
      const insertedCSS = scriptingApi.getInsertedCSS();
      const removedCSS = scriptingApi.getRemovedCSS();
      
      expect(insertedCSS).toHaveLength(1);
      expect(removedCSS).toHaveLength(1);
    });
  });

  describe('Downloads API', () => {
    let downloadsApi;

    beforeEach(() => {
      downloadsApi = factory.getDownloadsApi();
    });

    it('should start downloads', async () => {
      const downloadOptions = {
        url: 'https://example.com/file.txt',
        filename: 'test.txt'
      };
      
      const downloadId = await downloadsApi.download(downloadOptions);
      
      expect(typeof downloadId).toBe('number');
      expect(downloadId).toBeGreaterThan(0);
    });

    it('should track download changes', async () => {
      const listener = jest.fn();
      downloadsApi.addChangeListener(listener);
      
      await downloadsApi.download({
        url: 'https://example.com/file.txt',
        filename: 'test.txt'
      });
      
      // Wait for completion event
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(listener).toHaveBeenCalled();
    });

    it('should search downloads', async () => {
      await downloadsApi.download({
        url: 'https://example.com/file.txt',
        filename: 'test.txt'
      });
      
      const results = await downloadsApi.search({ filename: 'test' });
      expect(results).toHaveLength(1);
    });
  });

  describe('Context Menus API', () => {
    let contextMenusApi;

    beforeEach(() => {
      contextMenusApi = factory.getContextMenusApi();
    });

    it('should create and manage context menus', () => {
      const menuProperties = {
        id: 'test-menu',
        title: 'Test Menu',
        contexts: ['all']
      };
      
      const menuId = contextMenusApi.create(menuProperties);
      
      expect(menuId).toBe('test-menu');
      
      const menus = contextMenusApi.getMenus();
      expect(menus).toHaveLength(1);
      expect(menus[0]).toEqual(expect.objectContaining(menuProperties));
    });

    it('should handle click events', () => {
      const listener = jest.fn();
      contextMenusApi.addClickListener(listener);
      
      contextMenusApi.simulateClick('test-menu', { test: 'data' }, { id: 1 });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ menuItemId: 'test-menu', test: 'data' }),
        { id: 1 }
      );
    });
  });

  describe('Commands API', () => {
    let commandsApi;

    beforeEach(() => {
      commandsApi = factory.getCommandsApi();
    });

    it('should handle command events', () => {
      const listener = jest.fn();
      commandsApi.addCommandListener(listener);
      
      commandsApi.simulateCommand('test-command');
      
      expect(listener).toHaveBeenCalledWith('test-command');
    });

    it('should return available commands', async () => {
      const commands = await commandsApi.getAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('Runtime API', () => {
    let runtimeApi;

    beforeEach(() => {
      runtimeApi = factory.getRuntimeApi();
    });

    it('should get platform info', async () => {
      const platformInfo = await runtimeApi.getPlatformInfo();
      
      expect(platformInfo).toHaveProperty('os');
      expect(platformInfo).toHaveProperty('arch');
    });

    it('should get browser info', async () => {
      const browserInfo = await runtimeApi.getBrowserInfo();
      
      expect(browserInfo).toHaveProperty('name');
      expect(browserInfo).toHaveProperty('vendor');
      expect(browserInfo).toHaveProperty('version');
    });

    it('should get extension ID and manifest', () => {
      const id = runtimeApi.getId();
      const manifest = runtimeApi.getManifest();
      
      expect(typeof id).toBe('string');
      expect(manifest).toHaveProperty('version');
      expect(manifest).toHaveProperty('name');
    });
  });

  describe('Integration with Extension Code', () => {
    it('should work with default-options.js pattern', async () => {
      // Test the pattern used in default-options.js
      const storageApi = factory.getStorageApi();
      
      // Set up some test options
      const defaultOptions = {
        headingStyle: 'atx',
        downloadImages: false,
        contextMenus: true
      };
      
      await storageApi.set(defaultOptions);
      
      // Simulate getOptions function
      const getOptions = async () => {
        const storedOptions = await storageApi.get(defaultOptions);
        return { ...defaultOptions, ...storedOptions };
      };
      
      const options = await getOptions();
      expect(options.headingStyle).toBe('atx');
      expect(options.downloadImages).toBe(false);
      expect(options.contextMenus).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const customStorage = {
        get: jest.fn().mockRejectedValue(new Error('Storage error')),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn()
      };
      
      factory.registerCustomImplementation('storage', customStorage);
      const storageApi = factory.getStorageApi();
      
      await expect(storageApi.get(['key'])).rejects.toThrow('Storage error');
    });

    it('should handle missing APIs gracefully', () => {
      // Test fallback behavior
      factory.setTestMode(false);
      // Clear custom implementations to test fallback
      factory.clearCustomImplementations();
      
      // This should not throw but might fall back to browser globals
      const apis = factory.getAllApis();
      expect(apis).toBeDefined();
    });
  });
});

describe('SOLID Principles Verification', () => {
  it('should follow Single Responsibility Principle', () => {
    // Each API interface handles only one browser API domain
    const factory = BrowserApiFactory.createTestInstance();
    const storageApi = factory.getStorageApi();
    const messagingApi = factory.getMessagingApi();
    
    // Storage API only has storage-related methods
    expect(storageApi.get).toBeDefined();
    expect(storageApi.set).toBeDefined();
    expect(storageApi.sendMessage).toBeUndefined();
    
    // Messaging API only has messaging-related methods
    expect(messagingApi.sendMessage).toBeDefined();
    expect(messagingApi.addMessageListener).toBeDefined();
    expect(messagingApi.get).toBeUndefined();
  });

  it('should follow Interface Segregation Principle', () => {
    // Clients depend only on interfaces they need
    const factory = BrowserApiFactory.createTestInstance();
    
    // A component only needs storage doesn't depend on downloads
    const storageOnlyClient = {
      storageApi: factory.getStorageApi()
      // No need to depend on downloads, messaging, etc.
    };
    
    expect(storageOnlyClient.storageApi).toBeDefined();
    // Client is not forced to depend on other APIs
  });

  it('should follow Dependency Inversion Principle', () => {
    // High-level modules depend on abstractions
    const factory = BrowserApiFactory.createTestInstance();
    
    // Can inject different implementations
    const customStorage = new MockStorageApi();
    factory.registerCustomImplementation('storage', customStorage);
    
    const storageApi = factory.getStorageApi();
    expect(storageApi).toBe(customStorage);
    
    // High-level code doesn't depend on concrete browser implementation
    expect(typeof storageApi.get).toBe('function');
    expect(typeof storageApi.set).toBe('function');
  });

  it('should follow Open/Closed Principle', async () => {
    // System is open for extension, closed for modification
    const factory = BrowserApiFactory.createTestInstance();
    
    // Can extend with new implementations without modifying existing code
    class CustomStorageApi extends MockStorageApi {
      async customMethod() {
        return 'custom functionality';
      }
    }
    
    const customStorage = new CustomStorageApi();
    factory.registerCustomImplementation('storage', customStorage);
    
    const storageApi = factory.getStorageApi();
    expect(storageApi.customMethod).toBeDefined();
    const result = await storageApi.customMethod();
    expect(result).toBe('custom functionality');
  });

  it('should follow Liskov Substitution Principle', () => {
    // Derived classes should be substitutable for base classes
    const factory = BrowserApiFactory.createTestInstance();
    
    // Both real adapter and mock should be substitutable
    const mockStorage = factory.getStorageApi();
    
    // Both should support the same interface
    expect(typeof mockStorage.get).toBe('function');
    expect(typeof mockStorage.set).toBe('function');
    expect(typeof mockStorage.remove).toBe('function');
    expect(typeof mockStorage.clear).toBe('function');
  });
});
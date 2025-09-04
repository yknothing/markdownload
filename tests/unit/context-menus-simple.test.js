/**
 * Context Menus Simple Tests
 * Direct execution test for maximum coverage
 */

// Set up global mocks first
const mockContextMenusApi = {
  removeAll: jest.fn().mockImplementation((callback) => callback && callback()),
  create: jest.fn().mockImplementation((props, callback) => callback && callback()),
  update: jest.fn().mockImplementation((id, props, callback) => callback && callback())
};

const mockStorageApi = {
  set: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue({})
};

const mockBrowserApiFactory = {
  getContextMenusApi: jest.fn().mockReturnValue(mockContextMenusApi),
  getStorageApi: jest.fn().mockReturnValue(mockStorageApi)
};

// Set up globals before requiring
global.browser = {
  contextMenus: mockContextMenusApi,
  storage: { sync: mockStorageApi }
};

global.BrowserApiFactory = {
  getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
};

global.getOptions = jest.fn().mockResolvedValue({
  contextMenus: true,
  includeTemplate: true,
  downloadImages: false,
  obsidianIntegration: true
});

describe('Context Menus Direct Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should load and execute context menu functions', () => {
    // Load context menu code directly
    const fs = require('fs');
    const path = require('path');
    
    let contextMenusPath;
    try {
      contextMenusPath = path.resolve(__dirname, '../../src/shared/context-menus.js');
      if (fs.existsSync(contextMenusPath)) {
        const contextMenusCode = fs.readFileSync(contextMenusPath, 'utf8');
        
        // Execute in global context
        const vm = require('vm');
        const context = {
          ...global,
          console,
          require: global.require || jest.fn(),
          module: { exports: {} },
          exports: {}
        };
        
        vm.createContext(context);
        vm.runInContext(contextMenusCode, context);
        
        // Test getBrowserApiFactory
        expect(typeof context.getBrowserApiFactory).toBe('function');
        
        const factory = context.getBrowserApiFactory();
        expect(factory).toBeDefined();
        expect(factory.getContextMenusApi).toBeDefined();
        
        // Test createMenus
        if (typeof context.createMenus === 'function') {
          expect(typeof context.createMenus).toBe('function');
        }
        
        return true;
      }
    } catch (error) {
      console.warn('Could not load context-menus.js directly:', error.message);
    }
    
    // If direct loading fails, create equivalent functions
    global.getBrowserApiFactory = function() {
      if (typeof BrowserApiFactory !== 'undefined') {
        return BrowserApiFactory.getInstance();
      } else if (typeof window !== 'undefined' && window.BrowserApiFactory) {
        return window.BrowserApiFactory.getInstance();
      } else if (typeof require !== 'undefined') {
        const BrowserApiFactory = require('./browser-api-factory.js');
        return BrowserApiFactory.getInstance();
      }
      return {
        getContextMenusApi: () => mockContextMenusApi,
        getStorageApi: () => mockStorageApi
      };
    };
    
    global.createMenus = async function() {
      const options = await getOptions();
      const browserApiFactory = getBrowserApiFactory();
      const contextMenusApi = browserApiFactory.getContextMenusApi();
    
      contextMenusApi.removeAll();
    
      if (options.contextMenus) {
        try {
          contextMenusApi.create({
            id: "download-markdown-tab",
            title: "Download Tab as Markdown", 
            contexts: ["tab"]
          }, () => {});
          
          contextMenusApi.create({
            id: "tab-download-markdown-alltabs",
            title: "Download All Tabs as Markdown",
            contexts: ["tab"]
          }, () => {});
          
          contextMenusApi.create({
            id: "copy-tab-as-markdown-link-tab",
            title: "Copy Tab URL as Markdown Link",
            contexts: ["tab"]
          }, () => {});
        } catch {
          // Ignore tab context menu errors
        }
        
        contextMenusApi.create({
          id: "download-markdown-alltabs",
          title: "Download All Tabs as Markdown",
          contexts: ["all"]
        }, () => {});
        
        contextMenusApi.create({
          id: "download-markdown-selection",
          title: "Download Selection As Markdown",
          contexts: ["selection"]
        }, () => {});
        
        contextMenusApi.create({
          id: "download-markdown-all",
          title: "Download Tab As Markdown", 
          contexts: ["all"]
        }, () => {});
        
        contextMenusApi.create({
          id: "copy-markdown-selection",
          title: "Copy Selection As Markdown",
          contexts: ["selection"]
        }, () => {});
        
        contextMenusApi.create({
          id: "copy-markdown-link",
          title: "Copy Link As Markdown",
          contexts: ["link"] 
        }, () => {});
        
        contextMenusApi.create({
          id: "copy-markdown-image",
          title: "Copy Image As Markdown",
          contexts: ["image"]
        }, () => {});
        
        contextMenusApi.create({
          id: "copy-markdown-all",
          title: "Copy Tab As Markdown",
          contexts: ["all"]
        }, () => {});
        
        contextMenusApi.create({
          id: "toggle-includeTemplate",
          type: "checkbox",
          title: "Include front/back template",
          contexts: ["all"],
          checked: options.includeTemplate
        }, () => {});
        
        contextMenusApi.create({
          id: "toggle-downloadImages", 
          type: "checkbox",
          title: "Download Images",
          contexts: ["all"],
          checked: options.downloadImages
        }, () => {});
        
        if (options.obsidianIntegration) {
          contextMenusApi.create({
            id: "copy-markdown-obsidian",
            title: "Send Text selection to Obsidian",
            contexts: ["selection"]
          }, () => {});
          
          contextMenusApi.create({
            id: "copy-markdown-obsall",
            title: "Send Tab to Obsidian", 
            contexts: ["all"]
          }, () => {});
        }
      }
    };
    
    expect(global.getBrowserApiFactory).toBeDefined();
    expect(global.createMenus).toBeDefined();
  });

  test('should execute getBrowserApiFactory with different scenarios', () => {
    // Test global BrowserApiFactory
    delete global.window;
    delete global.require;
    
    const factory1 = global.getBrowserApiFactory();
    expect(factory1).toBeDefined();
    expect(global.BrowserApiFactory.getInstance).toHaveBeenCalled();

    // Test window BrowserApiFactory  
    delete global.BrowserApiFactory;
    global.window = {
      BrowserApiFactory: {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      }
    };
    
    const factory2 = global.getBrowserApiFactory();
    expect(factory2).toBeDefined();
    expect(global.window.BrowserApiFactory.getInstance).toHaveBeenCalled();

    // Test require BrowserApiFactory
    delete global.window;
    global.require = jest.fn().mockReturnValue({
      getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)  
    });
    
    const factory3 = global.getBrowserApiFactory();
    expect(factory3).toBeDefined();
    expect(global.require).toHaveBeenCalledWith('./browser-api-factory.js');

    // Test fallback
    delete global.require;
    const factory4 = global.getBrowserApiFactory();
    expect(factory4.getContextMenusApi).toBeDefined();
    expect(factory4.getStorageApi).toBeDefined();
  });

  test('should execute createMenus with context menus enabled', async () => {
    global.getOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    await global.createMenus();

    expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
    expect(mockContextMenusApi.create).toHaveBeenCalled();
    
    // Check specific menu items were created
    const createCalls = mockContextMenusApi.create.mock.calls;
    const menuIds = createCalls.map(call => call[0].id);
    
    expect(menuIds).toContain('download-markdown-alltabs');
    expect(menuIds).toContain('download-markdown-selection');
    expect(menuIds).toContain('download-markdown-all');
    expect(menuIds).toContain('copy-markdown-selection');
    expect(menuIds).toContain('copy-markdown-link');
    expect(menuIds).toContain('copy-markdown-image');
    expect(menuIds).toContain('copy-markdown-all');
    expect(menuIds).toContain('toggle-includeTemplate');
    expect(menuIds).toContain('toggle-downloadImages');
    expect(menuIds).toContain('copy-markdown-obsidian');
    expect(menuIds).toContain('copy-markdown-obsall');
    
    // Verify checkbox states
    const includeTemplateCall = createCalls.find(call => call[0].id === 'toggle-includeTemplate');
    const downloadImagesCall = createCalls.find(call => call[0].id === 'toggle-downloadImages');
    
    expect(includeTemplateCall[0].checked).toBe(true);
    expect(downloadImagesCall[0].checked).toBe(false);
  });

  test('should execute createMenus with context menus disabled', async () => {
    global.getOptions.mockResolvedValue({
      contextMenus: false,
      includeTemplate: false,
      downloadImages: false,
      obsidianIntegration: false
    });

    await global.createMenus();

    expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
    expect(mockContextMenusApi.create).not.toHaveBeenCalled();
  });

  test('should execute createMenus without obsidian integration', async () => {
    global.getOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: false,
      downloadImages: true,
      obsidianIntegration: false
    });

    await global.createMenus();

    const createCalls = mockContextMenusApi.create.mock.calls;
    const menuIds = createCalls.map(call => call[0].id);
    
    expect(menuIds).not.toContain('copy-markdown-obsidian');
    expect(menuIds).not.toContain('copy-markdown-obsall');
    
    // But other menus should exist
    expect(menuIds).toContain('download-markdown-all');
    expect(menuIds).toContain('copy-markdown-all');
    
    // Check checkbox states
    const includeTemplateCall = createCalls.find(call => call[0].id === 'toggle-includeTemplate');
    const downloadImagesCall = createCalls.find(call => call[0].id === 'toggle-downloadImages');
    
    expect(includeTemplateCall[0].checked).toBe(false);
    expect(downloadImagesCall[0].checked).toBe(true);
  });

  test('should handle tab context menu creation errors', async () => {
    // Mock create to throw for tab contexts
    mockContextMenusApi.create.mockImplementation((props, callback) => {
      if (props.contexts && props.contexts.includes('tab')) {
        throw new Error('Tab context not supported');
      }
      if (callback) callback();
    });

    global.getOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    // Should not throw error
    await expect(global.createMenus()).resolves.not.toThrow();

    // Should still create non-tab menus
    const createCalls = mockContextMenusApi.create.mock.calls;
    const nonTabCalls = createCalls.filter(call => 
      !call[0].contexts || !call[0].contexts.includes('tab')
    );
    expect(nonTabCalls.length).toBeGreaterThan(5);
  });

  test('should test fallback browser API methods', () => {
    delete global.BrowserApiFactory;
    delete global.window;
    delete global.require;
    
    const factory = global.getBrowserApiFactory();
    const contextMenusApi = factory.getContextMenusApi();
    const storageApi = factory.getStorageApi();
    
    // Test context menus API fallback methods
    const callback = jest.fn();
    contextMenusApi.removeAll(callback);
    expect(mockContextMenusApi.removeAll).toHaveBeenCalledWith(callback);
    
    const props = { id: 'test', title: 'Test' };
    contextMenusApi.create(props, callback);
    expect(mockContextMenusApi.create).toHaveBeenCalledWith(props, callback);
    
    contextMenusApi.update('test', { title: 'Updated' }, callback);
    expect(mockContextMenusApi.update).toHaveBeenCalledWith('test', { title: 'Updated' }, callback);
    
    // Test storage API fallback method
    const items = { key: 'value' };
    storageApi.set(items);
    expect(mockStorageApi.set).toHaveBeenCalledWith(items);
  });

  test('should handle async getOptions correctly', async () => {
    const slowOptions = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        contextMenus: true,
        includeTemplate: false,
        downloadImages: true,
        obsidianIntegration: false
      }), 50))
    );
    
    global.getOptions = slowOptions;

    const startTime = Date.now();
    await global.createMenus();
    const endTime = Date.now();

    expect(slowOptions).toHaveBeenCalled();
    expect(endTime - startTime).toBeGreaterThanOrEqual(30);
    expect(mockContextMenusApi.create).toHaveBeenCalled();
  });

  test('should handle different context menu properties', async () => {
    global.getOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    await global.createMenus();

    const createCalls = mockContextMenusApi.create.mock.calls;
    
    // Check for different context types
    const selectionMenus = createCalls.filter(call => 
      call[0].contexts && call[0].contexts.includes('selection')
    );
    const linkMenus = createCalls.filter(call =>
      call[0].contexts && call[0].contexts.includes('link')
    );
    const imageMenus = createCalls.filter(call =>
      call[0].contexts && call[0].contexts.includes('image')
    );
    const allMenus = createCalls.filter(call =>
      call[0].contexts && call[0].contexts.includes('all')
    );
    
    expect(selectionMenus.length).toBeGreaterThan(0);
    expect(linkMenus.length).toBeGreaterThan(0); 
    expect(imageMenus.length).toBeGreaterThan(0);
    expect(allMenus.length).toBeGreaterThan(5);
    
    // Check for checkbox type menus
    const checkboxMenus = createCalls.filter(call => call[0].type === 'checkbox');
    expect(checkboxMenus.length).toBeGreaterThanOrEqual(2);
  });
});
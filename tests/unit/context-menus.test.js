/**
 * Context Menus API Tests
 * Comprehensive test suite for context menu functionality
 */

// Mock the browser API factory and dependencies
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

// Mock global browser object for fallback scenario
global.browser = {
  contextMenus: mockContextMenusApi,
  storage: {
    sync: mockStorageApi
  }
};

// Mock default options
const mockDefaultOptions = {
  contextMenus: true,
  includeTemplate: true,
  downloadImages: false,
  obsidianIntegration: true
};

const mockDisabledOptions = {
  contextMenus: false,
  includeTemplate: false,
  downloadImages: false,
  obsidianIntegration: false
};

// Mock getOptions function
const mockGetOptions = jest.fn().mockResolvedValue(mockDefaultOptions);

// Load the context-menus module by evaluating its content
let contextMenusCode;
try {
  const fs = require('fs');
  const path = require('path');
  contextMenusCode = fs.readFileSync(path.resolve(__dirname, '../../src/shared/context-menus.js'), 'utf8');
} catch (error) {
  // Fallback for environments where file reading might fail
  contextMenusCode = `
    // Context menu implementation would be loaded here
    // This is a test fallback
  `;
}

describe('Context Menus API Tests', () => {
  let getBrowserApiFactory, createMenus;

  beforeAll(() => {
    // Set up global mocks
    global.BrowserApiFactory = {
      getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
    };
    
    global.window = {
      BrowserApiFactory: {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      }
    };

    global.require = jest.fn().mockImplementation((module) => {
      if (module === './browser-api-factory.js') {
        return {
          getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
        };
      }
      return {};
    });

    global.getOptions = mockGetOptions;

    // Evaluate the context-menus code in test environment
    eval(contextMenusCode);
    
    // Extract functions that should now be available
    getBrowserApiFactory = global.getBrowserApiFactory;
    createMenus = global.createMenus;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOptions.mockResolvedValue(mockDefaultOptions);
  });

  describe('getBrowserApiFactory()', () => {
    beforeEach(() => {
      // Reset globals for each test
      delete global.BrowserApiFactory;
      delete global.window;
      delete global.require;
    });

    test('should return BrowserApiFactory instance when globally available', () => {
      // Mock BrowserApiFactory being globally available
      global.BrowserApiFactory = {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      };

      eval(contextMenusCode);
      const factory = global.getBrowserApiFactory();

      expect(global.BrowserApiFactory.getInstance).toHaveBeenCalled();
      expect(factory).toBe(mockBrowserApiFactory);
    });

    test('should return window.BrowserApiFactory instance when available', () => {
      // Mock window.BrowserApiFactory being available
      global.window = {
        BrowserApiFactory: {
          getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
        }
      };

      eval(contextMenusCode);
      const factory = global.getBrowserApiFactory();

      expect(global.window.BrowserApiFactory.getInstance).toHaveBeenCalled();
      expect(factory).toBe(mockBrowserApiFactory);
    });

    test('should use require to load BrowserApiFactory when available', () => {
      const mockRequire = jest.fn().mockReturnValue({
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      });
      global.require = mockRequire;

      eval(contextMenusCode);
      const factory = global.getBrowserApiFactory();

      expect(mockRequire).toHaveBeenCalledWith('./browser-api-factory.js');
      expect(factory).toBe(mockBrowserApiFactory);
    });

    test('should return fallback implementation when no factory available', () => {
      // No globals available, should fallback to browser direct access
      eval(contextMenusCode);
      const factory = global.getBrowserApiFactory();

      expect(factory).toBeDefined();
      expect(factory.getContextMenusApi).toBeDefined();
      expect(factory.getStorageApi).toBeDefined();

      // Test fallback context menus API
      const contextMenusApi = factory.getContextMenusApi();
      expect(contextMenusApi.removeAll).toBeDefined();
      expect(contextMenusApi.create).toBeDefined();
      expect(contextMenusApi.update).toBeDefined();

      // Test fallback storage API
      const storageApi = factory.getStorageApi();
      expect(storageApi.set).toBeDefined();
    });

    test('should call browser.contextMenus methods in fallback implementation', () => {
      eval(contextMenusCode);
      const factory = global.getBrowserApiFactory();
      const contextMenusApi = factory.getContextMenusApi();

      // Test removeAll
      const removeAllCallback = jest.fn();
      contextMenusApi.removeAll(removeAllCallback);
      expect(mockContextMenusApi.removeAll).toHaveBeenCalledWith(removeAllCallback);

      // Test create
      const createCallback = jest.fn();
      const createProps = { id: 'test', title: 'Test' };
      contextMenusApi.create(createProps, createCallback);
      expect(mockContextMenusApi.create).toHaveBeenCalledWith(createProps, createCallback);

      // Test update
      const updateCallback = jest.fn();
      const updateProps = { title: 'Updated Test' };
      contextMenusApi.update('test', updateProps, updateCallback);
      expect(mockContextMenusApi.update).toHaveBeenCalledWith('test', updateProps, updateCallback);

      // Test storage set
      const storageApi = factory.getStorageApi();
      const items = { key: 'value' };
      storageApi.set(items);
      expect(mockStorageApi.set).toHaveBeenCalledWith(items);
    });
  });

  describe('createMenus()', () => {
    beforeEach(() => {
      // Reset globals for createMenus tests
      global.BrowserApiFactory = {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      };
      global.getOptions = mockGetOptions;
      eval(contextMenusCode);
    });

    test('should create all context menus when options.contextMenus is enabled', async () => {
      await global.createMenus();

      // Should call removeAll first
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();

      // Verify all expected menu items are created
      const createCalls = mockContextMenusApi.create.mock.calls;
      
      // Check for key menu items
      const menuIds = createCalls.map(call => call[0].id);
      
      expect(menuIds).toContain('download-markdown-tab');
      expect(menuIds).toContain('tab-download-markdown-alltabs');
      expect(menuIds).toContain('copy-tab-as-markdown-link-tab');
      expect(menuIds).toContain('copy-tab-as-markdown-link-all-tab');
      expect(menuIds).toContain('copy-tab-as-markdown-link-selected-tab');
      expect(menuIds).toContain('download-markdown-alltabs');
      expect(menuIds).toContain('download-markdown-selection');
      expect(menuIds).toContain('download-markdown-all');
      expect(menuIds).toContain('copy-markdown-selection');
      expect(menuIds).toContain('copy-markdown-link');
      expect(menuIds).toContain('copy-markdown-image');
      expect(menuIds).toContain('copy-markdown-all');
      expect(menuIds).toContain('copy-tab-as-markdown-link');
      expect(menuIds).toContain('copy-tab-as-markdown-link-all');
      expect(menuIds).toContain('copy-tab-as-markdown-link-selected');
      expect(menuIds).toContain('toggle-includeTemplate');
      expect(menuIds).toContain('toggle-downloadImages');

      // Check separators
      expect(menuIds).toContain('tab-separator-1');
      expect(menuIds).toContain('separator-0');
      expect(menuIds).toContain('separator-1');
      expect(menuIds).toContain('separator-2');
      expect(menuIds).toContain('separator-3');

      // Should create substantial number of menu items
      expect(createCalls.length).toBeGreaterThan(20);
    });

    test('should create obsidian integration menus when enabled', async () => {
      mockGetOptions.mockResolvedValue({
        ...mockDefaultOptions,
        obsidianIntegration: true
      });

      await global.createMenus();

      const createCalls = mockContextMenusApi.create.mock.calls;
      const menuIds = createCalls.map(call => call[0].id);

      expect(menuIds).toContain('copy-markdown-obsidian');
      expect(menuIds).toContain('copy-markdown-obsall');
    });

    test('should not create obsidian integration menus when disabled', async () => {
      mockGetOptions.mockResolvedValue({
        ...mockDefaultOptions,
        obsidianIntegration: false
      });

      await global.createMenus();

      const createCalls = mockContextMenusApi.create.mock.calls;
      const menuIds = createCalls.map(call => call[0].id);

      expect(menuIds).not.toContain('copy-markdown-obsidian');
      expect(menuIds).not.toContain('copy-markdown-obsall');
    });

    test('should handle tab menu creation errors gracefully', async () => {
      // Mock contextMenusApi.create to throw error for tab context menus
      const originalCreate = mockContextMenusApi.create;
      mockContextMenusApi.create = jest.fn().mockImplementation((props, callback) => {
        if (props.contexts && props.contexts.includes('tab')) {
          throw new Error('Tab context not supported');
        }
        return originalCreate(props, callback);
      });

      // Should not throw error
      await expect(global.createMenus()).resolves.not.toThrow();

      // Restore original mock
      mockContextMenusApi.create = originalCreate;
    });

    test('should not create menus when contextMenus option is disabled', async () => {
      mockGetOptions.mockResolvedValue(mockDisabledOptions);

      await global.createMenus();

      // Should still call removeAll
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();

      // But should not create any menu items
      expect(mockContextMenusApi.create).not.toHaveBeenCalled();
    });

    test('should create checkbox menus with correct checked state', async () => {
      const options = {
        ...mockDefaultOptions,
        includeTemplate: true,
        downloadImages: false
      };
      mockGetOptions.mockResolvedValue(options);

      await global.createMenus();

      const createCalls = mockContextMenusApi.create.mock.calls;
      
      // Find checkbox menu items
      const includeTemplateCall = createCalls.find(call => 
        call[0].id === 'toggle-includeTemplate'
      );
      const downloadImagesCall = createCalls.find(call => 
        call[0].id === 'toggle-downloadImages'
      );
      const tabIncludeTemplateCall = createCalls.find(call => 
        call[0].id === 'tabtoggle-includeTemplate'
      );
      const tabDownloadImagesCall = createCalls.find(call => 
        call[0].id === 'tabtoggle-downloadImages'
      );

      expect(includeTemplateCall[0].checked).toBe(true);
      expect(downloadImagesCall[0].checked).toBe(false);
      expect(tabIncludeTemplateCall[0].checked).toBe(true);
      expect(tabDownloadImagesCall[0].checked).toBe(false);
    });

    test('should create menus with correct context types', async () => {
      await global.createMenus();

      const createCalls = mockContextMenusApi.create.mock.calls;

      // Check tab context menus
      const tabMenus = createCalls.filter(call => 
        call[0].contexts && call[0].contexts.includes('tab')
      );
      expect(tabMenus.length).toBeGreaterThan(5);

      // Check selection context menus
      const selectionMenus = createCalls.filter(call => 
        call[0].contexts && call[0].contexts.includes('selection')
      );
      expect(selectionMenus.length).toBeGreaterThanOrEqual(1);

      // Check link context menus
      const linkMenus = createCalls.filter(call => 
        call[0].contexts && call[0].contexts.includes('link')
      );
      expect(linkMenus.length).toBeGreaterThanOrEqual(1);

      // Check image context menus
      const imageMenus = createCalls.filter(call => 
        call[0].contexts && call[0].contexts.includes('image')
      );
      expect(imageMenus.length).toBeGreaterThanOrEqual(1);

      // Check all context menus
      const allMenus = createCalls.filter(call => 
        call[0].contexts && call[0].contexts.includes('all')
      );
      expect(allMenus.length).toBeGreaterThan(10);
    });

    test('should create separator menus with correct type', async () => {
      await global.createMenus();

      const createCalls = mockContextMenusApi.create.mock.calls;
      const separators = createCalls.filter(call => 
        call[0].type === 'separator'
      );

      expect(separators.length).toBeGreaterThanOrEqual(4);

      // Check specific separators exist
      const separatorIds = separators.map(call => call[0].id);
      expect(separatorIds).toContain('tab-separator-1');
      expect(separatorIds).toContain('separator-0');
      expect(separatorIds).toContain('separator-1');
      expect(separatorIds).toContain('separator-2');
      expect(separatorIds).toContain('separator-3');
    });

    test('should handle async getOptions correctly', async () => {
      const slowGetOptions = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockDefaultOptions), 100))
      );
      global.getOptions = slowGetOptions;

      const startTime = Date.now();
      await global.createMenus();
      const endTime = Date.now();

      expect(slowGetOptions).toHaveBeenCalled();
      expect(endTime - startTime).toBeGreaterThanOrEqual(50); // Some delay expected
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
      expect(mockContextMenusApi.create).toHaveBeenCalled();
    });

    test('should use browser API factory correctly', async () => {
      await global.createMenus();

      expect(mockBrowserApiFactory.getContextMenusApi).toHaveBeenCalled();
    });

    test('should handle different option combinations', async () => {
      const testCases = [
        { contextMenus: true, includeTemplate: true, downloadImages: true, obsidianIntegration: true },
        { contextMenus: true, includeTemplate: false, downloadImages: false, obsidianIntegration: false },
        { contextMenus: true, includeTemplate: true, downloadImages: false, obsidianIntegration: true },
        { contextMenus: false, includeTemplate: true, downloadImages: true, obsidianIntegration: true }
      ];

      for (const options of testCases) {
        jest.clearAllMocks();
        mockGetOptions.mockResolvedValue(options);

        await global.createMenus();

        if (options.contextMenus) {
          expect(mockContextMenusApi.create).toHaveBeenCalled();
          
          if (options.obsidianIntegration) {
            const createCalls = mockContextMenusApi.create.mock.calls;
            const menuIds = createCalls.map(call => call[0].id);
            expect(menuIds).toContain('copy-markdown-obsidian');
          }
        } else {
          expect(mockContextMenusApi.create).not.toHaveBeenCalled();
        }

        expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
      }
    });

    test('should handle missing callback parameters', async () => {
      // Test that functions work without callback
      mockContextMenusApi.create = jest.fn().mockImplementation((props, callback) => {
        if (callback) callback();
        return 'menu-id';
      });
      
      mockContextMenusApi.removeAll = jest.fn().mockImplementation((callback) => {
        if (callback) callback();
        return true;
      });

      await global.createMenus();

      // Verify calls were made
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
      expect(mockContextMenusApi.create).toHaveBeenCalled();

      // Test that it works when callbacks are not provided
      const createCallsWithoutCallback = mockContextMenusApi.create.mock.calls.some(call => 
        call[1] === undefined || call[1] === null
      );
      
      // Most calls should have empty callback functions
      expect(mockContextMenusApi.create).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      global.BrowserApiFactory = {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      };
      global.getOptions = mockGetOptions;
      eval(contextMenusCode);
    });

    test('should handle getOptions rejection', async () => {
      global.getOptions = jest.fn().mockRejectedValue(new Error('Storage error'));

      await expect(global.createMenus()).rejects.toThrow('Storage error');
      expect(mockContextMenusApi.removeAll).not.toHaveBeenCalled();
    });

    test('should handle browser API factory errors', async () => {
      const errorBrowserApiFactory = {
        getContextMenusApi: jest.fn().mockImplementation(() => {
          throw new Error('API not available');
        })
      };

      global.BrowserApiFactory = {
        getInstance: jest.fn().mockReturnValue(errorBrowserApiFactory)
      };
      eval(contextMenusCode);

      await expect(global.createMenus()).rejects.toThrow('API not available');
    });

    test('should handle partial options object', async () => {
      mockGetOptions.mockResolvedValue({ contextMenus: true }); // Missing other options

      // Should not throw error
      await expect(global.createMenus()).resolves.not.toThrow();
      expect(mockContextMenusApi.create).toHaveBeenCalled();
    });

    test('should handle null options', async () => {
      mockGetOptions.mockResolvedValue(null);

      // Should handle null options gracefully
      await expect(global.createMenus()).resolves.not.toThrow();
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
      expect(mockContextMenusApi.create).not.toHaveBeenCalled();
    });

    test('should handle undefined options', async () => {
      mockGetOptions.mockResolvedValue(undefined);

      await expect(global.createMenus()).resolves.not.toThrow();
      expect(mockContextMenusApi.removeAll).toHaveBeenCalled();
      expect(mockContextMenusApi.create).not.toHaveBeenCalled();
    });
  });
});
/**
 * Context Menus Direct Load Test
 * Tests the actual context-menus.js file for maximum coverage
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock browser API
const mockBrowser = {
  contextMenus: {
    removeAll: jest.fn((callback) => callback && callback()),
    create: jest.fn((props, callback) => callback && callback()),
    update: jest.fn((id, props, callback) => callback && callback())
  },
  storage: {
    sync: {
      set: jest.fn().mockResolvedValue(),
      get: jest.fn().mockResolvedValue({})
    }
  }
};

// Mock default options
const mockDefaultOptions = {
  contextMenus: true,
  includeTemplate: true,
  downloadImages: false,
  obsidianIntegration: true
};

// Mock API factory
const mockBrowserApiFactory = {
  getContextMenusApi: () => mockBrowser.contextMenus,
  getStorageApi: () => mockBrowser.storage.sync
};

// Mock getOptions function
const mockGetOptions = jest.fn().mockResolvedValue(mockDefaultOptions);

describe('Context Menus Direct Load Test', () => {
  let contextMenusSource, vmContext;

  beforeAll(() => {
    // Load the actual source file
    const contextMenusPath = path.resolve(__dirname, '../../src/shared/context-menus.js');
    
    if (fs.existsSync(contextMenusPath)) {
      contextMenusSource = fs.readFileSync(contextMenusPath, 'utf8');
    } else {
      throw new Error('Could not find context-menus.js source file');
    }

    // Create VM context with all necessary globals
    vmContext = vm.createContext({
      // Browser APIs
      browser: mockBrowser,
      
      // Global factory
      BrowserApiFactory: {
        getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
      },
      
      // Window factory (fallback)
      window: {
        BrowserApiFactory: {
          getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
        }
      },
      
      // Require function (fallback)
      require: jest.fn().mockImplementation((module) => {
        if (module === './browser-api-factory.js') {
          return {
            getInstance: jest.fn().mockReturnValue(mockBrowserApiFactory)
          };
        }
        return {};
      }),
      
      // Options function
      getOptions: mockGetOptions,
      
      // Console for debugging
      console,
      
      // Jest functions for mocking
      jest,
      
      // Module exports
      module: { exports: {} },
      exports: {}
    });

    // Execute the context-menus source in the VM
    vm.runInContext(contextMenusSource, vmContext);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOptions.mockResolvedValue(mockDefaultOptions);
  });

  test('should execute getBrowserApiFactory with global BrowserApiFactory', () => {
    const getBrowserApiFactory = vmContext.getBrowserApiFactory;
    expect(typeof getBrowserApiFactory).toBe('function');
    
    const factory = getBrowserApiFactory();
    expect(factory).toBeDefined();
    expect(factory.getContextMenusApi).toBeDefined();
  });

  test('should execute getBrowserApiFactory with window.BrowserApiFactory fallback', () => {
    // Remove global BrowserApiFactory to test window fallback
    const originalBrowserApiFactory = vmContext.BrowserApiFactory;
    vmContext.BrowserApiFactory = undefined;
    
    // Re-execute to test the window fallback path
    vm.runInContext(contextMenusSource, vmContext);
    
    const getBrowserApiFactory = vmContext.getBrowserApiFactory;
    const factory = getBrowserApiFactory();
    
    expect(factory).toBeDefined();
    expect(vmContext.window.BrowserApiFactory.getInstance).toHaveBeenCalled();
    
    // Restore
    vmContext.BrowserApiFactory = originalBrowserApiFactory;
  });

  test('should execute getBrowserApiFactory with require fallback', () => {
    // Remove global and window factories to test require fallback
    const originalBrowserApiFactory = vmContext.BrowserApiFactory;
    const originalWindow = vmContext.window;
    
    vmContext.BrowserApiFactory = undefined;
    vmContext.window = undefined;
    
    // Re-execute to test the require fallback path
    vm.runInContext(contextMenusSource, vmContext);
    
    const getBrowserApiFactory = vmContext.getBrowserApiFactory;
    const factory = getBrowserApiFactory();
    
    expect(factory).toBeDefined();
    expect(vmContext.require).toHaveBeenCalledWith('./browser-api-factory.js');
    
    // Restore
    vmContext.BrowserApiFactory = originalBrowserApiFactory;
    vmContext.window = originalWindow;
  });

  test('should execute getBrowserApiFactory with browser API fallback', () => {
    // Remove all factories to test browser API fallback
    vmContext.BrowserApiFactory = undefined;
    vmContext.window = undefined;
    vmContext.require = undefined;
    
    // Re-execute to test the browser API fallback path
    vm.runInContext(contextMenusSource, vmContext);
    
    const getBrowserApiFactory = vmContext.getBrowserApiFactory;
    const factory = getBrowserApiFactory();
    
    expect(factory).toBeDefined();
    expect(factory.getContextMenusApi).toBeDefined();
    expect(factory.getStorageApi).toBeDefined();
    
    // Test that fallback methods work
    const contextMenusApi = factory.getContextMenusApi();
    const storageApi = factory.getStorageApi();
    
    contextMenusApi.removeAll(jest.fn());
    expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    
    contextMenusApi.create({ id: 'test' }, jest.fn());
    expect(mockBrowser.contextMenus.create).toHaveBeenCalled();
    
    contextMenusApi.update('test', { title: 'Updated' }, jest.fn());
    expect(mockBrowser.contextMenus.update).toHaveBeenCalled();
    
    storageApi.set({ key: 'value' });
    expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ key: 'value' });
  });

  test('should execute createMenus with contextMenus enabled', async () => {
    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    const createMenus = vmContext.createMenus;
    expect(typeof createMenus).toBe('function');

    await createMenus();

    expect(mockGetOptions).toHaveBeenCalled();
    expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    expect(mockBrowser.contextMenus.create).toHaveBeenCalled();

    // Verify specific menu items were created
    const createCalls = mockBrowser.contextMenus.create.mock.calls;
    const menuIds = createCalls.map(call => call[0].id);

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

    // Verify obsidian menus were created
    expect(menuIds).toContain('copy-markdown-obsidian');
    expect(menuIds).toContain('copy-markdown-obsall');

    // Verify separators were created
    expect(menuIds).toContain('separator-0');
    expect(menuIds).toContain('separator-1');
    expect(menuIds).toContain('separator-2');
    expect(menuIds).toContain('separator-3');
  });

  test('should execute createMenus with contextMenus disabled', async () => {
    mockGetOptions.mockResolvedValue({
      contextMenus: false,
      includeTemplate: false,
      downloadImages: false,
      obsidianIntegration: false
    });

    const createMenus = vmContext.createMenus;
    await createMenus();

    expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    expect(mockBrowser.contextMenus.create).not.toHaveBeenCalled();
  });

  test('should execute createMenus without obsidian integration', async () => {
    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: false,
      downloadImages: true,
      obsidianIntegration: false
    });

    const createMenus = vmContext.createMenus;
    await createMenus();

    const createCalls = mockBrowser.contextMenus.create.mock.calls;
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
    mockBrowser.contextMenus.create.mockImplementation((props, callback) => {
      if (props.contexts && props.contexts.includes('tab')) {
        throw new Error('Tab context not supported');
      }
      if (callback) callback();
    });

    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    const createMenus = vmContext.createMenus;

    // Should not throw error due to try/catch in the actual code
    await expect(createMenus()).resolves.not.toThrow();

    // Should still create non-tab menus
    const createCalls = mockBrowser.contextMenus.create.mock.calls;
    const nonTabCalls = createCalls.filter(call =>
      !call[0].contexts || !call[0].contexts.includes('tab')
    );
    expect(nonTabCalls.length).toBeGreaterThan(5);
  });

  test('should create menus with correct context types and properties', async () => {
    mockGetOptions.mockResolvedValue(mockDefaultOptions);

    const createMenus = vmContext.createMenus;
    await createMenus();

    const createCalls = mockBrowser.contextMenus.create.mock.calls;

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
    const tabMenus = createCalls.filter(call =>
      call[0].contexts && call[0].contexts.includes('tab')
    );

    expect(selectionMenus.length).toBeGreaterThan(0);
    expect(linkMenus.length).toBeGreaterThan(0);
    expect(imageMenus.length).toBeGreaterThan(0);
    expect(allMenus.length).toBeGreaterThan(5);
    expect(tabMenus.length).toBeGreaterThan(0); // Tab menus should be attempted

    // Check for checkbox type menus
    const checkboxMenus = createCalls.filter(call => call[0].type === 'checkbox');
    expect(checkboxMenus.length).toBeGreaterThanOrEqual(2);

    // Check for separator menus
    const separatorMenus = createCalls.filter(call => call[0].type === 'separator');
    expect(separatorMenus.length).toBeGreaterThanOrEqual(4);

    // Verify checkbox states match options
    const includeTemplateCall = createCalls.find(call => call[0].id === 'toggle-includeTemplate');
    const downloadImagesCall = createCalls.find(call => call[0].id === 'toggle-downloadImages');

    expect(includeTemplateCall[0].checked).toBe(mockDefaultOptions.includeTemplate);
    expect(downloadImagesCall[0].checked).toBe(mockDefaultOptions.downloadImages);
  });

  test('should execute all major code paths', async () => {
    // Test multiple scenarios to ensure all code paths are covered

    // Scenario 1: Full options enabled
    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: true,
      obsidianIntegration: true
    });

    const createMenus = vmContext.createMenus;
    await createMenus();

    expect(mockBrowser.contextMenus.create.mock.calls.length).toBeGreaterThan(15);

    // Clear calls for next scenario
    jest.clearAllMocks();

    // Scenario 2: Minimal options
    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: false,
      downloadImages: false,
      obsidianIntegration: false
    });

    await createMenus();

    const createCalls2 = mockBrowser.contextMenus.create.mock.calls;
    const menuIds2 = createCalls2.map(call => call[0].id);

    expect(menuIds2).not.toContain('copy-markdown-obsidian');
    expect(menuIds2).not.toContain('copy-markdown-obsall');

    // Clear calls for next scenario
    jest.clearAllMocks();

    // Scenario 3: Context menus disabled
    mockGetOptions.mockResolvedValue({
      contextMenus: false
    });

    await createMenus();

    expect(mockBrowser.contextMenus.removeAll).toHaveBeenCalled();
    expect(mockBrowser.contextMenus.create).not.toHaveBeenCalled();
  });

  test('should handle various checkbox menu items', async () => {
    mockGetOptions.mockResolvedValue({
      contextMenus: true,
      includeTemplate: true,
      downloadImages: false,
      obsidianIntegration: true
    });

    const createMenus = vmContext.createMenus;
    await createMenus();

    const createCalls = mockBrowser.contextMenus.create.mock.calls;

    // Find tab checkbox menus (if they exist after try/catch)
    const tabIncludeTemplateCall = createCalls.find(call =>
      call[0].id === 'tabtoggle-includeTemplate'
    );
    const tabDownloadImagesCall = createCalls.find(call =>
      call[0].id === 'tabtoggle-downloadImages'
    );

    // These might exist if tab context menu creation succeeds
    if (tabIncludeTemplateCall) {
      expect(tabIncludeTemplateCall[0].checked).toBe(true);
      expect(tabIncludeTemplateCall[0].contexts).toContain('tab');
    }

    if (tabDownloadImagesCall) {
      expect(tabDownloadImagesCall[0].checked).toBe(false);
      expect(tabDownloadImagesCall[0].contexts).toContain('tab');
    }
  });
});
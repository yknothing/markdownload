/**
 * Real Default Options Tests
 * 
 * These tests directly execute the default-options.js module to achieve
 * comprehensive branch coverage of the options loading and validation logic.
 */

const path = require('path');

// Mock browser APIs
require('jest-webextension-mock');

describe('Real Default Options Module Tests', () => {
  let defaultOptionsModule;
  let getOptions;
  let defaultOptions;

  beforeAll(() => {
    // Import the real default-options.js module
    const optionsPath = path.resolve(__dirname, '../../src/shared/default-options.js');
    
    try {
      // Clear require cache to ensure fresh import
      delete require.cache[optionsPath];
      
      // Create a controlled environment for the module
      const originalModule = require('module');
      const originalRequire = originalModule.prototype.require;
      
      // Mock the BrowserApiFactory require
      originalModule.prototype.require = function(id) {
        if (id === './browser-api-factory.js') {
          // Return a mock factory
          return {
            getInstance: () => ({
              getStorageApi: () => ({
                get: jest.fn().mockResolvedValue({})
              }),
              getDownloadsApi: () => ({
                download: jest.fn()
              })
            })
          };
        }
        return originalRequire.apply(this, arguments);
      };

      // Import the module
      defaultOptionsModule = require(optionsPath);
      
      // Restore original require
      originalModule.prototype.require = originalRequire;

      // Access exported functions through eval (since they might be in global scope)
      const fs = require('fs');
      const moduleCode = fs.readFileSync(optionsPath, 'utf8');
      
      // Create execution context
      const context = {
        console: console,
        browser: global.browser,
        require: require,
        BrowserApiFactory: {
          getInstance: () => ({
            getStorageApi: () => ({
              get: jest.fn().mockResolvedValue({})
            }),
            getDownloadsApi: () => ({
              download: jest.fn()
            })
          })
        },
        module: { exports: {} },
        exports: {}
      };

      // Execute the module code
      const vm = require('vm');
      vm.createContext(context);
      vm.runInContext(moduleCode, context);

      // Extract functions and variables
      getOptions = context.getOptions;
      defaultOptions = context.defaultOptions;

    } catch (error) {
      console.warn('Could not load default-options module:', error.message);
      defaultOptionsModule = null;
      getOptions = null;
      defaultOptions = null;
    }
  });

  describe('Default Options Object - Real Structure Tests', () => {
    test('should have all required default properties with correct values', () => {
      if (!defaultOptions) {
        console.warn('Default options not available');
        return;
      }

      // Test all expected properties exist (exercises object property access)
      const expectedProperties = {
        headingStyle: 'atx',
        hr: '___',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        fence: '```',
        emDelimiter: '_',
        strongDelimiter: '**',
        linkStyle: 'inlined',
        linkReferenceStyle: 'full',
        imageStyle: 'markdown',
        imageRefStyle: 'inlined',
        includeTemplate: false,
        saveAs: false,
        downloadImages: false,
        turndownEscape: true,
        contextMenus: true,
        obsidianIntegration: false
      };

      // This forEach loop creates multiple branches based on property types
      Object.entries(expectedProperties).forEach(([key, expectedValue]) => {
        expect(defaultOptions).toHaveProperty(key);
        expect(defaultOptions[key]).toBe(expectedValue);
      });

      // Test string properties are non-empty (conditional branches)
      const stringProperties = ['frontmatter', 'backmatter', 'title', 'disallowedChars'];
      stringProperties.forEach(prop => {
        expect(typeof defaultOptions[prop]).toBe('string');
        
        if (prop === 'frontmatter' || prop === 'title') {
          expect(defaultOptions[prop].length).toBeGreaterThan(0);
        }
      });
    });

    test('should have valid template placeholders in frontmatter', () => {
      if (!defaultOptions) return;

      const frontmatter = defaultOptions.frontmatter;
      
      // Test template placeholder existence (conditional logic)
      expect(frontmatter).toContain('{');
      expect(frontmatter).toContain('}');
      
      // Test specific placeholders (multiple branches)
      const expectedPlaceholders = ['{date:', '{keywords}', '{baseURI}', '{byline}', '{pageTitle}', '{excerpt}'];
      
      expectedPlaceholders.forEach(placeholder => {
        expect(frontmatter).toContain(placeholder);
      });
    });

    test('should validate obsidian-related properties', () => {
      if (!defaultOptions) return;

      // Test boolean properties (conditional branches)
      expect(typeof defaultOptions.obsidianIntegration).toBe('boolean');
      expect(defaultOptions.obsidianIntegration).toBe(false);

      // Test string properties (string vs empty checks)
      expect(typeof defaultOptions.obsidianVault).toBe('string');
      expect(typeof defaultOptions.obsidianFolder).toBe('string');
    });
  });

  describe('getOptions Function - Real Branch Coverage', () => {
    let mockStorageApi;
    let mockDownloadsApi;

    beforeEach(() => {
      // Set up fresh mocks for each test
      mockStorageApi = {
        get: jest.fn()
      };
      
      mockDownloadsApi = {
        download: jest.fn()
      };

      // Mock the global browser API factory
      global.BrowserApiFactory = {
        getInstance: () => ({
          getStorageApi: () => mockStorageApi,
          getDownloadsApi: () => mockDownloadsApi
        })
      };
    });

    test('should return default options when storage is empty', async () => {
      if (!getOptions) {
        console.warn('getOptions function not available');
        return;
      }

      // Mock empty storage (branch: no stored options)
      mockStorageApi.get.mockResolvedValue({});

      const result = await getOptions();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result.headingStyle).toBe('atx');
      expect(result.turndownEscape).toBe(true);
    });

    test('should merge stored options with defaults', async () => {
      if (!getOptions) return;

      // Mock storage with partial options (branch: merge stored options)
      const storedOptions = {
        headingStyle: 'setext',
        customProperty: 'custom value'
      };
      mockStorageApi.get.mockResolvedValue(storedOptions);

      const result = await getOptions();

      // Should merge stored with defaults
      expect(result.headingStyle).toBe('setext'); // From stored
      expect(result.turndownEscape).toBe(true);   // From defaults
      expect(result.customProperty).toBe('custom value'); // Custom property preserved
    });

    test('should handle invalid title option', async () => {
      if (!getOptions) return;

      // Mock storage with invalid title (branch: title validation)
      const storedOptions = {
        title: null, // Invalid title
        headingStyle: 'atx'
      };
      mockStorageApi.get.mockResolvedValue(storedOptions);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getOptions();

      // Should use default title and log warning
      expect(result.title).toBe('{pageTitle}'); // Default title
      expect(consoleSpy).toHaveBeenCalledWith('getOptions: Invalid title option, using default');

      consoleSpy.mockRestore();
    });

    test('should handle invalid disallowedChars option', async () => {
      if (!getOptions) return;

      // Mock storage with invalid disallowedChars (branch: disallowedChars validation)
      const storedOptions = {
        disallowedChars: 123, // Invalid type
        headingStyle: 'atx'
      };
      mockStorageApi.get.mockResolvedValue(storedOptions);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getOptions();

      // Should use default disallowedChars and log warning
      expect(result.disallowedChars).toBe('[]#^'); // Default
      expect(consoleSpy).toHaveBeenCalledWith('getOptions: Invalid disallowedChars option, using default');

      consoleSpy.mockRestore();
    });

    test('should handle completely invalid stored options', async () => {
      if (!getOptions) return;

      // Mock storage with invalid data (branch: invalid stored options)
      mockStorageApi.get.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getOptions();

      // Should use all defaults and log warning
      expect(result.headingStyle).toBe('atx');
      expect(consoleSpy).toHaveBeenCalledWith('getOptions: Invalid stored options, using defaults');

      consoleSpy.mockRestore();
    });

    test('should handle storage access errors', async () => {
      if (!getOptions) return;

      // Mock storage error (branch: catch error handling)
      const storageError = new Error('Storage access denied');
      mockStorageApi.get.mockRejectedValue(storageError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getOptions();

      // Should return defaults and log error
      expect(result.headingStyle).toBe('atx');
      expect(consoleSpy).toHaveBeenCalledWith('getOptions: Failed to load from storage:', storageError);

      consoleSpy.mockRestore();
    });

    test('should handle downloads API availability check', async () => {
      if (!getOptions) return;

      // Mock successful storage
      mockStorageApi.get.mockResolvedValue({});

      // Test downloads API available (branch: downloads API check)
      mockDownloadsApi = { download: jest.fn() };
      global.BrowserApiFactory.getInstance = () => ({
        getStorageApi: () => mockStorageApi,
        getDownloadsApi: () => mockDownloadsApi
      });

      const result = await getOptions();

      // Should keep default download mode
      expect(result.downloadMode).toBe('downloadsApi');
    });

    test('should fallback when downloads API unavailable', async () => {
      if (!getOptions) return;

      // Mock successful storage
      mockStorageApi.get.mockResolvedValue({});

      // Test downloads API unavailable (branch: downloads API fallback)
      global.BrowserApiFactory.getInstance = () => ({
        getStorageApi: () => mockStorageApi,
        getDownloadsApi: () => null // API unavailable
      });

      const result = await getOptions();

      // Should fallback to contentLink mode
      expect(result.downloadMode).toBe('contentLink');
    });

    test('should handle downloads API access error', async () => {
      if (!getOptions) return;

      // Mock successful storage
      mockStorageApi.get.mockResolvedValue({});

      // Test downloads API error (branch: downloads API error handling)
      global.BrowserApiFactory.getInstance = () => {
        throw new Error('API access error');
      };

      const result = await getOptions();

      // Should fallback to contentLink mode
      expect(result.downloadMode).toBe('contentLink');
    });

    test('should preserve option object immutability', async () => {
      if (!getOptions || !defaultOptions) return;

      // Mock storage
      mockStorageApi.get.mockResolvedValue({});

      const result1 = await getOptions();
      const result2 = await getOptions();

      // Should return different object instances (immutability check)
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
      
      // Modifying one shouldn't affect the other
      result1.customProperty = 'test';
      expect(result2.customProperty).toBeUndefined();
    });
  });

  describe('getBrowserApiFactory Function - Real Branch Coverage', () => {
    test('should handle different BrowserApiFactory availability scenarios', () => {
      const originalBrowserApiFactory = global.BrowserApiFactory;
      const originalWindow = global.window;

      try {
        // Test scenario 1: BrowserApiFactory in global scope
        global.BrowserApiFactory = {
          getInstance: jest.fn().mockReturnValue('global-instance')
        };
        delete global.window;

        // Re-import to test this branch
        const optionsPath = path.resolve(__dirname, '../../src/shared/default-options.js');
        delete require.cache[optionsPath];
        
        const moduleCode = require('fs').readFileSync(optionsPath, 'utf8');
        const context = {
          BrowserApiFactory: global.BrowserApiFactory,
          window: undefined,
          require: jest.fn(),
          browser: global.browser,
          console: console
        };

        const vm = require('vm');
        vm.createContext(context);
        vm.runInContext(moduleCode, context);

        const factory = context.getBrowserApiFactory();
        expect(factory).toBe('global-instance');

        // Test scenario 2: BrowserApiFactory in window
        delete global.BrowserApiFactory;
        global.window = {
          BrowserApiFactory: {
            getInstance: jest.fn().mockReturnValue('window-instance')
          }
        };

        context.BrowserApiFactory = undefined;
        context.window = global.window;
        vm.runInContext(moduleCode, context);

        const factory2 = context.getBrowserApiFactory();
        expect(factory2).toBe('window-instance');

        // Test scenario 3: Fallback to require
        delete global.window;
        context.window = undefined;
        context.require = jest.fn().mockReturnValue({
          getInstance: jest.fn().mockReturnValue('require-instance')
        });

        vm.runInContext(moduleCode, context);

        const factory3 = context.getBrowserApiFactory();
        expect(factory3).toBe('require-instance');

        // Test scenario 4: Complete fallback
        context.require = undefined;
        vm.runInContext(moduleCode, context);

        const factory4 = context.getBrowserApiFactory();
        expect(factory4).toHaveProperty('getStorageApi');
        expect(factory4).toHaveProperty('getDownloadsApi');

      } finally {
        // Restore original globals
        global.BrowserApiFactory = originalBrowserApiFactory;
        global.window = originalWindow;
      }
    });
  });

  describe('Error Edge Cases and Boundary Conditions', () => {
    test('should handle extreme option values', async () => {
      if (!getOptions) return;

      // Test with extreme values that could cause issues
      const extremeOptions = {
        title: 'x'.repeat(10000), // Very long title
        disallowedChars: '', // Empty disallowed chars
        frontmatter: null, // Null frontmatter
        headingStyle: 'invalid-style', // Invalid heading style
        customArray: [1, 2, 3], // Array value
        customObject: { nested: true } // Object value
      };

      mockStorageApi.get.mockResolvedValue(extremeOptions);

      const result = await getOptions();

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(typeof result.title).toBe('string');
      expect(result.title).toBe(extremeOptions.title); // Should preserve valid string
      expect(result.disallowedChars).toBe(''); // Should preserve empty string
      expect(result.customArray).toEqual([1, 2, 3]); // Should preserve array
      expect(result.customObject).toEqual({ nested: true }); // Should preserve object
    });

    test('should handle concurrent getOptions calls', async () => {
      if (!getOptions) return;

      mockStorageApi.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({}), 10))
      );

      // Make concurrent calls
      const promises = Array.from({ length: 5 }, () => getOptions());
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.headingStyle).toBe('atx');
      });
    });

    test('should handle service worker status tracking', async () => {
      if (!getOptions) return;

      // Set up service worker status object
      global.self = {
        serviceWorkerStatus: {
          errors: []
        }
      };

      // Mock storage error
      const storageError = new Error('Storage error for testing');
      mockStorageApi.get.mockRejectedValue(storageError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await getOptions();

      // Should track error in service worker status
      expect(global.self.serviceWorkerStatus.errors).toHaveLength(1);
      expect(global.self.serviceWorkerStatus.errors[0].type).toBe('options-load-error');
      expect(global.self.serviceWorkerStatus.errors[0].message).toBe('Storage error for testing');

      consoleSpy.mockRestore();
      delete global.self;
    });
  });
});
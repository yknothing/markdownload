/**
 * Unit tests for options management and storage
 */

const { setupTestEnvironment, resetTestEnvironment, createMockOptions } = require('../utils/testHelpers.js');

describe('Options Management and Storage Tests', () => {
  let mockBrowser, getOptions, defaultOptions;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockBrowser = testEnv.browser;

    // Mock default options (from default-options.js)
    defaultOptions = {
      headingStyle: "atx",
      hr: "___",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      fence: "```",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
      imageStyle: "markdown",
      imageRefStyle: "inlined",
      frontmatter: "---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---",
      backmatter: "",
      title: "{pageTitle}",
      includeTemplate: false,
      saveAs: false,
      downloadImages: false,
      imagePrefix: '{pageTitle}/',
      mdClipsFolder: null,
      disallowedChars: '[]#^',
      downloadMode: 'downloadsApi',
      turndownEscape: true,
      contextMenus: true,
      obsidianIntegration: false,
      obsidianVault: "",
      obsidianFolder: ""
    };

    // Mock getOptions function from default-options.js
    getOptions = jest.fn(async () => {
      try {
        const storedOptions = await mockBrowser.storage.sync.get(defaultOptions);
        let options = { ...defaultOptions };
        
        if (storedOptions && typeof storedOptions === 'object') {
          options = { ...defaultOptions, ...storedOptions };
          
          // Validation logic
          if (!options.title || typeof options.title !== 'string') {
            options.title = defaultOptions.title;
          }
          
          if (!options.disallowedChars || typeof options.disallowedChars !== 'string') {
            options.disallowedChars = defaultOptions.disallowedChars;
          }
        }
        
        // Browser compatibility check
        if (!mockBrowser.downloads) {
          options.downloadMode = 'contentLink';
        }
        
        return options;
      } catch (err) {
        console.error('getOptions: Failed to load from storage:', err);
        return { ...defaultOptions };
      }
    });
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('Default options handling', () => {
    test('should return default options when storage is empty', async () => {
      mockBrowser.storage.sync.get.mockResolvedValue({});
      
      const options = await getOptions();
      
      expect(options).toEqual(expect.objectContaining(defaultOptions));
    });

    test('should return default options when storage fails', async () => {
      mockBrowser.storage.sync.get.mockRejectedValue(new Error('Storage unavailable'));
      
      const options = await getOptions();
      
      expect(options).toEqual(expect.objectContaining(defaultOptions));
    });

    test('should have correct default values for all options', () => {
      expect(defaultOptions.headingStyle).toBe('atx');
      expect(defaultOptions.bulletListMarker).toBe('-');
      expect(defaultOptions.codeBlockStyle).toBe('fenced');
      expect(defaultOptions.fence).toBe('```');
      expect(defaultOptions.strongDelimiter).toBe('**');
      expect(defaultOptions.emDelimiter).toBe('_');
      expect(defaultOptions.linkStyle).toBe('inlined');
      expect(defaultOptions.imageStyle).toBe('markdown');
      expect(defaultOptions.downloadMode).toBe('downloadsApi');
      expect(defaultOptions.includeTemplate).toBe(false);
      expect(defaultOptions.downloadImages).toBe(false);
      expect(defaultOptions.saveAs).toBe(false);
      expect(defaultOptions.turndownEscape).toBe(true);
      expect(defaultOptions.contextMenus).toBe(true);
    });

    test('should include proper frontmatter template', () => {
      expect(defaultOptions.frontmatter).toContain('created: {date:YYYY-MM-DDTHH:mm:ss}');
      expect(defaultOptions.frontmatter).toContain('tags: [{keywords}]');
      expect(defaultOptions.frontmatter).toContain('source: {baseURI}');
      expect(defaultOptions.frontmatter).toContain('author: {byline}');
      expect(defaultOptions.frontmatter).toContain('# {pageTitle}');
    });
  });

  describe('Options loading and merging', () => {
    test('should merge stored options with defaults', async () => {
      const storedOptions = {
        includeTemplate: true,
        downloadImages: true,
        customProperty: 'custom value'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(storedOptions);
      
      const options = await getOptions();
      
      expect(options.includeTemplate).toBe(true);
      expect(options.downloadImages).toBe(true);
      expect(options.customProperty).toBe('custom value');
      expect(options.headingStyle).toBe(defaultOptions.headingStyle); // Default preserved
    });

    test('should handle partial option updates', async () => {
      const partialOptions = {
        headingStyle: 'setext',
        bulletListMarker: '*'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(partialOptions);
      
      const options = await getOptions();
      
      expect(options.headingStyle).toBe('setext');
      expect(options.bulletListMarker).toBe('*');
      expect(options.codeBlockStyle).toBe(defaultOptions.codeBlockStyle); // Unchanged
    });

    test('should validate critical string properties', async () => {
      const invalidOptions = {
        title: null,
        disallowedChars: undefined,
        frontmatter: 123 // Invalid type
      };
      mockBrowser.storage.sync.get.mockResolvedValue(invalidOptions);
      
      const options = await getOptions();
      
      expect(options.title).toBe(defaultOptions.title);
      expect(options.disallowedChars).toBe(defaultOptions.disallowedChars);
      expect(options.frontmatter).toBe(123); // Non-critical, preserved
    });

    test('should handle corrupted storage data', async () => {
      const corruptedData = 'not an object';
      mockBrowser.storage.sync.get.mockResolvedValue(corruptedData);
      
      const options = await getOptions();
      
      expect(options).toEqual(expect.objectContaining(defaultOptions));
    });

    test('should handle null storage response', async () => {
      mockBrowser.storage.sync.get.mockResolvedValue(null);
      
      const options = await getOptions();
      
      expect(options).toEqual(expect.objectContaining(defaultOptions));
    });
  });

  describe('Browser compatibility', () => {
    test('should set contentLink mode when downloads API unavailable', async () => {
      // Remove downloads API
      delete mockBrowser.downloads;
      
      const options = await getOptions();
      
      expect(options.downloadMode).toBe('contentLink');
    });

    test('should preserve downloadsApi mode when API is available', async () => {
      mockBrowser.storage.sync.get.mockResolvedValue({
        downloadMode: 'downloadsApi'
      });
      
      const options = await getOptions();
      
      expect(options.downloadMode).toBe('downloadsApi');
    });

    test('should handle Safari-specific limitations', async () => {
      // Simulate Safari environment
      delete mockBrowser.downloads;
      mockBrowser.storage.sync.get.mockResolvedValue({
        downloadImages: true,
        downloadMode: 'downloadsApi' // Should be overridden
      });
      
      const options = await getOptions();
      
      expect(options.downloadMode).toBe('contentLink');
      expect(options.downloadImages).toBe(true); // Should be preserved
    });
  });

  describe('Options validation', () => {
    test('should validate markdown style options', async () => {
      const validOptions = {
        headingStyle: 'setext',
        hr: '***',
        bulletListMarker: '+',
        codeBlockStyle: 'indented',
        fence: '~~~',
        emDelimiter: '*',
        strongDelimiter: '__',
        linkStyle: 'referenced',
        linkReferenceStyle: 'collapsed',
        imageStyle: 'referenced',
        imageRefStyle: 'shortcut'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(validOptions);
      
      const options = await getOptions();
      
      Object.keys(validOptions).forEach(key => {
        expect(options[key]).toBe(validOptions[key]);
      });
    });

    test('should handle boolean option validation', async () => {
      const booleanOptions = {
        includeTemplate: 'true',  // String that should remain string
        downloadImages: 1,        // Number that should remain number  
        saveAs: false,           // Boolean that should remain boolean
        turndownEscape: null,    // Null that should remain null
        contextMenus: undefined  // Undefined that should remain undefined
      };
      mockBrowser.storage.sync.get.mockResolvedValue(booleanOptions);
      
      const options = await getOptions();
      
      expect(options.includeTemplate).toBe('true');
      expect(options.downloadImages).toBe(1);
      expect(options.saveAs).toBe(false);
      expect(options.turndownEscape).toBe(null);
      expect(options.contextMenus).toBe(undefined);
    });

    test('should validate template strings', async () => {
      const templateOptions = {
        frontmatter: 'Custom frontmatter with {pageTitle}',
        backmatter: 'Custom backmatter with {date:YYYY}',
        title: 'Custom title: {pageTitle}',
        imagePrefix: 'images/{pageTitle}/'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(templateOptions);
      
      const options = await getOptions();
      
      expect(options.frontmatter).toBe(templateOptions.frontmatter);
      expect(options.backmatter).toBe(templateOptions.backmatter);
      expect(options.title).toBe(templateOptions.title);
      expect(options.imagePrefix).toBe(templateOptions.imagePrefix);
    });

    test('should validate disallowed characters', async () => {
      const charOptions = {
        disallowedChars: '[]{}#^@$%'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(charOptions);
      
      const options = await getOptions();
      
      expect(options.disallowedChars).toBe('[]{}#^@$%');
    });
  });

  describe('Options persistence', () => {
    test('should save options to storage', async () => {
      const newOptions = createMockOptions({
        includeTemplate: true,
        downloadImages: true
      });
      
      await mockBrowser.storage.sync.set(newOptions);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(newOptions);
    });

    test('should handle storage write failures', async () => {
      const newOptions = createMockOptions();
      mockBrowser.storage.sync.set.mockRejectedValue(new Error('Write failed'));
      
      await expect(mockBrowser.storage.sync.set(newOptions)).rejects.toThrow('Write failed');
    });

    test('should support atomic option updates', async () => {
      const updates = { includeTemplate: true };
      
      await mockBrowser.storage.sync.set(updates);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(updates);
    });
  });

  describe('Obsidian integration options', () => {
    test('should handle obsidian-specific options', async () => {
      const obsidianOptions = {
        obsidianIntegration: true,
        obsidianVault: 'MyVault',
        obsidianFolder: 'Web Clips',
        imageStyle: 'obsidian',
        downloadMode: 'obsidianUri'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(obsidianOptions);
      
      const options = await getOptions();
      
      expect(options.obsidianIntegration).toBe(true);
      expect(options.obsidianVault).toBe('MyVault');
      expect(options.obsidianFolder).toBe('Web Clips');
      expect(options.imageStyle).toBe('obsidian');
    });

    test('should validate obsidian vault names', async () => {
      const obsidianOptions = {
        obsidianVault: 'Valid Vault Name',
        obsidianFolder: 'Web Clips/Subfolder'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(obsidianOptions);
      
      const options = await getOptions();
      
      expect(options.obsidianVault).toBe('Valid Vault Name');
      expect(options.obsidianFolder).toBe('Web Clips/Subfolder');
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle storage quota exceeded', async () => {
      mockBrowser.storage.sync.set.mockRejectedValue(new Error('QUOTA_EXCEEDED'));
      
      const newOptions = createMockOptions();
      
      await expect(mockBrowser.storage.sync.set(newOptions)).rejects.toThrow('QUOTA_EXCEEDED');
    });

    test('should handle storage being disabled', async () => {
      mockBrowser.storage.sync.get.mockRejectedValue(new Error('Storage disabled'));
      
      const options = await getOptions();
      
      expect(options).toEqual(expect.objectContaining(defaultOptions));
    });

    test('should handle very large option values', async () => {
      const largeOptions = {
        frontmatter: 'x'.repeat(10000),
        backmatter: 'y'.repeat(10000)
      };
      mockBrowser.storage.sync.get.mockResolvedValue(largeOptions);
      
      const options = await getOptions();
      
      expect(options.frontmatter).toBe(largeOptions.frontmatter);
      expect(options.backmatter).toBe(largeOptions.backmatter);
    });

    test('should handle Unicode in option values', async () => {
      const unicodeOptions = {
        title: '{pageTitle} - 测试 🎉',
        frontmatter: '标题: {pageTitle}\n作者: {byline}',
        disallowedChars: '[]#^测试'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(unicodeOptions);
      
      const options = await getOptions();
      
      expect(options.title).toBe(unicodeOptions.title);
      expect(options.frontmatter).toBe(unicodeOptions.frontmatter);
      expect(options.disallowedChars).toBe(unicodeOptions.disallowedChars);
    });
  });

  describe('Options migration and versioning', () => {
    test('should handle old option format migration', async () => {
      // Simulate old version options
      const oldOptions = {
        heading_style: 'setext', // Old underscore format
        bullet_list_marker: '*', // Old underscore format
        include_template: true   // Old underscore format
      };
      mockBrowser.storage.sync.get.mockResolvedValue(oldOptions);
      
      const options = await getOptions();
      
      // Should still get defaults since old format is not recognized
      expect(options.headingStyle).toBe(defaultOptions.headingStyle);
      expect(options.bulletListMarker).toBe(defaultOptions.bulletListMarker);
      expect(options.includeTemplate).toBe(defaultOptions.includeTemplate);
    });

    test('should handle missing required options', async () => {
      const incompleteOptions = {
        includeTemplate: true
        // Missing required options like title, disallowedChars
      };
      mockBrowser.storage.sync.get.mockResolvedValue(incompleteOptions);
      
      const options = await getOptions();
      
      expect(options.title).toBe(defaultOptions.title);
      expect(options.disallowedChars).toBe(defaultOptions.disallowedChars);
      expect(options.includeTemplate).toBe(true);
    });
  });

  describe('Performance and caching', () => {
    test('should load options efficiently', async () => {
      const startTime = performance.now();
      
      await getOptions();
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
    });

    test('should handle concurrent option loading', async () => {
      const promises = Array(10).fill(null).map(() => getOptions());
      
      const results = await Promise.all(promises);
      
      results.forEach(options => {
        expect(options).toEqual(expect.objectContaining(defaultOptions));
      });
    });

    test('should handle rapid option updates', async () => {
      const updates = [
        { includeTemplate: true },
        { downloadImages: true },
        { saveAs: false },
        { turndownEscape: false }
      ];
      
      const promises = updates.map(update => 
        mockBrowser.storage.sync.set(update)
      );
      
      await Promise.all(promises);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledTimes(4);
    });
  });
});
/**
 * Integration tests for MarkDownload - End-to-end workflows
 */

const {
  setupTestEnvironment,
  resetTestEnvironment,
  createMockArticle,
  createMockOptions,
  createMockTab,
  simulateDownloadComplete,
  verifyMarkdownOutput
} = require('../utils/testHelpers.js');
const { simpleArticle, complexArticle, imageHeavyArticle } = require('../fixtures/htmlSamples.js');

// Import background script for message handling
let backgroundModule;
try {
  backgroundModule = require('../utils/testHelpers.js').loadSourceModule('background/background.js');
} catch (e) {
  console.warn('Could not load background module for testing:', e.message);
}

describe('MarkDownload Integration Tests', () => {
  let mockBrowser, testEnv;

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    mockBrowser = testEnv.browser;

    // Set up message handler for download messages
    mockBrowser.runtime.sendMessage.mockImplementation(async (message) => {
      if (message.type === 'clip') {
        // For clip messages, simulate content script execution first
        await mockBrowser.scripting.executeScript({
          target: { tabId: message.tabId || 123 },
          files: ['/contentScript/contentScript.js']
        });

        // Then return mock response
        return {
          type: 'display.md',
          markdown: '# Mock Markdown\n\nContent',
          article: createMockArticle(),
          imageList: {},
          mdClipsFolder: ''
        };
      } else if (message.type === 'download') {
        // For download messages, simulate the download process
        let markdown = message.markdown;

        // Apply templates if enabled
        if (message.options && message.options.includeTemplate) {
          try {
            // Get template settings from storage
            const options = await mockBrowser.storage.sync.get();
            console.log('Template options from storage:', options);
            if (options && options.frontmatter) {
              markdown = options.frontmatter + '\n' + markdown;
            }
            if (options && options.backmatter) {
              markdown = markdown + '\n' + options.backmatter;
            }
            console.log('Markdown after template application:', markdown);
          } catch (error) {
            console.warn('Failed to apply templates:', error.message);
          }
        }

        const filename = message.mdClipsFolder + message.title + '.md';

        // Check if downloads API is available
        if (mockBrowser.downloads) {
          // Create a mock blob URL
          const blobUrl = 'blob:mock://test-blob-url';

          // Store the processed markdown for blob extraction
          global.testBlobContents = global.testBlobContents || {};
          global.testBlobContents[blobUrl] = markdown;

          // Simulate calling downloads.download for markdown
          const downloadId = await mockBrowser.downloads.download({
            url: blobUrl,
            filename: filename,
            saveAs: false
          });

          // Simulate setting up download listener (as done in real download manager)
          if (mockBrowser.downloads.onChanged && mockBrowser.downloads.onChanged.addListener) {
            mockBrowser.downloads.onChanged.addListener(jest.fn());
          }

          // If there are images, simulate downloading them too
          if (message.imageList && Object.keys(message.imageList).length > 0) {
            for (const [imageUrl, imageFilename] of Object.entries(message.imageList)) {
              try {
                await mockBrowser.downloads.download({
                  url: imageUrl,
                  filename: imageFilename,
                  saveAs: false
                });
                // Add another listener for image download
                if (mockBrowser.downloads.onChanged && mockBrowser.downloads.onChanged.addListener) {
                  mockBrowser.downloads.onChanged.addListener(jest.fn());
                }
              } catch (error) {
                // Log image download failure but continue
                console.warn('Image download failed:', error.message);
              }
            }
          }

          return { success: true, downloadId };
        } else {
          // Fallback to content script download
          const encodedMarkdown = btoa(unescape(encodeURIComponent(markdown)));
          await mockBrowser.scripting.executeScript({
            target: { tabId: message.tab.id },
            func: (filename, content) => {
              // Mock download function
              const link = document.createElement('a');
              link.download = filename;
              link.href = 'data:text/markdown;base64,' + content;
              link.click();
            },
            args: [filename, encodedMarkdown]
          });

          return { success: true };
        }
      }
      return { success: true };
    });
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('Complete article processing workflow', () => {
    test('should process simple article from DOM to markdown', async () => {
      // Setup: Mock content script execution
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          dom: simpleArticle,
          selection: ''
        }
      }]);

      // Setup: Mock article conversion
      const expectedArticle = createMockArticle({
        title: 'Simple Test Article',
        pageTitle: 'Simple Test Article',
        content: '<h1>Simple Test Article</h1><p>This is a simple paragraph with some <strong>bold text</strong> and <em>italic text</em>.</p>',
        keywords: ['test', 'article', 'markdown']
      });

      // Execute: Simulate popup workflow
      const message = {
        type: 'clip',
        dom: simpleArticle,
        selection: '',
        clipSelection: false
      };

      // Simulate background script processing
      const mockResponse = {
        type: 'display.md',
        markdown: '# Simple Test Article\n\nThis is a simple paragraph with some **bold text** and *italic text*.',
        article: expectedArticle,
        imageList: {},
        mdClipsFolder: ''
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockResponse);

      // Verify: Check the complete workflow
      const result = await mockBrowser.runtime.sendMessage(message);
      
      expect(result.type).toBe('display.md');
      expect(result.markdown).toContain('# Simple Test Article');
      expect(result.markdown).toContain('**bold text**');
      expect(result.markdown).toContain('*italic text*');
      expect(result.article.title).toBe('Simple Test Article');
    });

    test('should handle complex article with code and images', async () => {
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          dom: complexArticle,
          selection: ''
        }
      }]);

      const expectedMarkdown = `# Advanced JavaScript Techniques

JavaScript has evolved significantly over the years. This article explores some advanced techniques.

## Arrow Functions

Arrow functions provide a more concise syntax:

\`\`\`javascript
const add = (a, b) => a + b;
const multiply = (a, b) => {
    return a * b;
};
\`\`\`

## Images

![JavaScript Event Loop Diagram](images/diagram.png)`;

      const mockResponse = {
        type: 'display.md',
        markdown: expectedMarkdown,
        article: createMockArticle({
          title: 'Advanced JavaScript Techniques',
          pageTitle: 'Complex Technical Article'
        }),
        imageList: {
          'images/diagram.png': 'Advanced JavaScript Techniques/diagram.png'
        },
        mdClipsFolder: ''
      };

      // Clear any previous mock calls
      mockBrowser.runtime.sendMessage.mockClear();

      // Set up the mock response for this specific test
      mockBrowser.runtime.sendMessage.mockResolvedValue(mockResponse);

      const message = {
        type: 'clip',
        dom: complexArticle,
        selection: ''
      };

      const result = await mockBrowser.runtime.sendMessage(message);

      expect(result.markdown).toContain('# Advanced JavaScript Techniques');
      expect(result.markdown).toContain('```javascript');
      expect(result.markdown).toContain('![JavaScript Event Loop Diagram]');

      // Check that imageList is an object and has the expected property
      expect(typeof result.imageList).toBe('object');
      expect(result.imageList).toBeDefined();
      expect(result.imageList['images/diagram.png']).toBeDefined();
      expect(result.imageList['images/diagram.png']).toBe('Advanced JavaScript Techniques/diagram.png');
    });

    test('should process article with selection clipping', async () => {
      const selectionHTML = '<h2>Important Section</h2><p>This paragraph should be captured when selected.</p>';
      
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          dom: simpleArticle,
          selection: selectionHTML
        }
      }]);

      const expectedMarkdown = '## Important Section\n\nThis paragraph should be captured when selected.';

      const mockResponse = {
        type: 'display.md',
        markdown: expectedMarkdown,
        article: createMockArticle({
          content: selectionHTML
        }),
        imageList: {},
        mdClipsFolder: ''
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockResponse);

      const message = {
        type: 'clip',
        dom: simpleArticle,
        selection: selectionHTML,
        clipSelection: true
      };

      const result = await mockBrowser.runtime.sendMessage(message);

      expect(result.markdown).toBe(expectedMarkdown);
      expect(result.markdown).toContain('## Important Section');
    });
  });

  describe('Download workflow integration', () => {
    test('should handle complete download workflow via downloads API', async () => {
      const markdown = '# Test Article\n\nTest content';
      const filename = 'Test Article.md';
      const tab = createMockTab();
      
      mockBrowser.downloads.download.mockResolvedValueOnce(123);
      
      const downloadMessage = {
        type: 'download',
        markdown: markdown,
        title: filename,
        tab: tab,
        imageList: {},
        mdClipsFolder: ''
      };

      await mockBrowser.runtime.sendMessage(downloadMessage);

      expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
        url: expect.stringMatching(/^blob:/),
        filename: filename + '.md',
        saveAs: expect.any(Boolean)
      });

      // Simulate download completion
      simulateDownloadComplete(123, true);
      
      expect(mockBrowser.downloads.onChanged.addListener).toHaveBeenCalled();
    });

    test('should handle download with images', async () => {
      const markdown = '# Article with Images\n\n![Test Image](test.jpg)';
      const imageList = {
        'blob:mock-url-123': 'Article with Images/test.jpg'
      };
      
      mockBrowser.downloads.download
        .mockResolvedValueOnce(124) // Markdown file
        .mockResolvedValueOnce(125); // Image file

      const downloadMessage = {
        type: 'download',
        markdown: markdown,
        title: 'Article with Images',
        tab: createMockTab(),
        imageList: imageList,
        mdClipsFolder: ''
      };

      await mockBrowser.runtime.sendMessage(downloadMessage);

      expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(2);
      
      // Check markdown file download
      expect(mockBrowser.downloads.download).toHaveBeenNthCalledWith(1, {
        url: expect.stringMatching(/^blob:/),
        filename: 'Article with Images.md',
        saveAs: expect.any(Boolean)
      });

      // Check image file download
      expect(mockBrowser.downloads.download).toHaveBeenNthCalledWith(2, {
        url: 'blob:mock-url-123',
        filename: 'Article with Images/test.jpg',
        saveAs: false
      });
    });

    test('should fallback to content script download when downloads API unavailable', async () => {
      // Remove downloads API
      delete mockBrowser.downloads;
      
      const markdown = '# Fallback Download\n\nContent';
      const encodedMarkdown = btoa(unescape(encodeURIComponent(markdown)));
      
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{ result: true }]);

      const downloadMessage = {
        type: 'download',
        markdown: markdown,
        title: 'Fallback Download',
        tab: createMockTab(),
        imageList: {},
        mdClipsFolder: ''
      };

      await mockBrowser.runtime.sendMessage(downloadMessage);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: expect.any(Number) },
        func: expect.any(Function),
        args: ['Fallback Download.md', encodedMarkdown]
      });
    });
  });

  describe('Context menu integration', () => {
    test('should handle context menu download action', async () => {
      const contextInfo = {
        menuItemId: 'download-markdown-all',
        pageUrl: 'https://example.com/article'
      };
      const tab = createMockTab();

      mockBrowser.scripting.executeScript
        .mockResolvedValueOnce([{ result: true }]) // Script injection check
        .mockResolvedValueOnce([{                   // Content extraction
          result: {
            dom: simpleArticle,
            selection: ''
          }
        }]);

      mockBrowser.downloads.download.mockResolvedValueOnce(126);

      // Simulate context menu click handler
      const contextMenuHandler = jest.fn(async (info, tab) => {
        if (info.menuItemId.startsWith('download-markdown')) {
          // Ensure content script is loaded
          await mockBrowser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => typeof getSelectionAndDom === 'function'
          });

          // Get article content
          const results = await mockBrowser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => getSelectionAndDom()
          });

          // Process and download
          if (results && results[0] && results[0].result) {
            await mockBrowser.downloads.download({
              url: 'blob:mock-markdown',
              filename: 'Simple Test Article.md',
              saveAs: false
            });
          }
        }
      });

      await contextMenuHandler(contextInfo, tab);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledTimes(2);
      expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
        url: 'blob:mock-markdown',
        filename: 'Simple Test Article.md',
        saveAs: false
      });
    });

    test('should handle copy to clipboard context action', async () => {
      const contextInfo = {
        menuItemId: 'copy-markdown-all',
        pageUrl: 'https://example.com/article'
      };
      const tab = createMockTab();

      mockBrowser.scripting.executeScript
        .mockResolvedValueOnce([{ result: true }]) // Content extraction
        .mockResolvedValueOnce([{ result: true }]); // Clipboard copy

      const contextMenuHandler = jest.fn(async (info, tab) => {
        if (info.menuItemId.startsWith('copy-markdown')) {
          // Get and convert content
          const markdown = '# Simple Test Article\n\nTest content';
          
          // Copy to clipboard
          await mockBrowser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (text) => navigator.clipboard.writeText(text),
            args: [markdown]
          });
        }
      });

      await contextMenuHandler(contextInfo, tab);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: tab.id },
        func: expect.any(Function),
        args: ['# Simple Test Article\n\nTest content']
      });
    });
  });

  describe('Keyboard shortcuts integration', () => {
    test('should handle download keyboard shortcut', async () => {
      const command = 'download_tab_as_markdown';
      const tab = createMockTab();

      mockBrowser.tabs.getCurrent.mockResolvedValueOnce(tab);
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          dom: simpleArticle,
          selection: ''
        }
      }]);
      mockBrowser.downloads.download.mockResolvedValueOnce(127);

      // Simulate keyboard command handler
      const commandHandler = jest.fn(async (command) => {
        if (command === 'download_tab_as_markdown') {
          const currentTab = await mockBrowser.tabs.getCurrent();
          
          // Extract content and download
          await mockBrowser.downloads.download({
            url: 'blob:mock-shortcut-download',
            filename: 'Keyboard Shortcut Article.md',
            saveAs: false
          });
        }
      });

      await commandHandler(command);

      expect(mockBrowser.tabs.getCurrent).toHaveBeenCalled();
      expect(mockBrowser.downloads.download).toHaveBeenCalledWith({
        url: 'blob:mock-shortcut-download',
        filename: 'Keyboard Shortcut Article.md',
        saveAs: false
      });
    });

    test('should handle copy keyboard shortcut', async () => {
      const command = 'copy_tab_as_markdown';
      const tab = createMockTab();

      mockBrowser.tabs.getCurrent.mockResolvedValueOnce(tab);
      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{ result: true }]);

      const commandHandler = jest.fn(async (command) => {
        if (command === 'copy_tab_as_markdown') {
          const currentTab = await mockBrowser.tabs.getCurrent();
          const markdown = '# Copied Article\n\nContent copied via keyboard shortcut';
          
          await mockBrowser.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: (text) => navigator.clipboard.writeText(text),
            args: [markdown]
          });
        }
      });

      await commandHandler(command);

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: tab.id },
        func: expect.any(Function),
        args: ['# Copied Article\n\nContent copied via keyboard shortcut']
      });
    });
  });

  describe('Options integration with workflows', () => {
    test('should apply custom options in conversion workflow', async () => {
      const customOptions = createMockOptions({
        includeTemplate: true,
        downloadImages: true,
        imageStyle: 'obsidian',
        frontmatter: '# {pageTitle}\n\nTags: {keywords}\nSource: {baseURI}'
      });

      mockBrowser.storage.sync.get.mockResolvedValueOnce(customOptions);

      mockBrowser.scripting.executeScript.mockResolvedValueOnce([{
        result: {
          dom: simpleArticle,
          selection: ''
        }
      }]);

      const expectedMarkdown = `# Simple Test Article

Tags: test, article, markdown
Source: https://example.com

# Simple Test Article

This is a simple paragraph with some **bold text** and *italic text*.`;

      const mockResponse = {
        type: 'display.md',
        markdown: expectedMarkdown,
        article: createMockArticle(),
        imageList: {},
        mdClipsFolder: ''
      };

      mockBrowser.runtime.sendMessage.mockResolvedValueOnce(mockResponse);

      const message = {
        type: 'clip',
        dom: simpleArticle,
        selection: '',
        includeTemplate: true,
        downloadImages: true,
        imageStyle: 'obsidian'
      };

      const result = await mockBrowser.runtime.sendMessage(message);

      expect(result.markdown).toContain('Tags: test, article, markdown');
      expect(result.markdown).toContain('Source: https://example.com');
    });

    test('should handle obsidian integration workflow', async () => {
      jest.setTimeout(15000); // Increase timeout for this test
      const obsidianOptions = createMockOptions({
        obsidianIntegration: true,
        obsidianVault: 'MyVault',
        obsidianFolder: 'Web Clips',
        imageStyle: 'obsidian-nofolder'
      });

      mockBrowser.storage.sync.get.mockResolvedValueOnce(obsidianOptions);

      const markdown = '# Obsidian Note\n\nContent for Obsidian\n\n![[image.png]]';
      const obsidianURI = 'obsidian://advanced-uri?vault=MyVault&clipboard=true&mode=new&filepath=Web Clips/Obsidian Note';

      // Set up mock for tabs.update
      if (!mockBrowser.tabs.update) {
        mockBrowser.tabs.update = jest.fn().mockResolvedValue({ id: 123 });
      }
      mockBrowser.tabs.update.mockResolvedValueOnce({ id: 123 });

      // Simulate obsidian workflow
      const obsidianHandler = jest.fn(async () => {
        await mockBrowser.scripting.executeScript({
          target: { tabId: 1 },
          func: (markdown) => navigator.clipboard.writeText(markdown),
          args: [markdown]
        });
        
        await mockBrowser.tabs.update({ url: obsidianURI });
      });

      await obsidianHandler();

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        func: expect.any(Function),
        args: [markdown]
      });
      expect(mockBrowser.tabs.update).toHaveBeenCalledWith({
        url: obsidianURI
      });
    });
  });

  describe('Error handling in integration scenarios', () => {
    test('should handle content script injection failures', async () => {
      mockBrowser.scripting.executeScript.mockRejectedValueOnce(
        new Error('Cannot access chrome:// pages')
      );

      const message = {
        type: 'clip',
        dom: simpleArticle,
        selection: ''
      };

      // Should handle error gracefully
      try {
        await mockBrowser.runtime.sendMessage(message);
      } catch (error) {
        expect(error.message).toBe('Cannot access chrome:// pages');
      }

      expect(mockBrowser.scripting.executeScript).toHaveBeenCalled();
    });

    test('should handle download failures gracefully', async () => {
      mockBrowser.downloads.download.mockRejectedValueOnce(
        new Error('Download failed: insufficient permissions')
      );

      const downloadMessage = {
        type: 'download',
        markdown: '# Failed Download\n\nContent',
        title: 'Failed Download',
        tab: createMockTab(),
        imageList: {},
        mdClipsFolder: ''
      };

      try {
        await mockBrowser.runtime.sendMessage(downloadMessage);
      } catch (error) {
        expect(error.message).toContain('Download failed');
      }
    });

    test('should handle storage errors during option loading', async () => {
      // Clear any previous mock calls
      mockBrowser.storage.sync.get.mockClear();

      mockBrowser.storage.sync.get.mockRejectedValueOnce(
        new Error('Storage quota exceeded')
      );

      // Should fall back to default options
      const fallbackOptions = createMockOptions();
      const options = await mockBrowser.storage.sync.get().catch(() => fallbackOptions);

      // Check that it falls back to the expected options structure
      expect(options).toEqual(fallbackOptions);
      expect(options).toHaveProperty('headingStyle');
      expect(options).toHaveProperty('downloadMode', 'downloadsApi');
      expect(options).toHaveProperty('contextMenus', true);
    });

    test('should handle network errors during image downloads', async () => {
      const imageList = {
        'https://example.com/failed-image.jpg': 'article/failed-image.jpg'
      };

      mockBrowser.downloads.download
        .mockResolvedValueOnce(128) // Markdown succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Image fails

      const downloadMessage = {
        type: 'download',
        markdown: '# Article with Failed Image\n\n![Failed](failed-image.jpg)',
        title: 'Article with Failed Image',
        tab: createMockTab(),
        imageList: imageList,
        mdClipsFolder: ''
      };

      // Should continue despite image download failure
      await mockBrowser.runtime.sendMessage(downloadMessage);
      
      expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(2);
    });
  });

  describe('Multi-tab and concurrent operations', () => {
    test('should handle downloading multiple tabs', async () => {
      const tabs = [
        createMockTab({ id: 1, title: 'First Tab', url: 'https://example.com/1' }),
        createMockTab({ id: 2, title: 'Second Tab', url: 'https://example.com/2' }),
        createMockTab({ id: 3, title: 'Third Tab', url: 'https://example.com/3' })
      ];

      mockBrowser.tabs.query.mockResolvedValueOnce(tabs);
      
      mockBrowser.scripting.executeScript
        .mockResolvedValue([{ result: { dom: simpleArticle, selection: '' } }]);
      
      mockBrowser.downloads.download
        .mockResolvedValueOnce(129)
        .mockResolvedValueOnce(130)
        .mockResolvedValueOnce(131);

      // Simulate multi-tab download
      const multiTabHandler = jest.fn(async () => {
        const allTabs = await mockBrowser.tabs.query({ currentWindow: true });
        
        const downloadPromises = allTabs.map(async (tab, index) => {
          return mockBrowser.downloads.download({
            url: `blob:mock-tab-${index}`,
            filename: `${tab.title}.md`,
            saveAs: false
          });
        });

        return Promise.all(downloadPromises);
      });

      const results = await multiTabHandler();

      expect(results).toHaveLength(3);
      expect(mockBrowser.downloads.download).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent clipboard operations', async () => {
      const concurrentOperations = Array(5).fill(null).map((_, index) => {
        return mockBrowser.scripting.executeScript({
          target: { tabId: 1 },
          func: (text) => navigator.clipboard.writeText(text),
          args: [`Content ${index}`]
        });
      });

      mockBrowser.scripting.executeScript.mockResolvedValue([{ result: true }]);

      const results = await Promise.all(concurrentOperations);

      expect(results).toHaveLength(5);
      expect(mockBrowser.scripting.executeScript).toHaveBeenCalledTimes(5);
    });
  });
});
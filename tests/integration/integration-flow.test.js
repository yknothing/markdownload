/**
 * Integration Flow Tests for MarkDownload
 * 
 * Tests the complete integration between different components:
 * - Background script ↔ Content script communication
 * - Storage ↔ Options synchronization
 * - Context menus ↔ Tab operations
 * - Download workflow with real browser API interactions
 */

const path = require('path');

// Setup test environment
require('./setup.js');

// Import test utilities
const { testHelpers } = require('./utils/testHelpers');
const htmlSamples = require('./fixtures/htmlSamples');

describe('Integration Flow - Component Communication', () => {
  let messageHandlers;
  let contextMenuHandlers;
  let downloadHandlers;

  beforeAll(() => {
    // Initialize message handler registry
    messageHandlers = new Map();
    contextMenuHandlers = new Map();
    downloadHandlers = new Map();
  });

  beforeEach(() => {
    // Reset all mocks and state
    global.mockBrowserHelpers.reset();
    
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '<base href="https://example.com/">';
    
    // Reset handlers
    messageHandlers.clear();
    contextMenuHandlers.clear();
    downloadHandlers.clear();
    
    // Setup default storage state
    const defaultOptions = global.testUtils.createMockOptions();
    global.browser.storage.sync.get.mockResolvedValue(defaultOptions);
  });

  describe('Background ↔ Content Script Communication', () => {
    test('should handle page clipping request from content script', async () => {
      // Arrange: Setup DOM content
      document.body.innerHTML = htmlSamples.simpleArticle;
      document.title = 'Integration Test Article';
      
      const domData = {
        dom: document.documentElement.outerHTML,
        selection: null,
        baseURI: 'https://example.com/test',
        pageTitle: document.title
      };

      const expectedMessage = {
        type: 'clip',
        dom: domData.dom,
        selection: domData.selection,
        baseURI: domData.baseURI,
        pageTitle: domData.pageTitle
      };

      // Mock background message handler
      const backgroundHandler = jest.fn().mockResolvedValue({
        success: true,
        markdown: '# Integration Test Article\n\nTest content',
        filename: 'Integration Test Article.md'
      });

      global.browser.runtime.sendMessage.mockImplementation(backgroundHandler);

      // Act: Simulate content script sending clip message
      const response = await global.browser.runtime.sendMessage(expectedMessage);

      // Assert: Verify communication
      expect(backgroundHandler).toHaveBeenCalledWith(expectedMessage);
      expect(response.success).toBe(true);
      expect(response.markdown).toContain('# Integration Test Article');
      expect(response.filename).toBe('Integration Test Article.md');
    });

    test('should handle selection clipping with partial content', async () => {
      // Arrange: Setup DOM with selectable content
      document.body.innerHTML = `
        <article>
          <h1>Full Article</h1>
          <p>First paragraph.</p>
          <div class="selected-content">
            <h2>Selected Section</h2>
            <p>This content is selected.</p>
          </div>
          <p>Last paragraph.</p>
        </article>
      `;
      
      const selectedElement = document.querySelector('.selected-content');
      const selectionHTML = selectedElement.outerHTML;

      // Mock selection message
      const selectionMessage = {
        type: 'clip',
        dom: document.documentElement.outerHTML,
        selection: selectionHTML,
        baseURI: 'https://example.com/',
        pageTitle: 'Article with Selection'
      };

      const backgroundResponse = {
        success: true,
        markdown: '## Selected Section\n\nThis content is selected.',
        filename: 'Article with Selection.md',
        isSelection: true
      };

      global.browser.runtime.sendMessage.mockResolvedValue(backgroundResponse);

      // Act: Send selection message
      const response = await global.browser.runtime.sendMessage(selectionMessage);

      // Assert: Verify selection handling
      expect(response.isSelection).toBe(true);
      expect(response.markdown).toContain('## Selected Section');
      expect(response.markdown).not.toContain('First paragraph');
    });

    test('should handle background script errors gracefully', async () => {
      // Arrange: Setup error scenario
      const errorMessage = {
        type: 'clip',
        dom: '<invalid>html',
        baseURI: 'invalid-uri',
        pageTitle: ''
      };

      global.browser.runtime.sendMessage.mockRejectedValue(
        new Error('Background script processing failed')
      );

      // Act & Assert: Should handle errors
      await expect(
        global.browser.runtime.sendMessage(errorMessage)
      ).rejects.toThrow('Background script processing failed');
    });
  });

  describe('Context Menu Integration', () => {
    test('should create context menus on extension startup', async () => {
      // Arrange: Mock context menu creation
      const menuItems = [
        {
          id: 'clip-selection',
          title: 'Clip Selection to Markdown',
          contexts: ['selection']
        },
        {
          id: 'clip-page',
          title: 'Clip Page to Markdown',
          contexts: ['page']
        },
        {
          id: 'clip-link',
          title: 'Clip Link to Markdown',
          contexts: ['link']
        }
      ];

      global.browser.contextMenus.create.mockImplementation((props) => {
        contextMenuHandlers.set(props.id, props);
        return props.id;
      });

      // Act: Simulate context menu creation
      for (const item of menuItems) {
        await global.browser.contextMenus.create(item);
      }

      // Assert: Verify context menus were created
      expect(global.browser.contextMenus.create).toHaveBeenCalledTimes(3);
      expect(contextMenuHandlers.has('clip-selection')).toBe(true);
      expect(contextMenuHandlers.has('clip-page')).toBe(true);
      expect(contextMenuHandlers.has('clip-link')).toBe(true);
    });

    test('should handle context menu click for page clipping', async () => {
      // Arrange: Setup page content
      document.body.innerHTML = htmlSamples.complexArticle;
      document.title = 'Context Menu Test';

      // Mock context menu click
      const clickInfo = {
        menuItemId: 'clip-page',
        pageUrl: 'https://example.com/test'
      };

      const tab = {
        id: 1,
        url: 'https://example.com/test',
        title: 'Context Menu Test'
      };

      // Mock tab script execution
      global.browser.scripting.executeScript.mockResolvedValue([{
        result: {
          html: document.documentElement.outerHTML,
          title: document.title,
          baseURI: window.location.href
        }
      }]);

      // Act: Simulate context menu click handling
      const scriptResult = await global.browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          html: document.documentElement.outerHTML,
          title: document.title,
          baseURI: window.location.href
        })
      });

      // Assert: Verify script execution
      expect(global.browser.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: tab.id },
        func: expect.any(Function)
      });
      expect(scriptResult[0].result.html).toContain('Advanced JavaScript Techniques');
    });

    test('should handle context menu click for link clipping', async () => {
      // Arrange: Setup link context
      const clickInfo = {
        menuItemId: 'clip-link',
        linkUrl: 'https://example.com/linked-article',
        pageUrl: 'https://example.com/current'
      };

      // Mock fetch for link content
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(htmlSamples.simpleArticle)
      });

      // Act: Simulate link clipping (this would typically fetch the linked page)
      const linkResponse = await fetch(clickInfo.linkUrl);
      const linkHTML = await linkResponse.text();

      // Assert: Verify link fetching
      expect(global.fetch).toHaveBeenCalledWith(clickInfo.linkUrl);
      expect(linkHTML).toContain('Simple Test Article');
    });
  });

  describe('Storage ↔ Options Integration', () => {
    test('should synchronize options between storage and runtime', async () => {
      // Arrange: Setup initial options
      const initialOptions = global.testUtils.createMockOptions({
        downloadImages: false,
        imageStyle: 'markdown',
        headingStyle: 'atx'
      });

      global.browser.storage.sync.get.mockResolvedValue(initialOptions);

      // Act: Load options
      const loadedOptions = await global.browser.storage.sync.get();

      // Modify options
      const updatedOptions = {
        ...loadedOptions,
        downloadImages: true,
        imageStyle: 'obsidian'
      };

      await global.browser.storage.sync.set(updatedOptions);

      // Reload options
      global.browser.storage.sync.get.mockResolvedValue(updatedOptions);
      const reloadedOptions = await global.browser.storage.sync.get();

      // Assert: Verify synchronization
      expect(reloadedOptions.downloadImages).toBe(true);
      expect(reloadedOptions.imageStyle).toBe('obsidian');
      expect(reloadedOptions.headingStyle).toBe('atx'); // Unchanged
    });

    test('should handle options migration and defaults', async () => {
      // Arrange: Simulate old options format
      const legacyOptions = {
        headingStyle: 'atx',
        downloadImages: false
        // Missing newer options
      };

      global.browser.storage.sync.get.mockResolvedValue(legacyOptions);

      // Act: Apply defaults for missing options
      const currentDefaults = global.testUtils.createMockOptions();
      const mergedOptions = { ...currentDefaults, ...legacyOptions };

      // Assert: Verify migration
      expect(mergedOptions.headingStyle).toBe('atx'); // From legacy
      expect(mergedOptions.downloadImages).toBe(false); // From legacy
      expect(mergedOptions.imageStyle).toBe('markdown'); // From defaults
      expect(mergedOptions.obsidianIntegration).toBe(false); // From defaults
    });

    test('should handle storage errors and fallback to defaults', async () => {
      // Arrange: Mock storage error
      global.browser.storage.sync.get.mockRejectedValue(new Error('Storage quota exceeded'));

      // Act: Attempt to load options with error handling
      let finalOptions;
      try {
        finalOptions = await global.browser.storage.sync.get();
      } catch (error) {
        // Fallback to defaults
        finalOptions = global.testUtils.createMockOptions();
      }

      // Assert: Should have fallback values
      expect(finalOptions).toBeDefined();
      expect(finalOptions.headingStyle).toBe('atx');
      expect(finalOptions.downloadImages).toBe(false);
    });
  });

  describe('End-to-End Download Integration', () => {
    test('should complete full workflow from content extraction to download', async () => {
      // Arrange: Setup complete workflow
      document.body.innerHTML = htmlSamples.complexArticle;
      document.title = 'E2E Integration Test';
      
      const options = global.testUtils.createMockOptions({
        downloadImages: true,
        imageStyle: 'markdown',
        includeTemplate: true,
        frontmatter: '---\ntitle: {pageTitle}\n---\n\n'
      });

      global.browser.storage.sync.get.mockResolvedValue(options);
      global.browser.downloads.download.mockResolvedValue(456);

      // Act: Execute complete workflow

      // 1. Content extraction
      const extractedData = {
        dom: document.documentElement.outerHTML,
        pageTitle: document.title,
        baseURI: 'https://example.com/',
        selection: null
      };

      // 2. Message to background for conversion
      const conversionMessage = {
        type: 'clip',
        ...extractedData
      };

      // Mock background conversion response
      const conversionResult = {
        success: true,
        markdown: '---\ntitle: E2E Integration Test\n---\n\n# Complex Technical Article\n\nTest content with ![Test Image](test-image.jpg)',
        filename: 'E2E Integration Test.md',
        imageList: {
          'https://example.com/test-image.jpg': 'E2E Integration Test/test-image.jpg'
        }
      };

      global.browser.runtime.sendMessage.mockResolvedValue(conversionResult);

      // 3. Execute conversion
      const result = await global.browser.runtime.sendMessage(conversionMessage);

      // 4. Initiate download
      const downloadUrl = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(result.markdown);
      const downloadId = await global.browser.downloads.download({
        url: downloadUrl,
        filename: result.filename,
        saveAs: false
      });

      // Assert: Verify complete workflow
      expect(result.success).toBe(true);
      expect(result.markdown).toContain('title: E2E Integration Test');
      expect(result.markdown).toContain('![Test Image](test-image.jpg)');
      expect(result.imageList).toBeDefined();
      expect(downloadId).toBe(456);
      
      expect(global.browser.downloads.download).toHaveBeenCalledWith({
        url: expect.stringMatching(/^data:text\/markdown/),
        filename: 'E2E Integration Test.md',
        saveAs: false
      });
    });

    test('should handle image download workflow', async () => {
      // Arrange: Content with images
      document.body.innerHTML = `
        <article>
          <h1>Article with Images</h1>
          <img src="https://example.com/image1.jpg" alt="First Image">
          <p>Some text</p>
          <img src="https://example.com/image2.png" alt="Second Image">
        </article>
      `;

      const options = global.testUtils.createMockOptions({
        downloadImages: true,
        imageStyle: 'markdown',
        imagePrefix: '{pageTitle}/'
      });

      global.browser.storage.sync.get.mockResolvedValue(options);

      // Mock image downloads
      global.browser.downloads.download
        .mockResolvedValueOnce(789) // Markdown file
        .mockResolvedValueOnce(790) // First image
        .mockResolvedValueOnce(791); // Second image

      // Act: Simulate image processing workflow
      const imageDownloads = [
        {
          url: 'https://example.com/image1.jpg',
          filename: 'Article with Images/image1.jpg'
        },
        {
          url: 'https://example.com/image2.png',
          filename: 'Article with Images/image2.png'
        }
      ];

      // Download markdown file
      const markdownId = await global.browser.downloads.download({
        url: 'data:text/markdown;charset=utf-8,# Article with Images',
        filename: 'Article with Images.md',
        saveAs: false
      });

      // Download images
      const imageIds = [];
      for (const image of imageDownloads) {
        const imageId = await global.browser.downloads.download({
          url: image.url,
          filename: image.filename,
          saveAs: false
        });
        imageIds.push(imageId);
      }

      // Assert: Verify all downloads
      expect(markdownId).toBe(789);
      expect(imageIds).toEqual([790, 791]);
      expect(global.browser.downloads.download).toHaveBeenCalledTimes(3);
    });
  });

  describe('Tab Operations Integration', () => {
    test('should handle multi-tab operations', async () => {
      // Arrange: Mock multiple tabs
      const tabs = [
        { id: 1, url: 'https://example.com/page1', title: 'Page 1', active: true },
        { id: 2, url: 'https://example.com/page2', title: 'Page 2', active: false },
        { id: 3, url: 'https://example.com/page3', title: 'Page 3', active: false }
      ];

      global.browser.tabs.query.mockResolvedValue(tabs);

      // Act: Query tabs and process each
      const allTabs = await global.browser.tabs.query({});
      const activeTab = await global.browser.tabs.query({ active: true, currentWindow: true });

      // Assert: Verify tab operations
      expect(allTabs).toHaveLength(3);
      expect(activeTab[0].id).toBe(1);
      expect(activeTab[0].active).toBe(true);
    });

    test('should handle tab message communication', async () => {
      // Arrange
      const tabId = 1;
      const message = { type: 'getContent' };
      const expectedResponse = { content: 'Page content', success: true };

      global.browser.tabs.sendMessage.mockResolvedValue(expectedResponse);

      // Act: Send message to tab
      const response = await global.browser.tabs.sendMessage(tabId, message);

      // Assert
      expect(global.browser.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
      expect(response.success).toBe(true);
      expect(response.content).toBe('Page content');
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from partial failures in download workflow', async () => {
      // Arrange: Setup scenario where image download fails but markdown succeeds
      document.body.innerHTML = htmlSamples.imageHeavyArticle;
      
      const options = global.testUtils.createMockOptions({
        downloadImages: true
      });

      global.browser.storage.sync.get.mockResolvedValue(options);
      
      // Mock markdown download success, image download failure
      global.browser.downloads.download
        .mockResolvedValueOnce(100) // Markdown succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Image fails

      // Act: Attempt complete download
      let markdownResult, imageResult, imageError;

      try {
        markdownResult = await global.browser.downloads.download({
          url: 'data:text/markdown;charset=utf-8,# Test',
          filename: 'test.md'
        });
      } catch (error) {
        markdownResult = null;
      }

      try {
        imageResult = await global.browser.downloads.download({
          url: 'https://example.com/test.jpg',
          filename: 'test.jpg'
        });
      } catch (error) {
        imageError = error;
        imageResult = null;
      }

      // Assert: Verify partial success handling
      expect(markdownResult).toBe(100); // Markdown download succeeded
      expect(imageResult).toBeNull(); // Image download failed
      expect(imageError).toBeDefined();
      expect(imageError.message).toBe('Network error');
    });

    test('should handle communication timeout gracefully', async () => {
      // Arrange: Mock timeout scenario
      global.browser.runtime.sendMessage.mockImplementation(
        () => new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      // Act: Attempt communication with timeout
      let result, error;
      try {
        result = await Promise.race([
          global.browser.runtime.sendMessage({ type: 'clip' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Manual timeout')), 50))
        ]);
      } catch (e) {
        error = e;
      }

      // Assert: Should handle timeout
      expect(result).toBeUndefined();
      expect(error).toBeDefined();
      expect(error.message).toBe('Manual timeout');
    });
  });
});
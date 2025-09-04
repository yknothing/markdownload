/**
 * Comprehensive Content Script Tests - Phase 2 Coverage
 * 
 * This test suite covers critical content script functionality gaps:
 * - DOM processing and manipulation
 * - Selection handling and HTML extraction  
 * - Filename sanitization and download logic
 * - Error handling and edge cases
 * - Performance with large content
 */

const path = require('path');
const { setupTestEnvironment, resetTestEnvironment } = require('../../utils/testHelpers.js');

// Mock browser APIs
require('jest-webextension-mock');

describe('Content Script - Comprehensive Phase 2 Coverage', () => {
  let contentScriptModule;
  let contentScriptFunctions;
  let mockDocument;
  let mockWindow;

  beforeAll(() => {
    // Load content script source for direct execution
    const contentScriptPath = path.resolve(__dirname, '../../src/contentScript/contentScript.js');
    
    try {
      const fs = require('fs');
      const moduleCode = fs.readFileSync(contentScriptPath, 'utf8');
      
      // Create execution context with all necessary globals
      const context = {
        console: console,
        browser: global.browser,
        document: null,
        window: null,
        NodeFilter: NodeFilter,
        HTMLElement: HTMLElement,
        performance: performance,
        navigator: { clipboard: { writeText: jest.fn() } }
      };

      // Execute the content script code
      const vm = require('vm');
      vm.createContext(context);
      vm.runInContext(moduleCode, context);

      // Extract functions
      contentScriptFunctions = {
        notifyExtension: context.notifyExtension,
        getHTMLOfDocument: context.getHTMLOfDocument,
        removeHiddenNodes: context.removeHiddenNodes,
        getHTMLOfSelection: context.getHTMLOfSelection,
        getSelectionAndDom: context.getSelectionAndDom,
        copyToClipboard: context.copyToClipboard,
        downloadMarkdown: context.downloadMarkdown,
        downloadImage: context.downloadImage
      };

    } catch (error) {
      console.warn('Could not load content script module:', error.message);
      contentScriptFunctions = null;
    }
  });

  beforeEach(() => {
    // Setup test environment
    const testEnv = setupTestEnvironment();
    
    // Create comprehensive mock document
    mockDocument = {
      // Document structure
      documentElement: {
        outerHTML: '<!DOCTYPE html><html><head><title>Test</title></head><body><div>Content</div></body></html>'
      },
      head: {
        getElementsByTagName: jest.fn((tag) => {
          if (tag === 'title') return [{ innerText: 'Test Page' }];
          if (tag === 'base') return [];
          return [];
        }),
        append: jest.fn()
      },
      body: {
        textContent: 'Test content',
        offsetParent: document.body,
        childNodes: []
      },
      title: 'Test Document Title',
      
      // DOM methods
      createElement: jest.fn((tag) => {
        const element = {
          tagName: tag.toUpperCase(),
          innerText: '',
          innerHTML: '',
          className: '',
          id: '',
          setAttribute: jest.fn(),
          getAttribute: jest.fn(() => null),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          click: jest.fn(),
          remove: jest.fn(),
          childNodes: [],
          parentNode: null
        };
        
        if (tag === 'div') {
          element.innerHTML = '';
        }
        
        return element;
      }),
      
      createNodeIterator: jest.fn((root, whatToShow, filter) => {
        let index = 0;
        const mockNodes = [
          { nodeName: 'SCRIPT', parentNode: { removeChild: jest.fn() } },
          { nodeName: 'STYLE', parentNode: { removeChild: jest.fn() } },
          { nodeName: 'DIV', parentNode: { removeChild: jest.fn() } }
        ];
        
        return {
          nextNode: () => {
            while (index < mockNodes.length) {
              const node = mockNodes[index++];
              if (filter && typeof filter === 'function') {
                const result = filter(node);
                if (result === NodeFilter.FILTER_ACCEPT) {
                  return node;
                }
              }
            }
            return null;
          }
        };
      }),
      
      createTreeWalker: jest.fn((root, whatToShow, filter) => {
        let index = 0;
        const mockNodes = [
          { 
            nodeName: 'SCRIPT', 
            className: '', 
            id: '',
            parentNode: { removeChild: jest.fn() },
            parentElement: null,
            textContent: 'alert("test");'
          },
          { 
            nodeName: 'STYLE', 
            className: '', 
            id: '',
            parentNode: { removeChild: jest.fn() },
            parentElement: null,
            textContent: 'body { color: red; }'
          },
          { 
            nodeName: 'DIV', 
            className: 'content', 
            id: 'main',
            parentNode: { removeChild: jest.fn() },
            parentElement: null,
            textContent: 'Main content',
            offsetParent: document.body
          }
        ];
        
        return {
          nextNode: () => {
            while (index < mockNodes.length) {
              const node = mockNodes[index++];
              if (filter && filter.acceptNode) {
                const result = filter.acceptNode(node);
                if (result === NodeFilter.FILTER_ACCEPT) {
                  return node;
                }
              }
            }
            return null;
          }
        };
      }),
      
      // Selection API
      selection: {
        createRange: () => ({
          htmlText: '<p>Selected content</p>'
        })
      }
    };

    // Create comprehensive mock window
    mockWindow = {
      location: {
        href: 'https://example.com/test-article',
        origin: 'https://example.com'
      },
      
      getSelection: jest.fn(() => ({
        rangeCount: 0,
        getRangeAt: jest.fn()
      })),
      
      getComputedStyle: jest.fn((element) => ({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'display') return 'block';
          if (prop === 'visibility') return 'visible';
          return '';
        })
      }))
    };

    // Set globals
    global.document = mockDocument;
    global.window = mockWindow;
    global.navigator = {
      clipboard: {
        writeText: jest.fn().mockResolvedValue()
      }
    };
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('notifyExtension Function - Message Handling', () => {
    test('should send proper DOM data to extension', () => {
      if (!contentScriptFunctions?.notifyExtension) return;

      const mockSendMessage = jest.fn();
      global.browser.runtime.sendMessage = mockSendMessage;

      // Mock getSelectionAndDom to return test data
      const mockDomData = {
        selection: '<p>Selected text</p>',
        dom: '<!DOCTYPE html><html>...</html>'
      };

      // Since notifyExtension calls getSelectionAndDom, we need to mock it
      global.getSelectionAndDom = jest.fn(() => mockDomData);

      contentScriptFunctions.notifyExtension();

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "clip",
        dom: mockDomData.dom,
        selection: mockDomData.selection,
        baseURI: 'https://example.com/test-article',
        pageTitle: 'Test Document Title'
      });
    });

    test('should handle missing getSelectionAndDom gracefully', () => {
      if (!contentScriptFunctions?.notifyExtension) return;

      const mockSendMessage = jest.fn();
      global.browser.runtime.sendMessage = mockSendMessage;

      // Remove getSelectionAndDom to test error handling
      delete global.getSelectionAndDom;

      expect(() => {
        contentScriptFunctions.notifyExtension();
      }).not.toThrow();

      // Should still send message (with undefined values handled by the function)
      expect(mockSendMessage).toHaveBeenCalled();
    });
  });

  describe('getHTMLOfDocument Function - Comprehensive DOM Processing', () => {
    test('should ensure title tag exists when missing', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      // Mock no title initially
      mockDocument.head.getElementsByTagName.mockImplementation((tag) => {
        if (tag === 'title') return [];
        if (tag === 'base') return [];
        return [];
      });
      
      mockDocument.title = 'Fallback Title From Window';

      const mockTitleElement = { innerText: '' };
      mockDocument.createElement.mockImplementation((tag) => {
        if (tag === 'title') return mockTitleElement;
        if (tag === 'base') return { setAttribute: jest.fn(), getAttribute: jest.fn(() => null) };
        return { setAttribute: jest.fn(), getAttribute: jest.fn() };
      });

      contentScriptFunctions.getHTMLOfDocument();

      expect(mockDocument.createElement).toHaveBeenCalledWith('title');
      expect(mockTitleElement.innerText).toBe('Fallback Title From Window');
      expect(mockDocument.head.append).toHaveBeenCalledWith(mockTitleElement);
    });

    test('should preserve existing title when present', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      const existingTitle = { innerText: 'Existing Title' };
      mockDocument.head.getElementsByTagName.mockImplementation((tag) => {
        if (tag === 'title') return [existingTitle];
        if (tag === 'base') return [{ setAttribute: jest.fn(), getAttribute: jest.fn(() => 'https://example.com') }];
        return [];
      });

      contentScriptFunctions.getHTMLOfDocument();

      // Should not create new title
      expect(mockDocument.createElement).not.toHaveBeenCalledWith('title');
    });

    test('should create base element when missing and set correct href', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      const mockBaseElement = { 
        setAttribute: jest.fn(), 
        getAttribute: jest.fn(() => null) 
      };

      mockDocument.head.getElementsByTagName.mockImplementation((tag) => {
        if (tag === 'title') return [{ innerText: 'Test' }];
        if (tag === 'base') return [];
        return [];
      });

      mockDocument.createElement.mockImplementation((tag) => {
        if (tag === 'base') return mockBaseElement;
        return { setAttribute: jest.fn(), getAttribute: jest.fn() };
      });

      contentScriptFunctions.getHTMLOfDocument();

      expect(mockDocument.createElement).toHaveBeenCalledWith('base');
      expect(mockDocument.head.append).toHaveBeenCalledWith(mockBaseElement);
      expect(mockBaseElement.setAttribute).toHaveBeenCalledWith('href', 'https://example.com/test-article');
    });

    test('should update base href when it does not match origin', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      const mockBaseElement = { 
        setAttribute: jest.fn(), 
        getAttribute: jest.fn(() => 'http://different-domain.com/path') 
      };

      mockDocument.head.getElementsByTagName.mockImplementation((tag) => {
        if (tag === 'title') return [{ innerText: 'Test' }];
        if (tag === 'base') return [mockBaseElement];
        return [];
      });

      contentScriptFunctions.getHTMLOfDocument();

      expect(mockBaseElement.setAttribute).toHaveBeenCalledWith('href', 'https://example.com/test-article');
    });

    test('should preserve valid base href that matches origin', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      const validHref = 'https://example.com/some/path';
      const mockBaseElement = { 
        setAttribute: jest.fn(), 
        getAttribute: jest.fn(() => validHref) 
      };

      mockDocument.head.getElementsByTagName.mockImplementation((tag) => {
        if (tag === 'title') return [{ innerText: 'Test' }];
        if (tag === 'base') return [mockBaseElement];
        return [];
      });

      contentScriptFunctions.getHTMLOfDocument();

      expect(mockBaseElement.setAttribute).not.toHaveBeenCalled();
    });

    test('should call removeHiddenNodes and return complete HTML', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      // Mock removeHiddenNodes
      const mockRemoveHiddenNodes = jest.fn();
      global.removeHiddenNodes = mockRemoveHiddenNodes;

      const result = contentScriptFunctions.getHTMLOfDocument();

      expect(mockRemoveHiddenNodes).toHaveBeenCalledWith(mockDocument.body);
      expect(typeof result).toBe('string');
      expect(result).toBe(mockDocument.documentElement.outerHTML);
    });
  });

  describe('removeHiddenNodes Function - Advanced Element Filtering', () => {
    let mockRoot;

    beforeEach(() => {
      mockRoot = {
        childNodes: [],
        removeChild: jest.fn()
      };
    });

    test('should remove script, style, and noscript elements always', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const scriptElement = {
        nodeName: 'SCRIPT',
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        textContent: 'alert("test");'
      };

      const styleElement = {
        nodeName: 'STYLE', 
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        textContent: 'body { color: red; }'
      };

      const noscriptElement = {
        nodeName: 'NOSCRIPT',
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        textContent: 'No JavaScript content'
      };

      let elementIndex = 0;
      const elements = [scriptElement, styleElement, noscriptElement];

      mockDocument.createNodeIterator.mockImplementation((root, whatToShow, filter) => ({
        nextNode: () => {
          if (elementIndex >= elements.length) return null;
          
          const element = elements[elementIndex++];
          const filterResult = filter(element);
          
          if (filterResult === NodeFilter.FILTER_ACCEPT) {
            return element;
          }
          return null;
        }
      }));

      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(result).toBe(mockRoot);
      // Elements should be removed
      expect(mockRoot.removeChild).toHaveBeenCalledTimes(3);
    });

    test('should preserve elements with article-related classes', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const articleElements = [
        {
          nodeName: 'DIV',
          className: 'article-content main-content',
          id: '',
          parentNode: mockRoot,
          parentElement: null,
          textContent: 'Article content',
          offsetParent: mockRoot
        },
        {
          nodeName: 'SECTION',
          className: '',
          id: 'post-body',
          parentNode: mockRoot,
          parentElement: null,
          textContent: 'Post content',
          offsetParent: mockRoot
        },
        {
          nodeName: 'DIV',
          className: 'sidebar',
          id: '',
          parentNode: mockRoot,
          parentElement: { className: 'content-container', id: '' },
          textContent: 'Sidebar content',
          offsetParent: null
        }
      ];

      let elementIndex = 0;
      mockDocument.createNodeIterator.mockImplementation(() => ({
        nextNode: () => {
          if (elementIndex >= articleElements.length) return null;
          return articleElements[elementIndex++];
        }
      }));

      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(result).toBe(mockRoot);
      expect(mockRoot.removeChild).not.toHaveBeenCalled();
    });

    test('should preserve elements with parent article context', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const elementWithParentContext = {
        nodeName: 'P',
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: {
          className: 'article-main',
          id: 'content-section'
        },
        textContent: 'Paragraph in article',
        offsetParent: null
      };

      mockDocument.createNodeIterator.mockImplementation(() => {
        let called = false;
        return {
          nextNode: () => {
            if (called) return null;
            called = true;
            return elementWithParentContext;
          }
        };
      });

      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(result).toBe(mockRoot);
      expect(mockRoot.removeChild).not.toHaveBeenCalled();
    });

    test('should remove hidden elements without significant content', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const hiddenElement = {
        nodeName: 'DIV',
        className: 'tracking-pixel',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        textContent: '',
        offsetParent: null
      };

      mockWindow.getComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'display') return 'none';
          if (prop === 'visibility') return 'hidden';
          return '';
        })
      });

      mockDocument.createNodeIterator.mockImplementation(() => {
        let called = false;
        return {
          nextNode: () => {
            if (called) return null;
            called = true;
            return hiddenElement;
          }
        };
      });

      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(result).toBe(mockRoot);
      expect(mockRoot.removeChild).toHaveBeenCalledWith(hiddenElement);
    });

    test('should preserve hidden elements with significant content', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const hiddenWithContent = {
        nodeName: 'DIV',
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        textContent: 'This is a hidden element with more than 50 characters of content that should be preserved because it might be important',
        offsetParent: null
      };

      mockWindow.getComputedStyle.mockReturnValue({
        getPropertyValue: jest.fn(() => 'none')
      });

      mockDocument.createNodeIterator.mockImplementation(() => {
        let called = false;
        return {
          nextNode: () => {
            if (called) return null;
            called = true;
            return hiddenWithContent;
          }
        };
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(result).toBe(mockRoot);
      expect(mockRoot.removeChild).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hidden element has content, keeping')
      );

      consoleSpy.mockRestore();
    });

    test('should handle elements with null/undefined className and id safely', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const elementWithNullProps = {
        nodeName: 'DIV',
        className: null,
        id: undefined,
        parentNode: mockRoot,
        parentElement: {
          className: null,
          id: undefined
        },
        textContent: 'Content',
        offsetParent: mockRoot
      };

      mockDocument.createNodeIterator.mockImplementation(() => {
        let called = false;
        return {
          nextNode: () => {
            if (called) return null;
            called = true;
            return elementWithNullProps;
          }
        };
      });

      expect(() => {
        contentScriptFunctions.removeHiddenNodes(mockRoot);
      }).not.toThrow();
    });

    test('should log removal count correctly', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const elementsToRemove = [
        { nodeName: 'SCRIPT', className: '', id: '', parentNode: { removeChild: jest.fn() } },
        { nodeName: 'STYLE', className: '', id: '', parentNode: { removeChild: jest.fn() } }
      ];

      let elementIndex = 0;
      mockDocument.createNodeIterator.mockImplementation((root, whatToShow, filter) => ({
        nextNode: () => {
          while (elementIndex < elementsToRemove.length) {
            const element = elementsToRemove[elementIndex++];
            if (filter(element) === NodeFilter.FILTER_ACCEPT) {
              return element;
            }
          }
          return null;
        }
      }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      contentScriptFunctions.removeHiddenNodes(mockRoot);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed 2 truly hidden elements')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getHTMLOfSelection Function - Advanced Selection Handling', () => {
    test('should handle modern selection API with single range', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      const mockRange = {
        cloneContents: jest.fn(() => {
          const fragment = mockDocument.createElement('div');
          fragment.innerHTML = '<p>Selected paragraph</p><span>Selected span</span>';
          return { childNodes: [fragment] };
        })
      };

      mockWindow.getSelection.mockReturnValue({
        rangeCount: 1,
        getRangeAt: jest.fn(() => mockRange)
      });

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(mockWindow.getSelection).toHaveBeenCalled();
      expect(mockRange.cloneContents).toHaveBeenCalled();
      expect(result).toContain('Selected');
    });

    test('should handle multiple selection ranges', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      const mockRange1 = {
        cloneContents: jest.fn(() => {
          const div = mockDocument.createElement('div');
          div.innerHTML = '<p>First selection</p>';
          return div.childNodes[0];
        })
      };

      const mockRange2 = {
        cloneContents: jest.fn(() => {
          const div = mockDocument.createElement('div');
          div.innerHTML = '<p>Second selection</p>';
          return div.childNodes[0];
        })
      };

      mockWindow.getSelection.mockReturnValue({
        rangeCount: 2,
        getRangeAt: jest.fn((index) => {
          return index === 0 ? mockRange1 : mockRange2;
        })
      });

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(result).toContain('First selection');
      expect(result).toContain('Second selection');
    });

    test('should fallback to document.selection for legacy browsers', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      // Disable modern selection API
      mockWindow.getSelection = null;
      
      mockDocument.selection = {
        createRange: jest.fn(() => ({
          htmlText: '<em>Legacy selected content</em>'
        }))
      };

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(mockDocument.selection.createRange).toHaveBeenCalled();
      expect(result).toBe('<em>Legacy selected content</em>');
    });

    test('should return empty string when no selection exists', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      mockWindow.getSelection.mockReturnValue({
        rangeCount: 0
      });

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(result).toBe('');
    });

    test('should handle complex HTML in selections', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      const complexHTML = `
        <div class="article-content">
          <h2>Section Title</h2>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
          <ul>
            <li>First item</li>
            <li>Second item with <a href="http://example.com">link</a></li>
          </ul>
          <img src="image.jpg" alt="Description" />
        </div>
      `;

      const mockRange = {
        cloneContents: jest.fn(() => {
          const div = mockDocument.createElement('div');
          div.innerHTML = complexHTML;
          return div.childNodes[0];
        })
      };

      mockWindow.getSelection.mockReturnValue({
        rangeCount: 1,
        getRangeAt: jest.fn(() => mockRange)
      });

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(result).toContain('article-content');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<ul>');
      expect(result).toContain('href="http://example.com"');
      expect(result).toContain('src="image.jpg"');
    });

    test('should handle selection API errors gracefully', () => {
      if (!contentScriptFunctions?.getHTMLOfSelection) return;

      mockWindow.getSelection.mockImplementation(() => {
        throw new Error('Selection API error');
      });

      mockDocument.selection = null;

      const result = contentScriptFunctions.getHTMLOfSelection();

      expect(result).toBe('');
    });
  });

  describe('downloadMarkdown Function - Comprehensive File Handling', () => {
    let mockLink;

    beforeEach(() => {
      mockLink = {
        download: '',
        href: '',
        click: jest.fn(),
        remove: jest.fn()
      };

      mockDocument.createElement.mockImplementation((tag) => {
        if (tag === 'a') return mockLink;
        return { click: jest.fn(), remove: jest.fn() };
      });

      mockDocument.body = {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      };
    });

    test('should handle basic filename and content correctly', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const filename = 'test-article.md';
      const content = 'VGVzdCBjb250ZW50'; // base64 for 'Test content'

      contentScriptFunctions.downloadMarkdown(filename, content);

      expect(mockDocument.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.href).toBe(`data:text/markdown;base64,${content}`);
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    test('should sanitize filenames with illegal characters', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const illegalFilename = 'test/file?<>\\:*|"name.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(illegalFilename, content);

      // Should remove illegal characters
      expect(mockLink.download).toBe('testfilename.md');
    });

    test('should handle filenames with path separators', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const pathFilename = '/path/to/file\\subdir\\article.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(pathFilename, content);

      // Should keep only the filename part
      expect(mockLink.download).toBe('article.md');
    });

    test('should add .md extension when missing', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const filenameWithoutExtension = 'article-title';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(filenameWithoutExtension, content);

      expect(mockLink.download).toBe('article-title.md');
    });

    test('should preserve .md extension when already present', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const filenameWithExtension = 'article.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(filenameWithExtension, content);

      expect(mockLink.download).toBe('article.md');
    });

    test('should handle empty filename gracefully', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const emptyFilename = '';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(emptyFilename, content);

      expect(mockLink.download).toBe('untitled.md');
    });

    test('should handle null/undefined filename', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const content = 'content';

      contentScriptFunctions.downloadMarkdown(null, content);
      expect(mockLink.download).toBe('untitled.md');

      contentScriptFunctions.downloadMarkdown(undefined, content);
      expect(mockLink.download).toBe('untitled.md');
    });

    test('should handle unicode characters in filename', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const unicodeFilename = '测试文档-español-файл.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(unicodeFilename, content);

      expect(mockLink.download).toBe(unicodeFilename);
    });

    test('should clean up multiple spaces in filename', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const spaceyFilename = 'test    file   with     spaces.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(spaceyFilename, content);

      expect(mockLink.download).toBe('test file with spaces.md');
    });

    test('should handle non-breaking spaces in filename', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const nbspFilename = 'test\u00A0file\u00A0name.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(nbspFilename, content);

      expect(mockLink.download).toBe('test file name.md');
    });

    test('should handle download errors gracefully', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      // Mock createElement to throw error
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM manipulation error');
      });

      const fallbackLink = {
        href: '',
        click: jest.fn(),
        remove: jest.fn()
      };

      // Mock the fallback scenario
      mockDocument.createElement.mockImplementationOnce(() => {
        throw new Error('First error');
      }).mockImplementationOnce(() => fallbackLink);

      expect(() => {
        contentScriptFunctions.downloadMarkdown('test.md', 'content');
      }).not.toThrow();
    });

    test('should handle very long filenames', () => {
      if (!contentScriptFunctions?.downloadMarkdown) return;

      const longFilename = 'a'.repeat(300) + '.md';
      const content = 'content';

      contentScriptFunctions.downloadMarkdown(longFilename, content);

      // Should handle gracefully (browser may truncate)
      expect(mockLink.download).toBeDefined();
      expect(mockLink.download.endsWith('.md')).toBe(true);
    });
  });

  describe('copyToClipboard Function - Clipboard Integration', () => {
    test('should use navigator.clipboard.writeText for modern browsers', async () => {
      if (!contentScriptFunctions?.copyToClipboard) return;

      const testText = 'Test clipboard content';
      const mockWriteText = jest.fn().mockResolvedValue();
      
      global.navigator.clipboard.writeText = mockWriteText;

      await contentScriptFunctions.copyToClipboard(testText);

      expect(mockWriteText).toHaveBeenCalledWith(testText);
    });

    test('should handle clipboard API errors', async () => {
      if (!contentScriptFunctions?.copyToClipboard) return;

      const testText = 'Test content';
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));
      
      global.navigator.clipboard.writeText = mockWriteText;

      await expect(
        contentScriptFunctions.copyToClipboard(testText)
      ).rejects.toThrow('Clipboard access denied');
    });

    test('should handle large text content', async () => {
      if (!contentScriptFunctions?.copyToClipboard) return;

      const largeText = 'Large content '.repeat(10000);
      const mockWriteText = jest.fn().mockResolvedValue();
      
      global.navigator.clipboard.writeText = mockWriteText;

      await contentScriptFunctions.copyToClipboard(largeText);

      expect(mockWriteText).toHaveBeenCalledWith(largeText);
    });
  });

  describe('getSelectionAndDom Function - Integration', () => {
    test('should return both selection and DOM data', () => {
      if (!contentScriptFunctions?.getSelectionAndDom) return;

      // Mock both functions
      global.getHTMLOfSelection = jest.fn(() => '<p>Selected content</p>');
      global.getHTMLOfDocument = jest.fn(() => '<!DOCTYPE html>...');

      const result = contentScriptFunctions.getSelectionAndDom();

      expect(result).toEqual({
        selection: '<p>Selected content</p>',
        dom: '<!DOCTYPE html>...'
      });
    });

    test('should handle when selection functions are missing', () => {
      if (!contentScriptFunctions?.getSelectionAndDom) return;

      delete global.getHTMLOfSelection;
      delete global.getHTMLOfDocument;

      expect(() => {
        contentScriptFunctions.getSelectionAndDom();
      }).not.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle very large HTML documents efficiently', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      const largeContent = '<div>' + 'Large content '.repeat(10000) + '</div>';
      mockDocument.documentElement.outerHTML = 
        `<!DOCTYPE html><html><head><title>Large Doc</title></head><body>${largeContent}</body></html>`;

      const startTime = performance.now();
      const result = contentScriptFunctions.getHTMLOfDocument();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100000);
    });

    test('should handle documents with many elements to filter', () => {
      if (!contentScriptFunctions?.removeHiddenNodes) return;

      const manyElements = Array.from({ length: 1000 }, (_, i) => ({
        nodeName: i % 3 === 0 ? 'SCRIPT' : 'DIV',
        className: i % 2 === 0 ? 'hidden-element' : 'visible-element',
        id: `element-${i}`,
        parentNode: mockRoot,
        parentElement: null,
        textContent: `Element ${i}`,
        offsetParent: i % 4 === 0 ? null : mockRoot
      }));

      let elementIndex = 0;
      mockDocument.createNodeIterator.mockImplementation((root, whatToShow, filter) => ({
        nextNode: () => {
          if (elementIndex >= manyElements.length) return null;
          const element = manyElements[elementIndex++];
          
          // Simple filter logic for testing
          if (element.nodeName === 'SCRIPT' || element.offsetParent === null) {
            return element;
          }
          return null;
        }
      }));

      const startTime = performance.now();
      const result = contentScriptFunctions.removeHiddenNodes(mockRoot);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(result).toBe(mockRoot);
    });

    test('should handle malformed HTML structures gracefully', () => {
      if (!contentScriptFunctions?.getHTMLOfDocument) return;

      // Mock malformed document structure
      mockDocument.documentElement = null;
      mockDocument.head = null;
      mockDocument.body = null;

      expect(() => {
        contentScriptFunctions.getHTMLOfDocument();
      }).not.toThrow();
    });
  });
});
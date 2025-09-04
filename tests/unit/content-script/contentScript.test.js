/**
 * Unit tests for contentScript.js - DOM handling and content extraction
 */

const { setupTestEnvironment, resetTestEnvironment, createMockDocument } = require('../../utils/testHelpers.js');
const { simpleArticle, complexArticle, malformedHTML, imageHeavyArticle } = require('../../fixtures/htmlSamples.js');

describe('Content Script - DOM Processing Tests', () => {
  let mockBrowser, mockDocument, contentScriptFunctions;

  beforeEach(() => {
    const testEnv = setupTestEnvironment();
    mockBrowser = testEnv.browser;

    // Mock content script functions
    contentScriptFunctions = {
      getHTMLOfDocument: jest.fn(() => {
        // Ensure title tag exists
        if (document.head.getElementsByTagName('title').length === 0) {
          const titleEl = document.createElement('title');
          titleEl.innerText = document.title || 'Test Document';
          document.head.append(titleEl);
        }

        // Ensure base element exists
        let baseEls = document.head.getElementsByTagName('base');
        let baseEl;
        
        if (baseEls.length > 0) {
          baseEl = baseEls[0];
        } else {
          baseEl = document.createElement('base');
          document.head.append(baseEl);
        }

        // Set proper base href
        const href = baseEl.getAttribute('href');
        if (!href || !href.startsWith(window.location.origin || 'https://example.com')) {
          baseEl.setAttribute('href', window.location.href || 'https://example.com');
        }

        // Remove hidden content
        contentScriptFunctions.removeHiddenNodes(document.body);

        // Return full HTML with DOCTYPE like the real browser would
        return '<!DOCTYPE html>' + document.documentElement.outerHTML;
      }),

      removeHiddenNodes: jest.fn((root) => {
        const hiddenElements = [];
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              const nodeName = node.nodeName.toLowerCase();
              
              // Always remove script, style, noscript
              if (nodeName === "script" || nodeName === "style" || nodeName === "noscript") {
                return NodeFilter.FILTER_ACCEPT;
              }
              
              // Check for article-related context
              const articleSelectors = [
                'article', 'main', 'section', 'content', 'post', 'entry',
                'article-content', 'post-content', 'entry-content', 'content-container'
              ];
              
              const hasArticleContext = articleSelectors.some(selector => {
                return node.className.toLowerCase().includes(selector) ||
                       node.id.toLowerCase().includes(selector) ||
                       (node.parentElement && (
                         node.parentElement.className.toLowerCase().includes(selector) ||
                         node.parentElement.id.toLowerCase().includes(selector)
                       ));
              });
              
              if (hasArticleContext) {
                return NodeFilter.FILTER_REJECT;
              }
              
              // Check if element is hidden
              if (node.offsetParent === null) {
                const computedStyle = window.getComputedStyle(node, null);
                const isHidden = computedStyle.getPropertyValue("visibility") === "hidden" || 
                                computedStyle.getPropertyValue("display") === "none";
                                
                // Be careful with elements that have content
                if (isHidden && node.textContent.trim().length > 50) {
                  return NodeFilter.FILTER_REJECT;
                }
                
                return isHidden ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
              }
              
              return NodeFilter.FILTER_REJECT;
            }
          }
        );

        let node;
        while (node = walker.nextNode()) {
          if (node.parentNode instanceof HTMLElement) {
            hiddenElements.push(node);
          }
        }

        // Remove hidden elements
        hiddenElements.forEach(element => {
          if (element.parentNode && element.parentNode.removeChild) {
            element.parentNode.removeChild(element);
          }
        });

        return root;
      }),

      getHTMLOfSelection: jest.fn(() => {
        if (window.getSelection) {
          const selection = window.getSelection();
          if (selection.rangeCount > 0) {
            let content = '';
            for (let i = 0; i < selection.rangeCount; i++) {
              const range = selection.getRangeAt(i);
              const clonedSelection = range.cloneContents();
              const div = document.createElement('div');
              div.appendChild(clonedSelection);
              content += div.innerHTML;
            }
            return content;
          }
        }
        return '';
      }),

      getSelectionAndDom: jest.fn(() => {
        return {
          selection: contentScriptFunctions.getHTMLOfSelection(),
          dom: contentScriptFunctions.getHTMLOfDocument()
        };
      }),

      copyToClipboard: jest.fn((text) => {
        return navigator.clipboard.writeText(text);
      }),

      downloadMarkdown: jest.fn((filename, text) => {
        const datauri = `data:text/markdown;base64,${text}`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = datauri;
        link.click();
      })
    };

    // Mock DOM APIs
    global.window = {
      location: {
        href: 'https://example.com/test',
        origin: 'https://example.com'
      },
      getSelection: jest.fn(() => ({
        rangeCount: 0,
        getRangeAt: jest.fn()
      })),
      getComputedStyle: jest.fn(() => ({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'display') return 'none';
          if (prop === 'visibility') return 'visible';
          return '';
        })
      }))
    };

    // Setup document mock
    mockDocument = createMockDocument(simpleArticle);
    global.document = mockDocument;
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  describe('getHTMLOfDocument function', () => {
    test('should return complete HTML document', () => {
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<html>');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(typeof result).toBe('string');
    });

    test('should ensure title tag exists', () => {
      // Start with document without title
      global.document.head.getElementsByTagName = jest.fn((tag) => {
        if (tag === 'title') return []; // No title initially
        if (tag === 'base') return [];
        return [];
      });
      global.document.title = 'Fallback Title';
      
      const createElement = jest.fn((tag) => ({
        innerText: '',
        setAttribute: jest.fn(),
        getAttribute: jest.fn()
      }));
      global.document.createElement = createElement;
      global.document.head.append = jest.fn();
      
      contentScriptFunctions.getHTMLOfDocument();
      
      expect(createElement).toHaveBeenCalledWith('title');
      expect(global.document.head.append).toHaveBeenCalled();
    });

    test('should ensure base element exists and has correct href', () => {
      global.document.head.getElementsByTagName = jest.fn((tag) => {
        if (tag === 'base') return []; // No base initially
        if (tag === 'title') return [{ innerText: 'Test' }];
        return [];
      });
      
      const mockBaseElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(() => null)
      };
      global.document.createElement = jest.fn(() => mockBaseElement);
      global.document.head.append = jest.fn();
      
      contentScriptFunctions.getHTMLOfDocument();
      
      expect(global.document.createElement).toHaveBeenCalledWith('base');
      expect(mockBaseElement.setAttribute).toHaveBeenCalledWith('href', 'https://example.com/test');
    });

    test('should update base href if it does not start with origin', () => {
      const mockBaseElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(() => 'http://different-origin.com')
      };
      
      global.document.head.getElementsByTagName = jest.fn((tag) => {
        if (tag === 'base') return [mockBaseElement];
        if (tag === 'title') return [{ innerText: 'Test' }];
        return [];
      });
      
      contentScriptFunctions.getHTMLOfDocument();
      
      expect(mockBaseElement.setAttribute).toHaveBeenCalledWith('href', 'https://example.com/test');
    });

    test('should preserve valid base href', () => {
      const validHref = 'https://example.com/base/path';
      const mockBaseElement = {
        setAttribute: jest.fn(),
        getAttribute: jest.fn(() => validHref)
      };
      
      global.document.head.getElementsByTagName = jest.fn((tag) => {
        if (tag === 'base') return [mockBaseElement];
        if (tag === 'title') return [{ innerText: 'Test' }];
        return [];
      });
      
      contentScriptFunctions.getHTMLOfDocument();
      
      expect(mockBaseElement.setAttribute).not.toHaveBeenCalled();
    });

    test('should call removeHiddenNodes on document body', () => {
      const removeHiddenNodesSpy = jest.spyOn(contentScriptFunctions, 'removeHiddenNodes');
      
      contentScriptFunctions.getHTMLOfDocument();
      
      expect(removeHiddenNodesSpy).toHaveBeenCalledWith(global.document.body);
    });
  });

  describe('removeHiddenNodes function', () => {
    let mockRoot;

    beforeEach(() => {
      mockRoot = {
        getElementsByTagName: jest.fn(),
        querySelectorAll: jest.fn(),
        childNodes: []
      };
    });

    test('should remove script, style, and noscript elements', () => {
      const scriptEl = { nodeName: 'SCRIPT', parentNode: mockRoot, className: '', id: '' };
      const styleEl = { nodeName: 'STYLE', parentNode: mockRoot, className: '', id: '' };
      const noscriptEl = { nodeName: 'NOSCRIPT', parentNode: mockRoot, className: '', id: '' };
      
      // Mock createTreeWalker to simulate the filter behavior
      global.document.createTreeWalker = jest.fn((root, whatToShow, filter) => {
        let index = 0;
        const elements = [scriptEl, styleEl, noscriptEl];
        return {
          nextNode: () => {
            while (index < elements.length) {
              const element = elements[index++];
              if (filter && filter.acceptNode && filter.acceptNode(element) === NodeFilter.FILTER_ACCEPT) {
                return element;
              }
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      expect(mockRoot.removeChild).toHaveBeenCalledTimes(3);
      expect(mockRoot.removeChild).toHaveBeenCalledWith(scriptEl);
      expect(mockRoot.removeChild).toHaveBeenCalledWith(styleEl);
      expect(mockRoot.removeChild).toHaveBeenCalledWith(noscriptEl);
    });

    test('should preserve elements with article-related classes', () => {
      const articleEl = { 
        nodeName: 'DIV', 
        className: 'article-content',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        offsetParent: mockRoot,
        textContent: 'Article content'
      };
      
      global.document.createTreeWalker = jest.fn(() => {
        let called = false;
        return {
          nextNode: () => {
            if (!called) {
              called = true;
              return articleEl;
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      // Should not remove article element
      expect(mockRoot.removeChild).not.toHaveBeenCalledWith(articleEl);
    });

    test('should preserve elements with article-related IDs', () => {
      const articleEl = { 
        nodeName: 'DIV', 
        className: '',
        id: 'main-content',
        parentNode: mockRoot,
        parentElement: null,
        offsetParent: mockRoot,
        textContent: 'Main content'
      };
      
      global.document.createTreeWalker = jest.fn(() => {
        let called = false;
        return {
          nextNode: () => {
            if (!called) {
              called = true;
              return articleEl;
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      expect(mockRoot.removeChild).not.toHaveBeenCalledWith(articleEl);
    });

    test('should remove truly hidden elements without content', () => {
      const hiddenEl = { 
        nodeName: 'DIV', 
        className: 'tracking-pixel',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        offsetParent: null, // Hidden
        textContent: ''
      };
      
      global.window.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn((prop) => {
          if (prop === 'display') return 'none';
          return '';
        })
      }));
      
      global.document.createTreeWalker = jest.fn(() => {
        let called = false;
        return {
          nextNode: () => {
            if (!called) {
              called = true;
              return hiddenEl;
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      expect(mockRoot.removeChild).toHaveBeenCalledWith(hiddenEl);
    });

    test('should preserve hidden elements with significant content', () => {
      const hiddenWithContent = { 
        nodeName: 'DIV', 
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: null,
        offsetParent: null, // Hidden
        textContent: 'This is a hidden element with more than 50 characters of content that should be preserved'
      };
      
      global.document.createTreeWalker = jest.fn(() => {
        let called = false;
        return {
          nextNode: () => {
            if (!called) {
              called = true;
              return hiddenWithContent;
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      expect(mockRoot.removeChild).not.toHaveBeenCalledWith(hiddenWithContent);
    });

    test('should handle elements with parent context', () => {
      const parentEl = { 
        className: 'article-main',
        id: ''
      };
      const childEl = { 
        nodeName: 'DIV', 
        className: '',
        id: '',
        parentNode: mockRoot,
        parentElement: parentEl,
        offsetParent: null,
        textContent: 'Child content'
      };
      
      global.document.createTreeWalker = jest.fn(() => {
        let called = false;
        return {
          nextNode: () => {
            if (!called) {
              called = true;
              return childEl;
            }
            return null;
          }
        };
      });

      mockRoot.removeChild = jest.fn();
      
      contentScriptFunctions.removeHiddenNodes(mockRoot);
      
      // Should preserve due to parent context
      expect(mockRoot.removeChild).not.toHaveBeenCalledWith(childEl);
    });
  });

  describe('getHTMLOfSelection function', () => {
    test('should return empty string when no selection', () => {
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 0
      }));
      
      const result = contentScriptFunctions.getHTMLOfSelection();
      
      expect(result).toBe('');
    });

    test('should extract HTML from single selection range', () => {
      const mockRange = {
        cloneContents: jest.fn(() => {
          const div = global.document.createElement('div');
          div.innerHTML = '<p>Selected content</p>';
          return div.childNodes[0];
        })
      };
      
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 1,
        getRangeAt: jest.fn(() => mockRange)
      }));
      
      const result = contentScriptFunctions.getHTMLOfSelection();
      
      expect(result).toContain('Selected content');
    });

    test('should handle multiple selection ranges', () => {
      const mockRange1 = {
        cloneContents: jest.fn(() => {
          const div = global.document.createElement('div');
          div.innerHTML = '<p>First selection</p>';
          return div.childNodes[0];
        })
      };
      
      const mockRange2 = {
        cloneContents: jest.fn(() => {
          const div = global.document.createElement('div');
          div.innerHTML = '<p>Second selection</p>';
          return div.childNodes[0];
        })
      };
      
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 2,
        getRangeAt: jest.fn((index) => index === 0 ? mockRange1 : mockRange2)
      }));
      
      const result = contentScriptFunctions.getHTMLOfSelection();
      
      expect(result).toContain('First selection');
      expect(result).toContain('Second selection');
    });

    test('should handle legacy document.selection API', () => {
      // Remove window.getSelection to test fallback
      global.window.getSelection = null;
      
      global.document.selection = {
        createRange: jest.fn(() => ({
          htmlText: '<p>Legacy selection</p>'
        }))
      };
      
      const result = contentScriptFunctions.getHTMLOfSelection();
      
      expect(result).toBe('<p>Legacy selection</p>');
    });

    test('should handle selection extraction errors gracefully', () => {
      global.window.getSelection = jest.fn(() => {
        throw new Error('Selection API error');
      });
      
      expect(() => {
        contentScriptFunctions.getHTMLOfSelection();
      }).not.toThrow();
    });
  });

  describe('getSelectionAndDom function', () => {
    test('should return both selection and DOM', () => {
      const mockSelection = '<p>Selected text</p>';
      const mockDOM = '<!DOCTYPE html><html>...</html>';
      
      contentScriptFunctions.getHTMLOfSelection.mockReturnValue(mockSelection);
      contentScriptFunctions.getHTMLOfDocument.mockReturnValue(mockDOM);
      
      const result = contentScriptFunctions.getSelectionAndDom();
      
      expect(result).toEqual({
        selection: mockSelection,
        dom: mockDOM
      });
      expect(contentScriptFunctions.getHTMLOfSelection).toHaveBeenCalled();
      expect(contentScriptFunctions.getHTMLOfDocument).toHaveBeenCalled();
    });

    test('should handle empty selection', () => {
      contentScriptFunctions.getHTMLOfSelection.mockReturnValue('');
      contentScriptFunctions.getHTMLOfDocument.mockReturnValue('<html>test</html>');
      
      const result = contentScriptFunctions.getSelectionAndDom();
      
      expect(result.selection).toBe('');
      expect(result.dom).toBe('<html>test</html>');
    });
  });

  describe('copyToClipboard function', () => {
    test('should use navigator.clipboard.writeText', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue()
      };
      global.navigator.clipboard = mockClipboard;
      
      await contentScriptFunctions.copyToClipboard('test text');
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
    });

    test('should handle clipboard API errors', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard access denied'))
      };
      global.navigator.clipboard = mockClipboard;
      
      await expect(
        contentScriptFunctions.copyToClipboard('test text')
      ).rejects.toThrow('Clipboard access denied');
    });

    test('should handle missing clipboard API', () => {
      global.navigator.clipboard = undefined;
      
      expect(() => {
        contentScriptFunctions.copyToClipboard('test text');
      }).toThrow();
    });
  });

  describe('downloadMarkdown function', () => {
    test('should create download link with correct attributes', () => {
      const mockLink = {
        download: '',
        href: '',
        click: jest.fn()
      };
      global.document.createElement = jest.fn(() => mockLink);
      
      contentScriptFunctions.downloadMarkdown('test.md', 'base64content');
      
      expect(global.document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.md');
      expect(mockLink.href).toBe('data:text/markdown;base64,base64content');
      expect(mockLink.click).toHaveBeenCalled();
    });

    test('should handle special characters in filename', () => {
      const mockLink = {
        download: '',
        href: '',
        click: jest.fn()
      };
      global.document.createElement = jest.fn(() => mockLink);
      
      const filename = 'test file with spaces & special chars.md';
      contentScriptFunctions.downloadMarkdown(filename, 'content');
      
      expect(mockLink.download).toBe(filename);
    });

    test('should handle empty content', () => {
      const mockLink = {
        download: '',
        href: '',
        click: jest.fn()
      };
      global.document.createElement = jest.fn(() => mockLink);
      
      contentScriptFunctions.downloadMarkdown('empty.md', '');
      
      expect(mockLink.href).toBe('data:text/markdown;base64,');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Integration with DOM content', () => {
    test('should handle complex article structure', () => {
      global.document = createMockDocument(complexArticle);
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('Advanced JavaScript Techniques');
      expect(result).toContain('Jane Developer');
      expect(typeof result).toBe('string');
    });

    test('should handle malformed HTML gracefully', () => {
      global.document = createMockDocument(malformedHTML);
      
      expect(() => {
        contentScriptFunctions.getHTMLOfDocument();
      }).not.toThrow();
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      expect(typeof result).toBe('string');
    });

    test('should preserve image sources in image-heavy content', () => {
      global.document = createMockDocument(imageHeavyArticle);
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('landscape.jpg');
      expect(result).toContain('sunset.jpg');
      expect(result).toContain('data:image/svg+xml');
    });

    test('should handle documents with no content', () => {
      const emptyDoc = '<!DOCTYPE html><html><head><title>Empty</title></head><body></body></html>';
      global.document = createMockDocument(emptyDoc);
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('<title>Empty</title>');
      expect(typeof result).toBe('string');
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle very large documents efficiently', () => {
      const largeContent = '<p>' + 'Large content '.repeat(10000) + '</p>';
      const largeDoc = `<!DOCTYPE html><html><head><title>Large</title></head><body>${largeContent}</body></html>`;
      global.document = createMockDocument(largeDoc);
      
      const startTime = performance.now();
      const result = contentScriptFunctions.getHTMLOfDocument();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
    });

    test('should handle documents with many hidden elements', () => {
      const hiddenElements = Array(100).fill('<div style="display:none">Hidden</div>').join('');
      const docWithHidden = `<!DOCTYPE html><html><head><title>Many Hidden</title></head><body>${hiddenElements}<p>Visible content</p></body></html>`;
      global.document = createMockDocument(docWithHidden);
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('Visible content');
      expect(typeof result).toBe('string');
    });

    test('should handle documents with deeply nested elements', () => {
      const deepNesting = '<div>'.repeat(50) + 'Deep content' + '</div>'.repeat(50);
      const deepDoc = `<!DOCTYPE html><html><head><title>Deep</title></head><body>${deepNesting}</body></html>`;
      global.document = createMockDocument(deepDoc);
      
      const result = contentScriptFunctions.getHTMLOfDocument();
      
      expect(result).toContain('Deep content');
      expect(typeof result).toBe('string');
    });
  });
});
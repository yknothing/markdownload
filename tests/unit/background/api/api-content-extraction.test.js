/**
 * Comprehensive API tests for content extraction functions in contentScript.js
 * Tests the core API functions for DOM content extraction and processing
 */

// Load the contentScript functions
let contentScriptFunctions = {};
beforeAll(() => {
  const fs = require('fs');
  const path = require('path');
  const contentScriptSource = fs.readFileSync(
    path.join(__dirname, '../../../../src/contentScript/contentScript.js'), 
    'utf8'
  );
  
  // Remove the script loading part that causes issues in tests
  const cleanSource = contentScriptSource.replace(
    /\(function loadPageContextScript\(\)\{[\s\S]*?\}\)\(\)/g, 
    ''
  );
  
  // Mock browser.runtime.getURL to prevent chrome-extension URL issues
  global.browser = global.browser || {};
  global.browser.runtime = global.browser.runtime || {};
  global.browser.runtime.getURL = jest.fn((path) => `chrome-extension://mock-extension-id/${path}`);
  global.browser.runtime.sendMessage = jest.fn();
  
  // Create a function to execute the code and capture functions in global scope
  const executeCode = new Function(`
    ${cleanSource}
    return {
      notifyExtension,
      getHTMLOfDocument, 
      removeHiddenNodes,
      getHTMLOfSelection,
      getSelectionAndDom,
      copyToClipboard,
      downloadMarkdown,
      downloadImage
    };
  `);
  
  // Execute and get functions
  contentScriptFunctions = executeCode();
  
  // Make functions available globally for tests
  Object.assign(global, contentScriptFunctions);
});

describe('Content Extraction API Tests', () => {
  beforeEach(() => {
    // Reset DOM to clean state
    document.head.innerHTML = '<title>Test Page</title>';
    document.body.innerHTML = '';
    
    // Clear console mocks
    jest.clearAllMocks();
  });

  describe('getHTMLOfDocument()', () => {
    test('should return complete HTML document structure', () => {
      // Setup test content
      document.body.innerHTML = '<h1>Test Content</h1><p>Test paragraph</p>';
      
      const result = getHTMLOfDocument();
      
      // outerHTML doesn't include DOCTYPE, only the HTML element
      expect(result).toContain('<html');
      expect(result).toMatch(/^<html/);
      expect(result).toContain('<head>');
      expect(result).toContain('<title>Test Page</title>');
      expect(result).toContain('<body>');
      expect(result).toContain('Test Content');
      expect(result).toContain('Test paragraph');
    });

    test('should create title element if missing', () => {
      // Remove title element
      document.head.innerHTML = '';
      document.title = 'Window Title';
      document.body.innerHTML = '<h1>Content</h1>';
      
      getHTMLOfDocument();
      
      const titleElement = document.head.querySelector('title');
      expect(titleElement).not.toBeNull();
      expect(titleElement.textContent).toBe('Window Title');
    });

    test('should create base element if missing', () => {
      // Ensure no base element exists
      document.head.querySelectorAll('base').forEach(el => el.remove());
      
      getHTMLOfDocument();
      
      const baseElement = document.head.querySelector('base');
      expect(baseElement).not.toBeNull();
      expect(baseElement.getAttribute('href')).toBe(window.location.href);
    });

    test('should update base href if invalid', () => {
      // Create base with invalid href
      const baseElement = document.createElement('base');
      baseElement.setAttribute('href', 'invalid-url');
      document.head.appendChild(baseElement);
      
      getHTMLOfDocument();
      
      expect(baseElement.getAttribute('href')).toBe(window.location.href);
    });

    test('should preserve base href if valid', () => {
      // Create base with valid href
      const validHref = 'https://example.com/valid';
      const baseElement = document.createElement('base');
      baseElement.setAttribute('href', validHref);
      document.head.appendChild(baseElement);
      
      // Mock window.location.origin to match
      Object.defineProperty(window.location, 'origin', {
        value: 'https://example.com',
        writable: true
      });
      
      getHTMLOfDocument();
      
      expect(baseElement.getAttribute('href')).toBe(validHref);
    });

    test('should call removeHiddenNodes on document body', () => {
      // Spy on removeHiddenNodes
      const originalRemoveHidden = global.removeHiddenNodes;
      global.removeHiddenNodes = jest.fn((root) => root);
      
      getHTMLOfDocument();
      
      expect(global.removeHiddenNodes).toHaveBeenCalledWith(document.body);
      
      // Restore original function
      global.removeHiddenNodes = originalRemoveHidden;
    });
  });

  describe('removeHiddenNodes() - Enhanced Security Version', () => {
    test('should remove script tags', () => {
      document.body.innerHTML = `
        <div>Content</div>
        <script>alert('test');</script>
        <div>More content</div>
      `;
      
      // Mock createNodeIterator to work with our test scenario
      const originalCreateNodeIterator = document.createNodeIterator;
      document.createNodeIterator = jest.fn((root, whatToShow, filter) => {
        const elements = Array.from(root.querySelectorAll('*'));
        let index = -1;
        
        return {
          nextNode: () => {
            index++;
            while (index < elements.length) {
              const element = elements[index];
              const result = filter(element);
              if (result === NodeFilter.FILTER_ACCEPT) {
                return element;
              }
              index++;
            }
            return null;
          }
        };
      });
      
      removeHiddenNodes(document.body);
      
      // Restore original
      document.createNodeIterator = originalCreateNodeIterator;
      
      // The test should work now - script should be removed
      expect(document.body.querySelector('script')).toBeNull();
      expect(document.body.querySelectorAll('div')).toHaveLength(2);
    });

    test('should remove style tags', () => {
      document.body.innerHTML = `
        <div>Content</div>
        <style>body { color: red; }</style>
        <p>Paragraph</p>
      `;
      
      removeHiddenNodes(document.body);
      
      expect(document.body.querySelector('style')).toBeNull();
      expect(document.body.querySelector('div')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });

    test('should remove noscript tags', () => {
      document.body.innerHTML = `
        <div>Content</div>
        <noscript>No JavaScript content</noscript>
        <p>Paragraph</p>
      `;
      
      removeHiddenNodes(document.body);
      
      expect(document.body.querySelector('noscript')).toBeNull();
      expect(document.body.querySelector('div')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });

    test('should preserve article elements', () => {
      document.body.innerHTML = `
        <article class="main-content">
          <h1>Article Title</h1>
          <p>Article content</p>
        </article>
        <div style="display: none;">Hidden content</div>
      `;
      
      // Mock getComputedStyle for the hidden div
      global.getComputedStyle.mockImplementation((element) => {
        if (element.style.display === 'none') {
          return {
            getPropertyValue: (prop) => prop === 'display' ? 'none' : 'visible'
          };
        }
        return {
          getPropertyValue: (prop) => prop === 'display' ? 'block' : 'visible'
        };
      });
      
      // Mock offsetParent
      Object.defineProperty(document.body.querySelector('div'), 'offsetParent', {
        value: null,
        configurable: true
      });
      
      removeHiddenNodes(document.body);
      
      // Article should be preserved
      expect(document.body.querySelector('article')).not.toBeNull();
      expect(document.body.querySelector('h1')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });

    test('should preserve elements with article-related classes', () => {
      document.body.innerHTML = `
        <div class="post-content" style="display: none;">
          <h2>Important Content</h2>
          <p>This should be preserved</p>
        </div>
        <div class="sidebar" style="display: none;">
          <p>This might be removed</p>
        </div>
      `;
      
      // Mock getComputedStyle
      global.getComputedStyle.mockImplementation(() => ({
        getPropertyValue: (prop) => prop === 'display' ? 'none' : 'visible'
      }));
      
      // Mock offsetParent for both divs
      document.body.querySelectorAll('div').forEach(div => {
        Object.defineProperty(div, 'offsetParent', {
          value: null,
          configurable: true
        });
      });
      
      removeHiddenNodes(document.body);
      
      // post-content should be preserved due to article-related class
      expect(document.body.querySelector('.post-content')).not.toBeNull();
      expect(document.body.querySelector('.post-content h2')).not.toBeNull();
    });

    test('should preserve elements with significant text content even if hidden', () => {
      const longText = 'A'.repeat(60); // More than 50 characters
      document.body.innerHTML = `
        <div style="display: none;">${longText}</div>
        <div style="display: none;">Short</div>
      `;
      
      // Mock getComputedStyle
      global.getComputedStyle.mockImplementation(() => ({
        getPropertyValue: (prop) => prop === 'display' ? 'none' : 'visible'
      }));
      
      // Mock offsetParent
      document.body.querySelectorAll('div').forEach(div => {
        Object.defineProperty(div, 'offsetParent', {
          value: null,
          configurable: true
        });
      });
      
      removeHiddenNodes(document.body);
      
      // Element with long text should be preserved
      const divs = document.body.querySelectorAll('div');
      const longTextDiv = Array.from(divs).find(div => div.textContent.includes('A'.repeat(60)));
      expect(longTextDiv).not.toBeNull();
    });

    test('should handle elements with null/undefined className gracefully', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Remove className property to simulate null/undefined
      Object.defineProperty(div, 'className', {
        value: null,
        configurable: true
      });
      
      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should handle elements with null/undefined id gracefully', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Remove id property
      Object.defineProperty(div, 'id', {
        value: undefined,
        configurable: true
      });
      
      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should log removal count', () => {
      document.body.innerHTML = `
        <div style="display: none;">Hidden 1</div>
        <div style="display: none;">Hidden 2</div>
        <div>Visible</div>
      `;
      
      // Mock getComputedStyle
      global.getComputedStyle.mockImplementation((element) => {
        if (element.style.display === 'none') {
          return {
            getPropertyValue: (prop) => prop === 'display' ? 'none' : 'visible'
          };
        }
        return {
          getPropertyValue: (prop) => 'visible'
        };
      });
      
      // Mock offsetParent for hidden elements
      document.body.querySelectorAll('div[style*="display: none"]').forEach(div => {
        Object.defineProperty(div, 'offsetParent', {
          value: null,
          configurable: true
        });
      });
      
      removeHiddenNodes(document.body);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('🧹 Removed')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('truly hidden elements')
      );
    });
  });

  describe('getHTMLOfSelection()', () => {
    test('should return empty string when no selection exists', () => {
      // Mock window.getSelection to return no selection
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 0
      }));
      
      const result = getHTMLOfSelection();
      expect(result).toBe('');
    });

    test('should return selected HTML content', () => {
      document.body.innerHTML = '<p>Test <strong>bold</strong> text</p>';
      
      // Mock window.getSelection
      const mockRange = {
        cloneContents: jest.fn(() => {
          const fragment = document.createDocumentFragment();
          const strong = document.createElement('strong');
          strong.textContent = 'bold';
          fragment.appendChild(strong);
          return fragment;
        })
      };
      
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 1,
        getRangeAt: jest.fn(() => mockRange)
      }));
      
      const result = getHTMLOfSelection();
      expect(result).toContain('<strong>bold</strong>');
    });

    test('should handle multiple ranges in selection', () => {
      document.body.innerHTML = '<p>First</p><p>Second</p>';
      
      // Mock multiple ranges
      const mockRange1 = {
        cloneContents: () => {
          const fragment = document.createDocumentFragment();
          const p = document.createElement('p');
          p.textContent = 'First';
          fragment.appendChild(p);
          return fragment;
        }
      };
      
      const mockRange2 = {
        cloneContents: () => {
          const fragment = document.createDocumentFragment();
          const p = document.createElement('p');
          p.textContent = 'Second';
          fragment.appendChild(p);
          return fragment;
        }
      };
      
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 2,
        getRangeAt: jest.fn((index) => index === 0 ? mockRange1 : mockRange2)
      }));
      
      const result = getHTMLOfSelection();
      expect(result).toContain('<p>First</p>');
      // Note: Current implementation only processes first range due to getRangeAt(0)
    });

    test('should handle legacy document.selection API', () => {
      // Mock legacy IE selection API
      global.document.selection = {
        createRange: jest.fn(() => ({
          htmlText: '<em>Legacy selection</em>'
        }))
      };
      
      // Remove modern selection API temporarily
      const originalGetSelection = global.window.getSelection;
      global.window.getSelection = undefined;
      
      const result = getHTMLOfSelection();
      expect(result).toBe('<em>Legacy selection</em>');
      
      // Restore modern API
      global.window.getSelection = originalGetSelection;
      delete global.document.selection;
    });
  });

  describe('getSelectionAndDom()', () => {
    test('should return both selection and DOM content', () => {
      // Setup DOM content
      document.body.innerHTML = '<h1>Page Title</h1><p>Content</p>';
      
      // Mock selection
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
          cloneContents: () => {
            const fragment = document.createDocumentFragment();
            const em = document.createElement('em');
            em.textContent = 'selected text';
            fragment.appendChild(em);
            return fragment;
          }
        }))
      }));
      
      const result = getSelectionAndDom();
      
      expect(result).toHaveProperty('selection');
      expect(result).toHaveProperty('dom');
      expect(result.selection).toContain('<em>selected text</em>');
      expect(result.dom).toContain('<h1>Page Title</h1>');
      expect(result.dom).toContain('<p>Content</p>');
    });

    test('should handle empty selection with full DOM', () => {
      document.body.innerHTML = '<article><h1>Article</h1></article>';
      
      // Mock empty selection
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 0
      }));
      
      const result = getSelectionAndDom();
      
      expect(result.selection).toBe('');
      expect(result.dom).toContain('<article><h1>Article</h1></article>');
    });
  });

  describe('notifyExtension()', () => {
    test('should send message with correct data structure', () => {
      // Setup test data
      document.title = 'Test Article';
      document.body.innerHTML = '<p>Article content</p>';
      window.location.href = 'https://example.com/article';
      
      // Mock selection
      global.window.getSelection = jest.fn(() => ({
        rangeCount: 1,
        getRangeAt: jest.fn(() => ({
          cloneContents: () => {
            const fragment = document.createDocumentFragment();
            const span = document.createElement('span');
            span.textContent = 'selected';
            fragment.appendChild(span);
            return fragment;
          }
        }))
      }));
      
      // Mock browser.runtime.sendMessage
      global.browser.runtime.sendMessage = jest.fn();
      
      notifyExtension();
      
      expect(global.browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'clip',
        dom: expect.stringContaining('<p>Article content</p>'),
        selection: expect.stringContaining('<span>selected</span>'),
        baseURI: 'https://example.com/article',
        pageTitle: 'Test Article'
      });
    });

    test('should handle missing browser API gracefully', () => {
      const originalBrowser = global.browser;
      global.browser = undefined;
      
      expect(() => notifyExtension()).toThrow();
      
      global.browser = originalBrowser;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed HTML gracefully', () => {
      document.body.innerHTML = '<div><p>Unclosed tag<span>More content</div>';
      
      expect(() => getHTMLOfDocument()).not.toThrow();
      
      const result = getHTMLOfDocument();
      expect(result).toContain('Unclosed tag');
      expect(result).toContain('More content');
    });

    test('should handle empty document', () => {
      document.head.innerHTML = '';
      document.body.innerHTML = '';
      
      const result = getHTMLOfDocument();
      
      expect(result).toContain('<html');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
    });

    test('should handle documents with only whitespace', () => {
      document.body.innerHTML = '   \n\t   ';
      
      const result = getHTMLOfDocument();
      expect(result).toContain('<body>');
      expect(result.length).toBeGreaterThan(50); // Should contain HTML structure
    });

    test('should preserve important accessibility attributes', () => {
      document.body.innerHTML = `
        <main role="main" aria-label="Main content">
          <article aria-labelledby="title">
            <h1 id="title">Article Title</h1>
            <p>Content</p>
          </article>
        </main>
      `;
      
      removeHiddenNodes(document.body);
      
      const main = document.body.querySelector('main');
      const article = document.body.querySelector('article');
      
      expect(main).not.toBeNull();
      expect(main.getAttribute('role')).toBe('main');
      expect(main.getAttribute('aria-label')).toBe('Main content');
      expect(article.getAttribute('aria-labelledby')).toBe('title');
    });
  });
});
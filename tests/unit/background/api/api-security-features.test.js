/**
 * Security-focused API tests for the enhanced removeHiddenElements function
 * Tests the security features and content protection mechanisms
 */

// Load contentScript with enhanced removeHiddenElements function
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

describe('Enhanced removeHiddenElements Security Tests', () => {
  beforeEach(() => {
    // Reset DOM to clean state
    document.head.innerHTML = '<title>Test Page</title>';
    document.body.innerHTML = '';
    
    // Clear console mocks
    jest.clearAllMocks();
    
    // Reset getComputedStyle mock
    global.getComputedStyle.mockImplementation((element) => ({
      getPropertyValue: jest.fn((property) => {
        if (property === 'display') return element.style.display || 'block';
        if (property === 'visibility') return element.style.visibility || 'visible';
        return '';
      })
    }));
  });

  describe('Article Content Protection', () => {
    test('should preserve article elements regardless of visibility', () => {
      document.body.innerHTML = `
        <article style="display: none;">
          <h1>Hidden Article Title</h1>
          <p>This article content should be preserved even if hidden</p>
        </article>
        <div style="display: none;">
          <p>This non-article content might be removed</p>
        </div>
      `;

      // Mock offsetParent to indicate elements are hidden
      document.body.querySelectorAll('*').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      removeHiddenNodes(document.body);

      // Article should be preserved
      const article = document.body.querySelector('article');
      expect(article).not.toBeNull();
      expect(article.querySelector('h1')).not.toBeNull();
      expect(article.querySelector('p')).not.toBeNull();
    });

    test('should preserve main content areas', () => {
      document.body.innerHTML = `
        <main style="visibility: hidden;">
          <section class="content">
            <h1>Main Content</h1>
            <p>Important article text</p>
          </section>
        </main>
        <aside style="visibility: hidden;">
          <p>Sidebar content</p>
        </aside>
      `;

      document.body.querySelectorAll('*').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      removeHiddenNodes(document.body);

      // Main content should be preserved
      expect(document.body.querySelector('main')).not.toBeNull();
      expect(document.body.querySelector('section.content')).not.toBeNull();
      expect(document.body.querySelector('h1')).not.toBeNull();
    });

    test('should preserve elements with article-related class names', () => {
      const articleClasses = [
        'article-content', 'post-content', 'entry-content', 
        'content-container', 'article-body', 'post-text'
      ];

      articleClasses.forEach(className => {
        document.body.innerHTML = `
          <div class="${className}" style="display: none;">
            <h2>Article Content</h2>
            <p>This should be preserved due to class: ${className}</p>
          </div>
        `;

        document.body.querySelectorAll('*').forEach(el => {
          Object.defineProperty(el, 'offsetParent', {
            value: null,
            configurable: true
          });
        });

        removeHiddenNodes(document.body);

        const preservedElement = document.body.querySelector(`.${className}`);
        expect(preservedElement).not.toBeNull();
        expect(preservedElement.querySelector('h2')).not.toBeNull();
        expect(preservedElement.querySelector('p')).not.toBeNull();
      });
    });

    test('should preserve elements with article-related IDs', () => {
      const articleIds = ['article', 'main-content', 'post', 'entry', 'content'];

      articleIds.forEach(id => {
        document.body.innerHTML = `
          <div id="${id}" style="display: none;">
            <h2>Article Content</h2>
            <p>This should be preserved due to ID: ${id}</p>
          </div>
        `;

        document.body.querySelectorAll('*').forEach(el => {
          Object.defineProperty(el, 'offsetParent', {
            value: null,
            configurable: true
          });
        });

        removeHiddenNodes(document.body);

        const preservedElement = document.body.querySelector(`#${id}`);
        expect(preservedElement).not.toBeNull();
        expect(preservedElement.textContent).toContain(`ID: ${id}`);
      });
    });

    test('should check parent elements for article context', () => {
      document.body.innerHTML = `
        <div class="post-content">
          <div style="display: none;">
            <p>Child of article parent should be preserved</p>
          </div>
        </div>
        <div class="sidebar">
          <div style="display: none;">
            <p>Child of non-article parent might be removed</p>
          </div>
        </div>
      `;

      document.body.querySelectorAll('div[style*="display: none"]').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      removeHiddenNodes(document.body);

      // Child of article-related parent should be preserved
      const articleChild = document.body.querySelector('.post-content div');
      expect(articleChild).not.toBeNull();
      expect(articleChild.textContent).toContain('Child of article parent');
    });
  });

  describe('Safe Text Content Protection', () => {
    test('should preserve hidden elements with significant text content', () => {
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.'; // >50 chars
      const shortText = 'Short text'; // <50 chars

      document.body.innerHTML = `
        <div class="long-text" style="display: none;">${longText}</div>
        <div class="short-text" style="display: none;">${shortText}</div>
      `;

      document.body.querySelectorAll('div').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      // Spy on console.log to verify protection messages
      const consoleSpy = jest.spyOn(console, 'log');

      removeHiddenNodes(document.body);

      // Element with long text should be preserved
      expect(document.body.querySelector('.long-text')).not.toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Hidden element has content, keeping:')
      );
    });

    test('should remove elements with minimal text content', () => {
      document.body.innerHTML = `
        <div style="display: none;">x</div>
        <div style="display: none;"></div>
        <div style="display: none;">   </div>
      `;

      document.body.querySelectorAll('div').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      const initialDivs = document.body.querySelectorAll('div').length;
      
      removeHiddenNodes(document.body);

      // Elements with minimal content should be removed
      const remainingDivs = document.body.querySelectorAll('div').length;
      expect(remainingDivs).toBeLessThan(initialDivs);
    });

    test('should handle whitespace-only content correctly', () => {
      const whitespaceOnly = '   \n\t   ';
      
      document.body.innerHTML = `
        <div style="display: none;">${whitespaceOnly}</div>
      `;

      document.body.querySelector('div').offsetParent = null;

      removeHiddenNodes(document.body);

      // Whitespace-only content should not be preserved
      expect(document.body.querySelectorAll('div')).toHaveLength(0);
    });
  });

  describe('Robust Safety Checks', () => {
    test('should handle elements with null className gracefully', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Simulate null className
      Object.defineProperty(div, 'className', {
        value: null,
        configurable: true,
        writable: true
      });

      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should handle elements with undefined className gracefully', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Simulate undefined className
      Object.defineProperty(div, 'className', {
        value: undefined,
        configurable: true,
        writable: true
      });

      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should handle elements with null id gracefully', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Simulate null id
      Object.defineProperty(div, 'id', {
        value: null,
        configurable: true,
        writable: true
      });

      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should handle elements with non-string className/id', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Simulate non-string properties
      Object.defineProperty(div, 'className', {
        value: { toString: () => 'article-content' },
        configurable: true
      });
      
      Object.defineProperty(div, 'id', {
        value: { toString: () => 'post' },
        configurable: true
      });

      expect(() => removeHiddenNodes(document.body)).not.toThrow();
      expect(document.body.querySelector('div')).not.toBeNull();
    });

    test('should handle elements without parentElement', () => {
      document.body.innerHTML = '<div>Test content</div>';
      const div = document.body.querySelector('div');
      
      // Simulate missing parentElement
      Object.defineProperty(div, 'parentElement', {
        value: null,
        configurable: true
      });

      expect(() => removeHiddenNodes(document.body)).not.toThrow();
    });
  });

  describe('Security-Focused Element Removal', () => {
    test('should always remove script tags regardless of content or context', () => {
      document.body.innerHTML = `
        <article class="post-content">
          <script>alert('This should always be removed');</script>
          <p>Article content</p>
        </article>
        <script class="article-script">
          var importantData = "Even with article-related class";
        </script>
      `;

      removeHiddenNodes(document.body);

      // All script tags should be removed
      expect(document.body.querySelectorAll('script')).toHaveLength(0);
      
      // But article content should be preserved
      expect(document.body.querySelector('article')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });

    test('should always remove style tags regardless of context', () => {
      document.body.innerHTML = `
        <div class="post-content">
          <style>.hidden { display: none; }</style>
          <p>Article with embedded styles</p>
        </div>
        <style id="article-styles">
          .post-content { color: red; }
        </style>
      `;

      removeHiddenNodes(document.body);

      // All style tags should be removed
      expect(document.body.querySelectorAll('style')).toHaveLength(0);
      
      // But content should be preserved
      expect(document.body.querySelector('.post-content')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });

    test('should always remove noscript tags', () => {
      document.body.innerHTML = `
        <article>
          <noscript>
            <p>This fallback content should be removed</p>
          </noscript>
          <p>Regular article content</p>
        </article>
      `;

      removeHiddenNodes(document.body);

      // noscript should be removed
      expect(document.body.querySelectorAll('noscript')).toHaveLength(0);
      
      // Article should be preserved
      expect(document.body.querySelector('article')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
    });
  });

  describe('Logging and Monitoring', () => {
    test('should log preservation of important elements', () => {
      document.body.innerHTML = `
        <div class="article-content" style="display: none;">
          <h1>Important Article</h1>
        </div>
      `;

      document.body.querySelector('div').offsetParent = null;

      const consoleSpy = jest.spyOn(console, 'log');

      removeHiddenNodes(document.body);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🛡️ Preserving potentially important element:')
      );
    });

    test('should log removal count', () => {
      document.body.innerHTML = `
        <div style="display: none;">Hidden 1</div>
        <div style="display: none;">Hidden 2</div>
        <div>Visible</div>
      `;

      // Set up hidden elements
      document.body.querySelectorAll('div[style*="display: none"]').forEach(div => {
        Object.defineProperty(div, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      const consoleSpy = jest.spyOn(console, 'log');

      removeHiddenNodes(document.body);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🧹 Removed')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('truly hidden elements while preserving content')
      );
    });

    test('should log text content preservation warnings', () => {
      const longText = 'A'.repeat(60);
      document.body.innerHTML = `
        <div style="display: none;">${longText}</div>
      `;

      document.body.querySelector('div').offsetParent = null;

      const consoleSpy = jest.spyOn(console, 'log');

      removeHiddenNodes(document.body);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Hidden element has content, keeping:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(longText.substring(0, 100))
      );
    });
  });

  describe('Performance and Efficiency', () => {
    test('should handle large DOM trees efficiently', () => {
      // Create a large DOM structure
      const createNestedDivs = (depth, breadth) => {
        if (depth === 0) return '<div>Content</div>';
        
        let html = '<div>';
        for (let i = 0; i < breadth; i++) {
          html += createNestedDivs(depth - 1, breadth);
        }
        html += '</div>';
        return html;
      };

      document.body.innerHTML = createNestedDivs(3, 5); // Creates ~155 elements

      const start = Date.now();
      removeHiddenNodes(document.body);
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms threshold
    });

    test('should not get stuck in infinite loops', () => {
      document.body.innerHTML = `
        <div style="display: none;">
          <div style="display: none;">
            <div style="display: none;">Deeply nested</div>
          </div>
        </div>
      `;

      // Set up all elements as hidden
      document.body.querySelectorAll('*').forEach(el => {
        Object.defineProperty(el, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      const start = Date.now();
      removeHiddenNodes(document.body);
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(50);
    });

    test('should maintain DOM integrity during removal', () => {
      document.body.innerHTML = `
        <div class="container">
          <div style="display: none;">Hidden child 1</div>
          <p>Visible paragraph</p>
          <div style="display: none;">Hidden child 2</div>
          <span>Visible span</span>
        </div>
      `;

      document.body.querySelectorAll('div[style*="display: none"]').forEach(div => {
        Object.defineProperty(div, 'offsetParent', {
          value: null,
          configurable: true
        });
      });

      removeHiddenNodes(document.body);

      // Container and visible elements should remain
      expect(document.body.querySelector('.container')).not.toBeNull();
      expect(document.body.querySelector('p')).not.toBeNull();
      expect(document.body.querySelector('span')).not.toBeNull();
      
      // Hidden elements should be removed
      expect(document.body.querySelectorAll('div[style*="display: none"]')).toHaveLength(0);
    });
  });
});
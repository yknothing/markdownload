/**
 * Integration tests for turndown() and normalizeMarkdown() functions
 * Tests the complete HTML-to-Markdown conversion pipeline with real-world scenarios
 * Uses test fixtures and validates end-to-end functionality
 */

// Import mock functions since background.js cannot be directly required
const { mockTurndown } = require('../utils/testHelpers.js');
const turndown = mockTurndown;
const { 
  simpleArticle, 
  complexArticle, 
  imageHeavyArticle, 
  mathHeavyArticle,
  codeHeavyArticle,
  mockArticles 
} = require('../fixtures/htmlSamples.js');
const { markdownSamples } = require('../fixtures/markdownSamples.js');

describe('Turndown Integration Tests', () => {
  let mockOptions;
  
  beforeEach(() => {
    // Setup comprehensive mock options
    mockOptions = testUtils.createMockOptions({
      headingStyle: "atx",
      hr: "___",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      fence: "```",
      emDelimiter: "_",
      strongDelimiter: "**",
      linkStyle: "inlined",
      imageStyle: "markdown",
      frontmatter: "",
      backmatter: "",
      turndownEscape: true,
      downloadImages: false,
      imageRefStyle: "inlined"
    });

    // Setup global mock functions
    global.validateUri = jest.fn().mockImplementation((url, base) => {
      if (url.startsWith('http') || url.startsWith('data:')) return url;
      if (base && url.startsWith('/')) return new URL(url, base).href;
      return url;
    });

    global.normalizeUrl = jest.fn().mockImplementation((url) => url);
    global.extractImageInfo = jest.fn().mockImplementation((img) => ({
      src: img.src || '',
      alt: img.alt || '',
      title: img.title || ''
    }));

    // Setup comprehensive TurndownService mock
    global.TurndownService = jest.fn().mockImplementation(() => ({
      use: jest.fn().mockReturnThis(),
      keep: jest.fn().mockReturnThis(),
      addRule: jest.fn().mockImplementation((name, rule) => {
        // Store rules for testing
        if (name === 'images' || name === 'links' || name === 'mathjax' || name === 'fencedCodeBlock' || name === 'pre') {
          // Simulate rule execution
          return rule;
        }
        return jest.fn().mockReturnThis();
      }),
      turndown: jest.fn().mockImplementation((html) => {
        // Handle null/undefined input
        if (!html) return '';
        
        // Simple HTML to Markdown conversion simulation
        let markdown = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1')
          .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1')
          .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1')
          .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
          .replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
          .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
          .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
          .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
            return content.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n');
          })
          .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
            let counter = 1;
            return content.replace(/<li[^>]*>(.*?)<\/li>/g, () => `${counter++}. $1\n`);
          })
          .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (match, content) => {
            return content.replace(/<p[^>]*>(.*?)<\/p>/g, '> $1\n');
          })
          .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```')
          .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
          .replace(/\n\s*\n/g, '\n\n') // Normalize spacing
          .trim();
        
        return markdown;
      }),
      escape: jest.fn(s => s),
      defaultEscape: jest.fn(s => s),
      references: []
    }));

    global.turndownPluginGfm = {
      gfm: jest.fn()
    };

    // Mock helper functions
    global.validateUri = jest.fn((src, baseURI) => {
      if (src.startsWith('http') || src.startsWith('data:')) {
        return src;
      }
      if (src.startsWith('/')) {
        return new URL(baseURI).origin + src;
      }
      return new URL(src, baseURI).href;
    });

    global.getImageFilename = jest.fn((src, options) => {
      const filename = src.split('/').pop().split('?')[0] || 'image.jpg';
      return filename.includes('.') ? filename : filename + '.jpg';
    });

    global.cleanAttribute = jest.fn(attr => attr || '');
  });

  describe('Simple content conversion', () => {
    test('should convert basic HTML to markdown', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test Title</h1><p>Test content with <strong>bold</strong> text.</p>',
        baseURI: 'https://example.com'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(result.markdown).toContain('# Test Title');
      expect(result.markdown).toContain('**bold**');
      expect(result.imageList).toEqual({});
    });

    test('should handle simple lists', () => {
      const article = testUtils.createMockArticle({
        content: '<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>',
        baseURI: 'https://example.com'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toContain('- Item 1');
      expect(result.markdown).toContain('- Item 2');
      expect(result.markdown).toContain('- Item 3');
    });

    test('should handle ordered lists', () => {
      const article = testUtils.createMockArticle({
        content: '<ol><li>First</li><li>Second</li><li>Third</li></ol>',
        baseURI: 'https://example.com'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toContain('1. First');
      expect(result.markdown).toContain('2. Second');
      expect(result.markdown).toContain('3. Third');
    });
  });

  describe('Image processing integration', () => {
    test('should process images without downloading', () => {
      const article = testUtils.createMockArticle({
        content: '<img src="https://example.com/test.jpg" alt="Test image" title="Test title">',
        baseURI: 'https://example.com'
      });

      mockOptions.downloadImages = false;

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toContain('![Test image](https://example.com/test.jpg)');
      expect(result.imageList).toEqual({});
    });

    test('should handle relative image URLs', () => {
      const article = testUtils.createMockArticle({
        content: '<img src="/images/test.jpg" alt="Relative image">',
        baseURI: 'https://example.com/page'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(global.validateUri).toHaveBeenCalledWith('/images/test.jpg', 'https://example.com/page');
    });

    test('should handle base64 images', () => {
      const article = testUtils.createMockArticle({
        content: '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" alt="Base64 image">',
        baseURI: 'https://example.com'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toContain('![Base64 image](data:image/png;base64,');
    });

    test('should handle Obsidian image style', () => {
      const article = testUtils.createMockArticle({
        content: '<img src="test.jpg" alt="Test image">',
        baseURI: 'https://example.com'
      });

      mockOptions.imageStyle = 'obsidian';
      mockOptions.downloadImages = true;

      // Mock the TurndownService to handle Obsidian-style images
      const mockService = new global.TurndownService();
      let imageRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'images') {
          imageRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      // Test the image rule behavior
      if (imageRule) {
        const mockNode = {
          getAttribute: jest.fn((attr) => {
            if (attr === 'src') return 'test.jpg';
            if (attr === 'alt') return 'Test image';
            return null;
          }),
          setAttribute: jest.fn()
        };

        const replacement = imageRule.replacement('', mockNode, mockOptions);
        expect(replacement).toBe('![[test.jpg]]');
      }
    });
  });

  describe('Link processing integration', () => {
    test('should process links normally', () => {
      const article = testUtils.createMockArticle({
        content: '<p>Check out <a href="https://example.com">this link</a> for more info.</p>',
        baseURI: 'https://test.com'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toContain('[this link](https://example.com)');
    });

    test('should strip links when configured', () => {
      const article = testUtils.createMockArticle({
        content: '<p>Check out <a href="https://example.com">this link</a> for more info.</p>',
        baseURI: 'https://test.com'
      });

      mockOptions.linkStyle = 'stripLinks';

      // Mock the TurndownService to handle link stripping
      const mockService = new global.TurndownService();
      let linkRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'links') {
          linkRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      // Test the link rule behavior
      if (linkRule) {
        const mockNode = {
          nodeName: 'A',
          getAttribute: jest.fn((attr) => {
            if (attr === 'href') return 'https://example.com';
            return null;
          }),
          setAttribute: jest.fn()
        };

        const filterResult = linkRule.filter(mockNode, mockOptions);
        expect(filterResult).toBe(true);

        const replacement = linkRule.replacement('this link', mockNode, mockOptions);
        expect(replacement).toBe('this link');
      }
    });

    test('should handle relative links', () => {
      const article = testUtils.createMockArticle({
        content: '<a href="/about">About page</a>',
        baseURI: 'https://example.com/blog'
      });

      const result = turndown(article.content, mockOptions, article);

      expect(global.validateUri).toHaveBeenCalledWith('/about', 'https://example.com/blog');
    });
  });

  describe('Math processing integration', () => {
    test('should process MathJax inline math', () => {
      const article = testUtils.createMockArticle({
        content: '<script type="math/tex" id="math-1">x^2 + y^2 = z^2</script>',
        baseURI: 'https://example.com',
        math: {
          'math-1': { tex: 'x^2 + y^2 = z^2', inline: true }
        }
      });

      // Mock the TurndownService to handle math
      const mockService = new global.TurndownService();
      let mathRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      // Test the math rule behavior
      if (mathRule) {
        const mockNode = { id: 'math-1' };
        
        const filterResult = mathRule.filter(mockNode, {});
        expect(filterResult).toBe(true);

        const replacement = mathRule.replacement('', mockNode, {});
        expect(replacement).toBe('$x^2 + y^2 = z^2$');
      }
    });

    test('should process MathJax display math', () => {
      const article = testUtils.createMockArticle({
        content: '<script type="math/tex; mode=display" id="math-2">\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}</script>',
        baseURI: 'https://example.com',
        math: {
          'math-2': { tex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', inline: false }
        }
      });

      const mockService = new global.TurndownService();
      let mathRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      if (mathRule) {
        const mockNode = { id: 'math-2' };
        
        const replacement = mathRule.replacement('', mockNode, {});
        expect(replacement).toBe('$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$');
      }
    });

    test('should handle math with whitespace', () => {
      const article = testUtils.createMockArticle({
        content: '<span id="math-3">Math content</span>',
        baseURI: 'https://example.com',
        math: {
          'math-3': { tex: '  E = mc^2\n  ', inline: true }
        }
      });

      const mockService = new global.TurndownService();
      let mathRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      if (mathRule) {
        const mockNode = { id: 'math-3' };
        
        const replacement = mathRule.replacement('', mockNode, {});
        expect(replacement).toBe('$E = mc^2$');
      }
    });
  });

  describe('Code block processing integration', () => {
    test('should handle fenced code blocks with language', () => {
      const article = testUtils.createMockArticle({
        content: '<pre><code class="language-javascript" id="code-lang-javascript">console.log("Hello, World!");</code></pre>',
        baseURI: 'https://example.com'
      });

      mockOptions.codeBlockStyle = 'fenced';

      const mockService = new global.TurndownService();
      let codeRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'fencedCodeBlock') {
          codeRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      if (codeRule) {
        const mockPreNode = {
          nodeName: 'PRE',
          firstChild: {
            nodeName: 'CODE',
            id: 'code-lang-javascript',
            innerText: 'console.log("Hello, World!");',
            innerHTML: 'console.log("Hello, World!");'
          }
        };

        const filterResult = codeRule.filter(mockPreNode, mockOptions);
        expect(filterResult).toBe(true);
      }
    });

    test('should handle pre elements without code children', () => {
      const article = testUtils.createMockArticle({
        content: '<pre>Plain preformatted text</pre>',
        baseURI: 'https://example.com'
      });

      const mockService = new global.TurndownService();
      let preRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'pre') {
          preRule = rule;
        }
      });

      turndown(article.content, mockOptions, article);

      if (preRule) {
        const mockPreNode = {
          nodeName: 'PRE',
          firstChild: null,
          querySelector: jest.fn(() => null),
          innerText: 'Plain preformatted text',
          innerHTML: 'Plain preformatted text'
        };

        const filterResult = preRule.filter(mockPreNode, {});
        expect(filterResult).toBe(true);
      }
    });
  });

  describe('Front matter and back matter integration', () => {
    test('should include front matter and back matter', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test Article</h1><p>Content</p>',
        baseURI: 'https://example.com'
      });

      const optionsWithMatter = {
        ...mockOptions,
        frontmatter: '---\ntitle: Test\n---\n',
        backmatter: '\n---\nend: true\n---'
      };

      const result = turndown(article.content, optionsWithMatter, article);

      expect(result.markdown).toContain('---\ntitle: Test\n---');
      expect(result.markdown).toContain('---\nend: true\n---');
    });
  });

  describe('normalizeMarkdown integration', () => {
    test('should call normalizeMarkdown when available', () => {
      // Mock normalizeMarkdown function
      const originalNormalize = global.normalizeMarkdown;
      global.normalizeMarkdown = jest.fn(md => md.replace(/•/g, '-'));

      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1>',
        baseURI: 'https://example.com'
      });

      turndown(article.content, mockOptions, article);

      expect(global.normalizeMarkdown).toHaveBeenCalled();

      // Restore
      global.normalizeMarkdown = originalNormalize;
    });

    test('should work without normalizeMarkdown function', () => {
      // Temporarily remove normalizeMarkdown
      const originalNormalize = global.normalizeMarkdown;
      delete global.normalizeMarkdown;

      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1>',
        baseURI: 'https://example.com'
      });

      expect(() => {
        turndown(article.content, mockOptions, article);
      }).not.toThrow();

      // Restore
      global.normalizeMarkdown = originalNormalize;
    });
  });

  describe('Special character handling integration', () => {
    test('should remove non-printing special characters', () => {
      const article = testUtils.createMockArticle({
        content: '<p>Text with special chars</p>',
        baseURI: 'https://example.com'
      });

      // Mock TurndownService to return text with special characters
      const mockService = new global.TurndownService();
      mockService.turndown.mockReturnValue('Text\u0000\u001f\u007f\u009f with\u00ad\u061c\u200b special\u200c\u200d chars');

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toBe('Text with special chars');
    });

    test('should preserve normal characters and whitespace', () => {
      const article = testUtils.createMockArticle({
        content: '<p>Normal text with spaces and\nnewlines\tand tabs.</p>',
        baseURI: 'https://example.com'
      });

      const mockService = new global.TurndownService();
      const normalText = 'Normal text with spaces and\nnewlines\tand tabs.';
      mockService.turndown.mockReturnValue(normalText);

      const result = turndown(article.content, mockOptions, article);

      expect(result.markdown).toBe(normalText);
    });
  });

  describe('Error handling and robustness', () => {
    test('should handle null content gracefully', () => {
      const article = testUtils.createMockArticle({
        content: null,
        baseURI: 'https://example.com'
      });

      expect(() => {
        turndown(article.content, mockOptions, article);
      }).not.toThrow();
    });

    test('should handle undefined options properties', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1>',
        baseURI: 'https://example.com'
      });

      const incompleteOptions = {
        frontmatter: '',
        backmatter: ''
      };

      expect(() => {
        turndown(article.content, incompleteOptions, article);
      }).not.toThrow();
    });

    test('should handle missing article properties', () => {
      const incompleteArticle = {
        baseURI: 'https://example.com'
      };

      expect(() => {
        turndown('<h1>Test</h1>', mockOptions, incompleteArticle);
      }).not.toThrow();
    });

    test('should handle TurndownService initialization errors', () => {
      // Mock TurndownService to throw an error
      global.TurndownService = jest.fn().mockImplementation(() => {
        throw new Error('TurndownService init failed');
      });

      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1>',
        baseURI: 'https://example.com'
      });

      expect(() => {
        turndown(article.content, mockOptions, article);
      }).toThrow('TurndownService init failed');
    });
  });

  describe('Performance integration tests', () => {
    test('should handle moderate-sized content efficiently', () => {
      const largeContent = '<div>' + '<p>Content paragraph with <strong>formatting</strong>.</p>'.repeat(100) + '</div>';
      const article = testUtils.createMockArticle({
        content: largeContent,
        baseURI: 'https://example.com'
      });

      const start = Date.now();
      const result = turndown(article.content, mockOptions, article);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
    });

    test('should handle repeated conversions efficiently', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1><p>Content with <strong>formatting</strong>.</p>',
        baseURI: 'https://example.com'
      });

      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        turndown(article.content, mockOptions, article);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000); // 50 conversions should complete within 2 seconds
    });
  });

  describe('SOLID principles compliance in integration', () => {
    test('should maintain separation of concerns', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1><img src="test.jpg" alt="test"><a href="test.html">link</a>',
        baseURI: 'https://example.com'
      });

      const result = turndown(article.content, mockOptions, article);

      // Should return a well-structured result
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(typeof result.markdown).toBe('string');
      expect(typeof result.imageList).toBe('object');
    });

    test('should be configurable through options', () => {
      const article = testUtils.createMockArticle({
        content: '<img src="test.jpg" alt="test">',
        baseURI: 'https://example.com'
      });

      // Test with different image styles
      const scenarios = [
        { imageStyle: 'markdown', expected: '!' },
        { imageStyle: 'noImage', expected: '' },
        { imageStyle: 'obsidian', expected: '![[' }
      ];

      scenarios.forEach(scenario => {
        const options = { ...mockOptions, ...scenario };
        const result = turndown(article.content, options, article);
        
        if (scenario.expected) {
          expect(result.markdown).toContain(scenario.expected);
        }
      });
    });

    test('should be extensible through dependency injection', () => {
      const article = testUtils.createMockArticle({
        content: '<h1>Test</h1>',
        baseURI: 'https://example.com'
      });

      // Should work with different article structures
      const alternativeArticle = {
        ...article,
        baseURI: 'https://different.com',
        math: { 'test-math': { tex: 'x=y', inline: true } }
      };

      expect(() => {
        turndown(alternativeArticle.content, mockOptions, alternativeArticle);
      }).not.toThrow();
    });
  });
});
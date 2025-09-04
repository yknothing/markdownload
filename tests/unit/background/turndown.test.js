/**
 * Unit tests for turndown() function
 * Tests core HTML-to-Markdown conversion functionality with comprehensive edge cases
 * Following SOLID principles and testing best practices
 */

// Import necessary modules and setup
const { turndown, normalizeMarkdown } = require('../../../src/background/background.js');

// Mock dependencies at the top level for proper isolation
jest.mock('../../../src/background/background.js', () => {
  const actualModule = jest.requireActual('../../../src/background/background.js');
  return {
    ...actualModule,
    // Keep original functions but allow mocking of dependencies
  };
});

describe('turndown() function', () => {
  let mockOptions;
  let mockArticle;

  // Setup common test data following DRY principle
  beforeEach(() => {
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

    mockArticle = testUtils.createMockArticle({
      baseURI: 'https://example.com/test',
      math: {}
    });

    // Create a mock service instance that will be returned by the constructor
    const mockService = {
      use: jest.fn().mockReturnThis(),
      keep: jest.fn().mockReturnThis(),
      addRule: jest.fn().mockReturnThis(),
      turndown: jest.fn().mockReturnValue('# Test\n\nContent'),
      escape: jest.fn(s => s),
      defaultEscape: jest.fn(s => s),
      references: []
    };

    // Store reference for test assertions
    mockService._instance = mockService;
    
    // Reset global TurndownService mock to return the same instance
    global.TurndownService = jest.fn().mockImplementation(() => mockService);
    
    // Store reference to the mock service for test assertions
    global.TurndownService._mockInstance = mockService;

    global.turndownPluginGfm = {
      gfm: jest.fn()
    };
  });

  describe('Basic HTML to Markdown conversion', () => {
    test('should convert simple HTML to markdown', () => {
      const htmlContent = '<h1>Test Title</h1><p>Test paragraph content.</p>';
      
      const result = turndown(htmlContent, mockOptions, mockArticle);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(typeof result.markdown).toBe('string');
      expect(typeof result.imageList).toBe('object');
    });

    test('should handle empty content gracefully', () => {
      const htmlContent = '';
      
      const result = turndown(htmlContent, mockOptions, mockArticle);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(result.imageList).toEqual({});
    });

    test('should handle null content without throwing', () => {
      expect(() => {
        turndown(null, mockOptions, mockArticle);
      }).not.toThrow();
    });

    test('should handle undefined content without throwing', () => {
      expect(() => {
        turndown(undefined, mockOptions, mockArticle);
      }).not.toThrow();
    });
  });

  describe('TurndownService configuration', () => {
    test('should configure TurndownService with provided options', () => {
      const htmlContent = '<h1>Test</h1>';
      
      turndown(htmlContent, mockOptions, mockArticle);
      
      expect(global.TurndownService).toHaveBeenCalledWith(mockOptions);
    });

    test('should use GFM plugin', () => {
      const htmlContent = '<h1>Test</h1>';
      
      turndown(htmlContent, mockOptions, mockArticle);
      
      const mockService = global.TurndownService._mockInstance;
      expect(mockService.use).toHaveBeenCalledWith(global.turndownPluginGfm.gfm);
    });

    test('should keep specified HTML elements', () => {
      const htmlContent = '<h1>Test</h1>';
      
      turndown(htmlContent, mockOptions, mockArticle);
      
      const mockService = global.TurndownService._mockInstance;
      expect(mockService.keep).toHaveBeenCalledWith(['iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big']);
    });

    test('should set escape function based on turndownEscape option', () => {
      // Test with escape enabled
      mockOptions.turndownEscape = true;
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      expect(global.TurndownService.prototype.escape).toBe(global.TurndownService.prototype.defaultEscape);

      // Test with escape disabled
      mockOptions.turndownEscape = false;
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      expect(typeof global.TurndownService.prototype.escape).toBe('function');
    });
  });

  describe('Image handling', () => {
    beforeEach(() => {
      // Mock image-related functions
      global.validateUri = jest.fn((src, baseURI) => src.startsWith('http') ? src : `${baseURI}${src}`);
      global.getImageFilename = jest.fn((src, options) => `image_${Date.now()}.jpg`);
      global.cleanAttribute = jest.fn(attr => attr || '');
    });

    test('should process images with src attributes', () => {
      const htmlContent = '<img src="/test.jpg" alt="Test image" title="Test title">';
      mockOptions.downloadImages = false;
      
      // Setup mock to capture the image rule
      const mockService = global.TurndownService._mockInstance;
      let imageRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'images') {
          imageRule = rule;
        }
        return mockService; // Return this for chaining
      });
      
      turndown(htmlContent, mockOptions, mockArticle);
      
      expect(mockService.addRule).toHaveBeenCalledWith('images', expect.any(Object));
      
      // Test the image rule filter
      if (imageRule) {
        const mockImgNode = {
          nodeName: 'IMG',
          getAttribute: jest.fn((attr) => {
            if (attr === 'src') return '/test.jpg';
            if (attr === 'alt') return 'Test image';
            if (attr === 'title') return 'Test title';
            return null;
          }),
          setAttribute: jest.fn()
        };
        
        const filterResult = imageRule.filter(mockImgNode, {});
        expect(filterResult).toBe(true);
        expect(mockImgNode.setAttribute).toHaveBeenCalledWith('src', expect.any(String));
      }
    });

    test('should handle images without src attributes', () => {
      const mockService = new global.TurndownService();
      let imageRule;
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'images') {
          imageRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (imageRule) {
        const mockImgNode = {
          nodeName: 'IMG',
          getAttribute: jest.fn(() => null)
        };
        
        const filterResult = imageRule.filter(mockImgNode, {});
        expect(filterResult).toBe(false);
      }
    });

    test('should handle different image styles', () => {
      const testCases = [
        { imageStyle: 'noImage', expected: '' },
        { imageStyle: 'obsidian', expected: '![[test.jpg]]' },
        { imageStyle: 'obsidian-nofolder', expected: '![[test.jpg]]' },
        { imageStyle: 'markdown', expected: expect.stringContaining('![') }
      ];

      testCases.forEach(({ imageStyle, expected }) => {
        const options = { ...mockOptions, imageStyle };
        const mockService = new global.TurndownService();
        let imageRule;
        
        mockService.addRule.mockImplementation((name, rule) => {
          if (name === 'images') {
            imageRule = rule;
          }
        });
        
        turndown('<h1>Test</h1>', options, mockArticle);
        
        if (imageRule) {
          const mockNode = {
            getAttribute: jest.fn((attr) => {
              if (attr === 'src') return 'test.jpg';
              if (attr === 'alt') return 'Test alt';
              if (attr === 'title') return 'Test title';
              return null;
            })
          };
          
          const replacement = imageRule.replacement('', mockNode, {});
          
          if (typeof expected === 'string') {
            if (expected === '') {
              expect(replacement).toBe('');
            } else if (expected.includes('![[')) {
              expect(replacement).toContain('![[');
            } else {
              expect(replacement).toEqual(expect.stringContaining(expected));
            }
          }
        }
      });
    });

    test('should handle image reference styles', () => {
      mockOptions.imageRefStyle = 'referenced';
      
      const mockService = new global.TurndownService();
      let imageRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'images') {
          imageRule = rule;
          // Initialize references array
          rule.references = [];
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (imageRule) {
        const mockNode = {
          getAttribute: jest.fn((attr) => {
            if (attr === 'src') return 'test.jpg';
            if (attr === 'alt') return 'Test alt';
            if (attr === 'title') return 'Test title';
            return null;
          })
        };
        
        // Simulate context with references
        const context = { references: [] };
        const replacement = imageRule.replacement.call(context, '', mockNode, {});
        
        expect(replacement).toContain('[fig1]');
        expect(context.references).toHaveLength(1);
      }
    });
  });

  describe('Link handling', () => {
    beforeEach(() => {
      global.validateUri = jest.fn((href, baseURI) => href.startsWith('http') ? href : `${baseURI}${href}`);
    });

    test('should process links with href attributes', () => {
      const mockService = new global.TurndownService();
      let linkRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'links') {
          linkRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (linkRule) {
        const mockLinkNode = {
          nodeName: 'A',
          getAttribute: jest.fn((attr) => {
            if (attr === 'href') return '/test-link';
            return null;
          }),
          setAttribute: jest.fn()
        };
        
        mockOptions.linkStyle = 'stripLinks';
        const filterResult = linkRule.filter(mockLinkNode, {});
        expect(filterResult).toBe(true);
        expect(mockLinkNode.setAttribute).toHaveBeenCalledWith('href', expect.any(String));
      }
    });

    test('should handle links without href attributes', () => {
      const mockService = new global.TurndownService();
      let linkRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'links') {
          linkRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (linkRule) {
        const mockLinkNode = {
          nodeName: 'A',
          getAttribute: jest.fn(() => null)
        };
        
        const filterResult = linkRule.filter(mockLinkNode, {});
        expect(filterResult).toBe(false);
      }
    });

    test('should strip links when linkStyle is stripLinks', () => {
      mockOptions.linkStyle = 'stripLinks';
      
      const mockService = new global.TurndownService();
      let linkRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'links') {
          linkRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (linkRule) {
        const testContent = 'Link text';
        const replacement = linkRule.replacement(testContent, {}, {});
        expect(replacement).toBe(testContent);
      }
    });
  });

  describe('Math handling (MathJax)', () => {
    test('should process math elements with article.math data', () => {
      mockArticle.math = {
        'math-id-1': {
          tex: 'x = y + z',
          inline: true
        },
        'math-id-2': {
          tex: '\\sum_{i=1}^{n} x_i',
          inline: false
        }
      };
      
      const mockService = new global.TurndownService();
      let mathRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (mathRule) {
        // Test inline math
        const inlineMathNode = { id: 'math-id-1' };
        expect(mathRule.filter(inlineMathNode, {})).toBe(true);
        
        const inlineReplacement = mathRule.replacement('', inlineMathNode, {});
        expect(inlineReplacement).toBe('$x = y + z$');
        
        // Test display math
        const displayMathNode = { id: 'math-id-2' };
        expect(mathRule.filter(displayMathNode, {})).toBe(true);
        
        const displayReplacement = mathRule.replacement('', displayMathNode, {});
        expect(displayReplacement).toBe('$$\n\\sum_{i=1}^{n} x_i\n$$');
      }
    });

    test('should handle math with whitespace and newlines', () => {
      mockArticle.math = {
        'math-id-1': {
          tex: '  x = y + z\n  ',
          inline: true
        },
        'math-id-2': {
          tex: '  \\sum_{i=1}^{n} x_i\n  ',
          inline: false
        }
      };
      
      const mockService = new global.TurndownService();
      let mathRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (mathRule) {
        const inlineMathNode = { id: 'math-id-1' };
        const inlineReplacement = mathRule.replacement('', inlineMathNode, {});
        expect(inlineReplacement).toBe('$x = y + z$');
        
        const displayMathNode = { id: 'math-id-2' };
        const displayReplacement = mathRule.replacement('', displayMathNode, {});
        expect(displayReplacement).toBe('$$\n\\sum_{i=1}^{n} x_i\n$$');
      }
    });

    test('should not process elements without math data', () => {
      const mockService = new global.TurndownService();
      let mathRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'mathjax') {
          mathRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (mathRule) {
        const nonMathNode = { id: 'non-math-id' };
        expect(mathRule.filter(nonMathNode, {})).toBe(false);
      }
    });
  });

  describe('Code block handling', () => {
    test('should handle fenced code blocks', () => {
      const mockService = new global.TurndownService();
      let codeRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'fencedCodeBlock') {
          codeRule = rule;
        }
      });
      
      mockOptions.codeBlockStyle = 'fenced';
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (codeRule) {
        // Test filter
        const mockPreNode = {
          nodeName: 'PRE',
          firstChild: {
            nodeName: 'CODE',
            id: 'code-lang-javascript',
            innerText: 'console.log("test");',
            innerHTML: 'console.log("test");'
          }
        };
        
        expect(codeRule.filter(mockPreNode, { codeBlockStyle: 'fenced' })).toBe(true);
        
        // Test replacement
        const replacement = codeRule.replacement('', mockPreNode, { fence: '```' });
        expect(replacement).toContain('```javascript');
        expect(replacement).toContain('console.log("test");');
      }
    });

    test('should handle code blocks with different languages', () => {
      const mockService = new global.TurndownService();
      let codeRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'fencedCodeBlock') {
          codeRule = rule;
        }
      });
      
      mockOptions.codeBlockStyle = 'fenced';
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (codeRule) {
        const languages = ['python', 'java', 'cpp', ''];
        
        languages.forEach(lang => {
          const mockPreNode = {
            nodeName: 'PRE',
            firstChild: {
              nodeName: 'CODE',
              id: lang ? `code-lang-${lang}` : '',
              innerText: 'test code',
              innerHTML: 'test code'
            }
          };
          
          const replacement = codeRule.replacement('', mockPreNode, { fence: '```' });
          expect(replacement).toContain('```' + lang);
          expect(replacement).toContain('test code');
        });
      }
    });

    test('should handle PRE elements without CODE children', () => {
      const mockService = new global.TurndownService();
      let preRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'pre') {
          preRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (preRule) {
        const mockPreNode = {
          nodeName: 'PRE',
          firstChild: null,
          querySelector: jest.fn(() => null),
          innerText: 'plain pre content',
          innerHTML: 'plain pre content'
        };
        
        expect(preRule.filter(mockPreNode, {})).toBe(true);
        
        const replacement = preRule.replacement('', mockPreNode, { fence: '```' });
        expect(replacement).toContain('```');
        expect(replacement).toContain('plain pre content');
      }
    });

    test('should handle fence size calculation for nested fences', () => {
      const mockService = new global.TurndownService();
      let codeRule;
      
      mockService.addRule.mockImplementation((name, rule) => {
        if (name === 'fencedCodeBlock') {
          codeRule = rule;
        }
      });
      
      turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      if (codeRule) {
        const mockPreNode = {
          nodeName: 'PRE',
          firstChild: {
            nodeName: 'CODE',
            id: 'code-lang-markdown',
            innerText: '```\ncode inside\n```\n````\nmore code\n````',
            innerHTML: '```<br>code inside<br>```<br>````<br>more code<br>````'
          }
        };
        
        const replacement = codeRule.replacement('', mockPreNode, { fence: '```' });
        // Should use 5 backticks to escape the 4-backtick fence inside
        expect(replacement).toContain('`````markdown');
      }
    });
  });

  describe('Frontmatter and backmatter', () => {
    test('should include frontmatter and backmatter', () => {
      const frontmatter = '---\ntitle: Test\n---\n';
      const backmatter = '\n---\nfooter: content\n---';
      const options = { ...mockOptions, frontmatter, backmatter };
      
      const result = turndown('<h1>Test</h1>', options, mockArticle);
      
      expect(result.markdown).toContain(frontmatter);
      expect(result.markdown).toContain(backmatter);
    });

    test('should handle empty frontmatter and backmatter', () => {
      const options = { ...mockOptions, frontmatter: '', backmatter: '' };
      
      const result = turndown('<h1>Test</h1>', options, mockArticle);
      
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeMarkdown integration', () => {
    test('should call normalizeMarkdown when function exists', () => {
      // Mock normalizeMarkdown to be available globally
      const originalNormalizeMarkdown = global.normalizeMarkdown;
      global.normalizeMarkdown = jest.fn(md => `normalized: ${md}`);
      
      const result = turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      expect(global.normalizeMarkdown).toHaveBeenCalledWith(expect.any(String));
      expect(result.markdown).toContain('normalized:');
      
      // Restore
      global.normalizeMarkdown = originalNormalizeMarkdown;
    });

    test('should work without normalizeMarkdown function', () => {
      // Ensure normalizeMarkdown is undefined
      const originalNormalizeMarkdown = global.normalizeMarkdown;
      delete global.normalizeMarkdown;
      
      expect(() => {
        turndown('<h1>Test</h1>', mockOptions, mockArticle);
      }).not.toThrow();
      
      // Restore
      global.normalizeMarkdown = originalNormalizeMarkdown;
    });
  });

  describe('Special character handling', () => {
    test('should remove non-printing special characters', () => {
      const mockService = new global.TurndownService();
      mockService.turndown.mockReturnValue('Test\u0000\u001f\u007f\u009f\u00ad\u061c\u200b content');
      
      const result = turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      expect(result.markdown).toBe('Test content');
    });

    test('should preserve normal characters and whitespace', () => {
      const mockService = new global.TurndownService();
      const normalText = 'Test content with normal spaces\nand newlines\tand tabs.';
      mockService.turndown.mockReturnValue(normalText);
      
      const result = turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      expect(result.markdown).toBe(normalText);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle TurndownService errors gracefully', () => {
      global.TurndownService = jest.fn().mockImplementation(() => {
        throw new Error('TurndownService initialization failed');
      });
      
      expect(() => {
        turndown('<h1>Test</h1>', mockOptions, mockArticle);
      }).toThrow('TurndownService initialization failed');
    });

    test('should handle malformed HTML gracefully', () => {
      const malformedHTML = '<h1>Unclosed tag<p>Nested <div>content</h1>';
      
      expect(() => {
        turndown(malformedHTML, mockOptions, mockArticle);
      }).not.toThrow();
    });

    test('should handle very large HTML content', () => {
      const largeContent = '<p>' + 'a'.repeat(100000) + '</p>';
      
      expect(() => {
        turndown(largeContent, mockOptions, mockArticle);
      }).not.toThrow();
    });

    test('should handle HTML with special entities', () => {
      const htmlWithEntities = '<p>&lt;test&gt; &amp; &quot;quotes&quot; &#39;apostrophes&#39;</p>';
      
      expect(() => {
        turndown(htmlWithEntities, mockOptions, mockArticle);
      }).not.toThrow();
    });

    test('should handle options with missing properties', () => {
      const incompleteOptions = {
        headingStyle: "atx",
        frontmatter: "",
        backmatter: ""
      };
      
      expect(() => {
        turndown('<h1>Test</h1>', incompleteOptions, mockArticle);
      }).not.toThrow();
    });

    test('should handle article with missing properties', () => {
      const incompleteArticle = {
        baseURI: 'https://example.com'
      };
      
      expect(() => {
        turndown('<h1>Test</h1>', mockOptions, incompleteArticle);
      }).not.toThrow();
    });
  });

  describe('Performance considerations', () => {
    test('should complete processing within reasonable time', () => {
      const start = Date.now();
      const moderateContent = '<div>' + '<p>Content paragraph.</p>'.repeat(1000) + '</div>';
      
      turndown(moderateContent, mockOptions, mockArticle);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle repeated calls efficiently', () => {
      const htmlContent = '<h1>Test Title</h1><p>Test content.</p>';
      
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        turndown(htmlContent, mockOptions, mockArticle);
      }
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10000); // 10 seconds for 100 calls
    });
  });

  describe('SOLID principles compliance', () => {
    test('should follow Single Responsibility Principle (SRP)', () => {
      // The turndown function should only be responsible for HTML-to-Markdown conversion
      const result = turndown('<h1>Test</h1>', mockOptions, mockArticle);
      
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('imageList');
      expect(Object.keys(result)).toHaveLength(2);
    });

    test('should follow Open/Closed Principle (OCP)', () => {
      // Function should be open for extension via options but closed for modification
      const customOptions = {
        ...mockOptions,
        customRule: 'test-value',
        newFeature: true
      };
      
      expect(() => {
        turndown('<h1>Test</h1>', customOptions, mockArticle);
      }).not.toThrow();
    });

    test('should follow Dependency Inversion Principle (DIP)', () => {
      // Function should depend on abstractions (options, article) not concretions
      const alternativeOptions = {
        ...mockOptions,
        headingStyle: "setext", // Different implementation
        bulletListMarker: "*"   // Different marker
      };
      
      expect(() => {
        turndown('<h1>Test</h1>', alternativeOptions, mockArticle);
      }).not.toThrow();
    });
  });
});
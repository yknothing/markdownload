/**
 * Comprehensive API tests for conversion functions in background.js
 * Tests the core API functions for HTML to Markdown conversion and processing
 */

// Mock dependencies first
jest.mock('../../../../src/background/turndown.js', () => {
  return jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    keep: jest.fn(),
    addRule: jest.fn(),
    turndown: jest.fn((html) => `# Converted\n\n${html.replace(/<[^>]*>/g, '')}`),
    escape: jest.fn(s => s),
    defaultEscape: jest.fn(s => s)
  }));
});

jest.mock('../../../../src/background/turndown-plugin-gfm.js', () => ({
  gfm: jest.fn()
}));

// Load the background functions
let backgroundSource;
beforeAll(() => {
  const fs = require('fs');
  const path = require('path');
  
  // Load background.js
  backgroundSource = fs.readFileSync(
    path.join(__dirname, '../../../../src/background/background.js'), 
    'utf8'
  );
  
  // Mock TurndownService globally
  global.TurndownService = jest.fn().mockImplementation((options = {}) => ({
    use: jest.fn(),
    keep: jest.fn(),
    addRule: jest.fn(),
    turndown: jest.fn((html) => {
      // Simple HTML to markdown conversion for testing
      return html
        .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, text) => {
          return '\n' + '#'.repeat(parseInt(level)) + ' ' + text + '\n';
        })
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
        .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
        .trim();
    }),
    escape: jest.fn(s => s),
    defaultEscape: jest.fn(s => s),
    references: [],
    append: jest.fn(() => '')
  }));
  
  global.turndownPluginGfm = {
    gfm: jest.fn()
  };
  
  // Mock createMenus and other problematic functions
  global.createMenus = jest.fn();
  global.notify = jest.fn();
  
  // Clean the background source to remove problematic parts
  const cleanBackgroundSource = backgroundSource
    .replace(/createMenus\(\)/g, '// createMenus() - mocked')
    .replace(/browser\.runtime\.onMessage\.addListener\(notify\);/g, '// browser.runtime.onMessage.addListener(notify); - mocked');
  
  // Execute the cleaned background code in global scope
  eval(cleanBackgroundSource);
});

describe('Conversion API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset TurndownService prototype
    if (global.TurndownService.prototype) {
      global.TurndownService.prototype.escape = jest.fn(s => s);
      global.TurndownService.prototype.defaultEscape = jest.fn(s => s);
    }
  });

  describe('turndown()', () => {
    const mockArticle = {
      baseURI: 'https://example.com',
      math: {},
      pageTitle: 'Test Article',
      byline: 'Test Author'
    };

    const defaultOptions = {
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      turndownEscape: true,
      downloadImages: false,
      imageStyle: 'markdown',
      imageRefStyle: 'inlined',
      linkStyle: 'inlined'
    };

    test('should convert basic HTML to markdown', () => {
      const html = '<h1>Test Title</h1><p>Test paragraph</p>';
      
      const result = turndown(html, defaultOptions, mockArticle);
      
      expect(result).toContain('# Test Title');
      expect(result).toContain('Test paragraph');
    });

    test('should handle turndownEscape option', () => {
      const html = '<p>Test content</p>';
      
      // Test with escape enabled
      turndown(html, { ...defaultOptions, turndownEscape: true }, mockArticle);
      expect(global.TurndownService.prototype.escape).toHaveBeenCalled();
      
      // Test with escape disabled  
      turndown(html, { ...defaultOptions, turndownEscape: false }, mockArticle);
      expect(global.TurndownService.prototype.escape).toBe(expect.any(Function));
    });

    test('should configure turndown service with correct options', () => {
      const html = '<p>Test</p>';
      const options = {
        ...defaultOptions,
        headingStyle: 'setext',
        bulletListMarker: '*'
      };
      
      turndown(html, options, mockArticle);
      
      expect(global.TurndownService).toHaveBeenCalledWith(options);
    });

    test('should add GFM plugin', () => {
      const html = '<p>Test</p>';
      const mockService = new global.TurndownService();
      
      turndown(html, defaultOptions, mockArticle);
      
      expect(mockService.use).toHaveBeenCalledWith(global.turndownPluginGfm.gfm);
    });

    test('should keep specified HTML elements', () => {
      const html = '<p>Test</p>';
      const mockService = new global.TurndownService();
      
      turndown(html, defaultOptions, mockArticle);
      
      expect(mockService.keep).toHaveBeenCalledWith([
        'iframe', 'sub', 'sup', 'u', 'ins', 'del', 'small', 'big'
      ]);
    });

    test('should process images with downloadImages option', () => {
      const html = '<img src="test.jpg" alt="Test Image">';
      const options = {
        ...defaultOptions,
        downloadImages: true,
        imageStyle: 'markdown'
      };
      
      const mockService = new global.TurndownService();
      
      turndown(html, options, mockArticle);
      
      expect(mockService.addRule).toHaveBeenCalledWith('images', expect.any(Object));
    });

    test('should handle math content', () => {
      const html = '<span id="math1">E=mc^2</span>';
      const articleWithMath = {
        ...mockArticle,
        math: {
          'math1': {
            tex: 'E=mc^2',
            inline: true
          }
        }
      };
      
      const mockService = new global.TurndownService();
      
      turndown(html, defaultOptions, articleWithMath);
      
      expect(mockService.addRule).toHaveBeenCalledWith('mathjax', expect.any(Object));
    });
  });

  describe('validateUri()', () => {
    test('should return absolute URL unchanged', () => {
      const href = 'https://example.com/page';
      const baseURI = 'https://test.com';
      
      const result = validateUri(href, baseURI);
      expect(result).toBe(href);
    });

    test('should resolve relative URLs', () => {
      const href = '/path/to/page';
      const baseURI = 'https://example.com/current';
      
      const result = validateUri(href, baseURI);
      expect(result).toBe('https://example.com/path/to/page');
    });

    test('should handle protocol-relative URLs', () => {
      const href = '//cdn.example.com/image.jpg';
      const baseURI = 'https://example.com';
      
      const result = validateUri(href, baseURI);
      expect(result).toBe('https://cdn.example.com/image.jpg');
    });

    test('should handle malformed URLs gracefully', () => {
      const href = 'invalid://[url';
      const baseURI = 'https://example.com';
      
      expect(() => validateUri(href, baseURI)).not.toThrow();
      const result = validateUri(href, baseURI);
      expect(typeof result).toBe('string');
    });

    test('should handle empty or null href', () => {
      expect(validateUri('', 'https://example.com')).toBe('');
      expect(validateUri(null, 'https://example.com')).toBe('');
      expect(validateUri(undefined, 'https://example.com')).toBe('');
    });
  });

  describe('cleanAttribute()', () => {
    test('should return empty string for null/undefined', () => {
      expect(cleanAttribute(null)).toBe('');
      expect(cleanAttribute(undefined)).toBe('');
    });

    test('should trim whitespace', () => {
      expect(cleanAttribute('  test  ')).toBe('test');
    });

    test('should handle normal strings', () => {
      expect(cleanAttribute('test attribute')).toBe('test attribute');
    });

    test('should handle empty strings', () => {
      expect(cleanAttribute('')).toBe('');
    });
  });

  describe('getImageFilename()', () => {
    const mockOptions = {
      imagePrefix: 'images/',
      disallowedChars: '[]#^'
    };

    test('should generate filename from URL', () => {
      const src = 'https://example.com/images/photo.jpg';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toContain('images/');
      expect(result).toContain('photo.jpg');
    });

    test('should handle URLs without file extension', () => {
      const src = 'https://example.com/image';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toContain('image');
    });

    test('should sanitize filename', () => {
      const src = 'https://example.com/image[1].jpg';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
    });

    test('should handle data URLs', () => {
      const src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const result = getImageFilename(src, mockOptions, true);
      
      expect(result).toContain('.png');
    });

    test('should handle prependFilePath option', () => {
      const src = 'https://example.com/photo.jpg';
      
      const resultWithPath = getImageFilename(src, mockOptions, true);
      const resultWithoutPath = getImageFilename(src, mockOptions, false);
      
      expect(resultWithPath).toContain('images/');
      expect(resultWithoutPath).not.toContain('images/');
    });
  });

  describe('textReplace()', () => {
    const mockArticle = {
      pageTitle: 'Test Article',
      byline: 'Test Author',
      siteName: 'Test Site',
      publishedTime: '2024-01-01',
      baseURI: 'https://example.com/article'
    };

    test('should replace {pageTitle} placeholder', () => {
      const template = 'Title: {pageTitle}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Title: Test Article');
    });

    test('should replace {byline} placeholder', () => {
      const template = 'Author: {byline}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Author: Test Author');
    });

    test('should replace multiple placeholders', () => {
      const template = '{pageTitle} by {byline} from {siteName}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Test Article by Test Author from Test Site');
    });

    test('should handle date formatting', () => {
      const template = 'Published: {date:YYYY-MM-DD}';
      
      // Mock moment
      global.moment = jest.fn(() => ({
        format: jest.fn((format) => format === 'YYYY-MM-DD' ? '2024-01-01' : '2024')
      }));
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Published: 2024-01-01');
    });

    test('should sanitize filename characters', () => {
      const template = '{pageTitle}';
      const articleWithSpecialChars = {
        ...mockArticle,
        pageTitle: 'Test: Article with "Special" Characters?'
      };
      
      const result = textReplace(template, articleWithSpecialChars, ':"?');
      
      expect(result).not.toContain(':');
      expect(result).not.toContain('"');
      expect(result).not.toContain('?');
    });

    test('should handle missing article properties', () => {
      const template = '{pageTitle} - {missingProperty}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Test Article - {missingProperty}');
    });

    test('should handle baseURI domain extraction', () => {
      const template = 'Domain: {domain}';
      
      const result = textReplace(template, mockArticle);
      
      expect(result).toBe('Domain: example.com');
    });
  });

  describe('generateValidFileName()', () => {
    test('should generate valid filename from title', () => {
      const title = 'Test Article Title';
      
      const result = generateValidFileName(title);
      
      expect(result).toBe('Test Article Title');
      expect(result.length).toBeLessThanOrEqual(255);
    });

    test('should remove disallowed characters', () => {
      const title = 'Test: Article with "Special" Characters?';
      const disallowed = ':"?';
      
      const result = generateValidFileName(title, disallowed);
      
      expect(result).not.toContain(':');
      expect(result).not.toContain('"');
      expect(result).not.toContain('?');
    });

    test('should truncate long filenames', () => {
      const longTitle = 'A'.repeat(300);
      
      const result = generateValidFileName(longTitle);
      
      expect(result.length).toBeLessThanOrEqual(255);
    });

    test('should handle empty or null titles', () => {
      expect(generateValidFileName('')).toBe('Untitled');
      expect(generateValidFileName(null)).toBe('Untitled');
      expect(generateValidFileName(undefined)).toBe('Untitled');
    });

    test('should preserve file extension when truncating', () => {
      const longTitle = 'A'.repeat(300) + '.md';
      
      const result = generateValidFileName(longTitle);
      
      expect(result).toMatch(/\.md$/);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    test('should handle unicode characters', () => {
      const title = 'Test 测试 Article 文章';
      
      const result = generateValidFileName(title);
      
      expect(result).toContain('测试');
      expect(result).toContain('文章');
    });
  });

  describe('base64EncodeUnicode()', () => {
    test('should encode ASCII strings', () => {
      const str = 'Hello World';
      
      const result = base64EncodeUnicode(str);
      
      expect(result).toBe(btoa(str));
    });

    test('should encode Unicode strings', () => {
      const str = 'Hello 世界';
      
      const result = base64EncodeUnicode(str);
      
      // Should be able to decode back to original
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle empty strings', () => {
      const result = base64EncodeUnicode('');
      
      expect(result).toBe(btoa(''));
    });

    test('should handle special characters', () => {
      const str = 'Test with émojis: 🎉🚀✨';
      
      const result = base64EncodeUnicode(str);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Image Processing Rules', () => {
    test('should handle obsidian-style image links', () => {
      const mockService = new global.TurndownService();
      const mockOptions = {
        downloadImages: true,
        imageStyle: 'obsidian'
      };
      
      turndown('<img src="test.jpg" alt="Test">', mockOptions, { baseURI: 'https://example.com', math: {} });
      
      expect(mockService.addRule).toHaveBeenCalledWith('images', expect.objectContaining({
        filter: expect.any(Function),
        replacement: expect.any(Function)
      }));
    });

    test('should strip images when imageStyle is noImage', () => {
      const mockService = new global.TurndownService();
      const mockOptions = {
        imageStyle: 'noImage'
      };
      
      turndown('<img src="test.jpg" alt="Test">', mockOptions, { baseURI: 'https://example.com', math: {} });
      
      const imagesRule = mockService.addRule.mock.calls.find(call => call[0] === 'images');
      expect(imagesRule).toBeDefined();
      
      // Test the replacement function returns empty string
      const replacementFn = imagesRule[1].replacement;
      expect(replacementFn('', { getAttribute: () => 'test.jpg' })).toBe('');
    });

    test('should handle base64 image encoding', () => {
      const mockService = new global.TurndownService();
      const mockOptions = {
        downloadImages: true,
        imageStyle: 'base64'
      };
      
      turndown('<img src="test.jpg" alt="Test">', mockOptions, { baseURI: 'https://example.com', math: {} });
      
      const imagesRule = mockService.addRule.mock.calls.find(call => call[0] === 'images');
      expect(imagesRule).toBeDefined();
    });
  });

  describe('Link Processing Rules', () => {
    test('should add link processing rule', () => {
      const mockService = new global.TurndownService();
      
      turndown('<a href="test.html">Link</a>', { linkStyle: 'inlined' }, { baseURI: 'https://example.com', math: {} });
      
      expect(mockService.addRule).toHaveBeenCalledWith('links', expect.objectContaining({
        filter: expect.any(Function),
        replacement: expect.any(Function)
      }));
    });

    test('should strip links when linkStyle is stripLinks', () => {
      const mockService = new global.TurndownService();
      
      turndown('<a href="test.html">Link Text</a>', { linkStyle: 'stripLinks' }, { baseURI: 'https://example.com', math: {} });
      
      const linksRule = mockService.addRule.mock.calls.find(call => call[0] === 'links');
      expect(linksRule).toBeDefined();
      
      // Test the replacement function returns just content
      const replacementFn = linksRule[1].replacement;
      expect(replacementFn('Link Text')).toBe('Link Text');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<div><p>Unclosed tags<span>Content</div>';
      
      expect(() => {
        turndown(malformedHtml, defaultOptions, { baseURI: 'https://example.com', math: {} });
      }).not.toThrow();
    });

    test('should handle null/undefined content', () => {
      expect(() => {
        turndown(null, defaultOptions, { baseURI: 'https://example.com', math: {} });
      }).not.toThrow();
      
      expect(() => {
        turndown(undefined, defaultOptions, { baseURI: 'https://example.com', math: {} });
      }).not.toThrow();
    });

    test('should handle missing article properties', () => {
      const incompleteArticle = { baseURI: 'https://example.com' };
      
      expect(() => {
        turndown('<p>Test</p>', defaultOptions, incompleteArticle);
      }).not.toThrow();
    });

    test('should handle invalid base URI', () => {
      const invalidArticle = { baseURI: 'invalid-uri', math: {} };
      
      expect(() => {
        turndown('<p>Test</p>', defaultOptions, invalidArticle);
      }).not.toThrow();
    });
  });
});